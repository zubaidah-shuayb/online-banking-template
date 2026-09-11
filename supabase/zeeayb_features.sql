-- ============================================================================
-- velora BANK — feature completion migration (idempotent, safe to re-run)
-- Run this in Supabase → SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profile preferences (notifications + transfer limits)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists notify_email boolean not null default true;
alter table public.profiles add column if not exists notify_push boolean not null default true;
alter table public.profiles add column if not exists notify_marketing boolean not null default false;
alter table public.profiles add column if not exists daily_transfer_limit numeric(18,2) not null default 25000;

-- ---------------------------------------------------------------------------
-- 2. Cards — one virtual card per account, with freeze / PIN / spend limit
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  last4 text not null default lpad((floor(random() * 10000))::int::text, 4, '0'),
  is_frozen boolean not null default false,
  spend_limit numeric(18,2),
  pin_set boolean not null default false,
  pin_hash text,
  created_at timestamptz not null default now(),
  unique (account_id)
);

grant select, insert, update, delete on public.cards to authenticated;
grant all on public.cards to service_role;
alter table public.cards enable row level security;

drop policy if exists "cards owner all" on public.cards;
create policy "cards owner all" on public.cards for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cards admin read" on public.cards;
create policy "cards admin read" on public.cards for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- backfill a card for every existing account
insert into public.cards (user_id, account_id)
select a.user_id, a.id from public.accounts a
on conflict (account_id) do nothing;

-- create a card whenever an account is created
create or replace function public.tg_create_card_for_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.cards (user_id, account_id) values (new.user_id, new.id)
  on conflict (account_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_create_card_for_account on public.accounts;
create trigger trg_create_card_for_account
after insert on public.accounts
for each row execute function public.tg_create_card_for_account();

-- set a card PIN (stored hashed, never returned)
create or replace function public.set_card_pin(_card_id uuid, _pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if _pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;
  update public.cards
     set pin_hash = encode(digest(_pin || id::text, 'sha256'), 'hex'),
         pin_set = true
   where id = _card_id and user_id = auth.uid();
  if not found then
    raise exception 'Card not found';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Scheduled / recurring transfers
-- ---------------------------------------------------------------------------
create table if not exists public.scheduled_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_account uuid not null references public.accounts(id) on delete cascade,
  to_account_number text not null,
  amount numeric(18,2) not null check (amount > 0),
  description text not null default 'Scheduled transfer',
  frequency text not null default 'monthly' check (frequency in ('once','weekly','monthly')),
  next_run date not null,
  is_active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.scheduled_transfers to authenticated;
grant all on public.scheduled_transfers to service_role;
alter table public.scheduled_transfers enable row level security;

drop policy if exists "scheduled owner all" on public.scheduled_transfers;
create policy "scheduled owner all" on public.scheduled_transfers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- runs every due scheduled transfer for the calling user (called on app open)
create or replace function public.run_due_scheduled_transfers()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; done int := 0;
begin
  for r in
    select * from public.scheduled_transfers
     where user_id = auth.uid() and is_active and next_run <= current_date
  loop
    begin
      perform public.make_transfer(r.from_account, r.to_account_number, r.amount, r.description);
      done := done + 1;
      update public.scheduled_transfers
         set last_run_at = now(),
             next_run = case r.frequency
                          when 'weekly' then current_date + 7
                          when 'monthly' then (current_date + interval '1 month')::date
                          else next_run end,
             is_active = case when r.frequency = 'once' then false else true end
       where id = r.id;
    exception when others then
      update public.scheduled_transfers set is_active = false where id = r.id;
    end;
  end loop;
  return done;
end $$;

grant execute on function public.run_due_scheduled_transfers() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Announcement dismissals (per customer)
-- ---------------------------------------------------------------------------
create table if not exists public.announcement_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, announcement_id)
);

grant select, insert, delete on public.announcement_dismissals to authenticated;
grant all on public.announcement_dismissals to service_role;
alter table public.announcement_dismissals enable row level security;

drop policy if exists "dismissals owner all" on public.announcement_dismissals;
create policy "dismissals owner all" on public.announcement_dismissals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Contact messages from the public site
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  kind text not null default 'contact',
  is_handled boolean not null default false,
  created_at timestamptz not null default now()
);

grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
alter table public.contact_messages enable row level security;

drop policy if exists "contact insert public" on public.contact_messages;
create policy "contact insert public" on public.contact_messages for insert to anon, authenticated
  with check (true);

drop policy if exists "contact admin read" on public.contact_messages;
create policy "contact admin read" on public.contact_messages for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "contact admin update" on public.contact_messages;
create policy "contact admin update" on public.contact_messages for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 6. Bank settings readable by everyone (maintenance mode + default skin)
-- ---------------------------------------------------------------------------
grant select on public.bank_settings to anon, authenticated;
drop policy if exists "bank settings public read" on public.bank_settings;
create policy "bank settings public read" on public.bank_settings for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 7. Admin role management + admin visibility of roles
-- ---------------------------------------------------------------------------
drop policy if exists "user_roles admin read" on public.user_roles;
create policy "user_roles admin read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.admin_set_role(_user_id uuid, _role public.app_role, _grant boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not authorised';
  end if;
  if _grant then
    insert into public.user_roles (user_id, role) values (_user_id, _role)
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = _user_id and role = _role;
  end if;

  insert into public.admin_activity_logs (actor_email, action, target_type, target_id, details)
  values (auth.jwt() ->> 'email',
          case when _grant then 'grant_role' else 'revoke_role' end,
          'profile', _user_id::text, jsonb_build_object('role', _role));
end $$;

grant execute on function public.admin_set_role(uuid, public.app_role, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Log balance adjustments and posted transactions automatically
-- ---------------------------------------------------------------------------
create or replace function public.tg_log_admin_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(auth.uid(), 'admin') then
    insert into public.admin_activity_logs (actor_email, action, target_type, target_id, details)
    values (auth.jwt() ->> 'email', 'post_transaction', 'transaction', new.id::text,
            jsonb_build_object('account_id', new.account_id, 'amount', new.amount,
                               'type', new.type, 'status', new.status));
  end if;
  return new;
end $$;

drop trigger if exists trg_log_admin_transaction on public.transactions;
create trigger trg_log_admin_transaction
after insert on public.transactions
for each row execute function public.tg_log_admin_transaction();

-- ---------------------------------------------------------------------------
-- 9. Verification
-- ---------------------------------------------------------------------------
select
  to_regclass('public.cards') is not null                as cards_ready,
  to_regclass('public.scheduled_transfers') is not null  as scheduled_ready,
  to_regclass('public.contact_messages') is not null     as contact_ready,
  to_regclass('public.announcement_dismissals') is not null as dismissals_ready,
  exists (select 1 from information_schema.columns
           where table_name = 'profiles' and column_name = 'daily_transfer_limit') as limits_ready;
