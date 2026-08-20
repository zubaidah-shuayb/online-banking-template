-- ==================================================================== --
-- VELORA BANK — authentication/data repair migration
-- Run after velora_schema.sql. Safe to run more than once.
-- Create a PUBLIC Storage bucket named `avatars` in the dashboard first.
-- ==================================================================== --

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists preferred_currency text not null default 'USD';
alter table public.beneficiaries add column if not exists avatar_url text;

update public.profiles
set first_name = coalesce(nullif(first_name, ''), nullif(split_part(full_name, ' ', 1), '')),
    last_name = coalesce(
      nullif(last_name, ''),
      nullif(trim(substring(full_name from position(' ' in full_name) + 1)), full_name),
      ''
    )
where first_name is null or last_name is null;

-- Repair records for users created before the trigger existed.
insert into public.profiles (id, full_name, first_name, last_name, email, country)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
  nullif(trim(substring(coalesce(u.raw_user_meta_data ->> 'full_name', '') from position(' ' in coalesce(u.raw_user_meta_data ->> 'full_name', '')) + 1)), coalesce(u.raw_user_meta_data ->> 'full_name', '')),
  u.email,
  coalesce(u.raw_user_meta_data ->> 'country', '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.user_roles (user_id, role)
select u.id, 'customer'::public.app_role
from auth.users u
where not exists (select 1 from public.user_roles r where r.user_id = u.id)
on conflict do nothing;

insert into public.accounts (user_id, account_number, iban, label, type, currency_code, balance, is_primary)
select
  u.id,
  '4021' || lpad((floor(random() * 1000000000))::bigint::text, 10, '0'),
  'VL00 VELO ' || upper(substr(replace(u.id::text, '-', ''), 1, 8)),
  'Everyday Account',
  'checking'::public.account_type,
  coalesce(nullif(u.raw_user_meta_data ->> 'currency', ''), 'USD'),
  0,
  true
from auth.users u
where not exists (select 1 from public.accounts a where a.user_id = u.id);

-- Keep profile creation aligned with the fields consumed by the app.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_number text;
  supplied_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
begin
  insert into public.profiles (id, full_name, first_name, last_name, email, country, preferred_currency)
  values (
    new.id,
    supplied_name,
    nullif(split_part(supplied_name, ' ', 1), ''),
    nullif(trim(substring(supplied_name from position(' ' in supplied_name) + 1)), supplied_name),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'currency', ''), 'USD')
  ) on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer') on conflict do nothing;

  new_number := '4021' || lpad((floor(random() * 1000000000))::bigint::text, 10, '0');
  insert into public.accounts (user_id, account_number, iban, label, type, currency_code, balance, is_primary)
  values (new.id, new_number, 'VL00 VELO ' || substr(new_number, 1, 4) || ' ' || substr(new_number, 5, 4),
          'Everyday Account', 'checking', coalesce(new.raw_user_meta_data ->> 'currency', 'USD'), 0, true);

  insert into public.notifications (user_id, title, body, kind)
  values (new.id, 'Welcome to Velora Bank', 'Your simulated account is ready.', 'success');
  return new;
end $$;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Required for customers to receive admin balance changes without reloading.
do $$ begin
  alter publication supabase_realtime add table public.accounts;
exception when duplicate_object then null;
end $$;

-- Repair the live admin adjustment RPC: CASE resolves to text unless the
-- result is explicitly cast to the enum used by transactions.type.
create or replace function public.admin_adjust_balance(
  _account_id uuid,
  _amount numeric,
  _description text default 'Administrative adjustment'
) returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  acct public.accounts;
  out_txn public.transactions;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  if _amount is null or _amount = 0 then raise exception 'Adjustment amount cannot be zero'; end if;

  update public.accounts set balance = balance + _amount where id = _account_id returning * into acct;
  if acct is null then raise exception 'Account not found'; end if;

  insert into public.transactions
    (account_id, type, status, amount, currency_code, balance_after, category, description, created_by)
  values
    (acct.id, (case when _amount > 0 then 'deposit' else 'withdrawal' end)::public.txn_type,
     'completed', _amount, acct.currency_code, acct.balance, 'adjustment', _description, auth.uid())
  returning * into out_txn;

  insert into public.admin_activity_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'adjust_balance', 'account', acct.id::text,
          jsonb_build_object('amount', _amount, 'balance_after', acct.balance));

  insert into public.notifications (user_id, title, body, kind)
  values (acct.user_id, 'Balance updated',
          'Your account balance was adjusted by ' || _amount::text || ' ' || acct.currency_code || '.', 'info');
  return out_txn;
end $$;

revoke all on function public.admin_adjust_balance(uuid, numeric, text) from public, anon;
grant execute on function public.admin_adjust_balance(uuid, numeric, text) to authenticated;