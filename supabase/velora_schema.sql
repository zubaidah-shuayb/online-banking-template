-- =====================================================================
-- velora BANK — Simulation Platform schema (run once in Supabase SQL Editor)
-- Safe to re-run: everything is guarded with IF NOT EXISTS / OR REPLACE.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ --
-- ENUMS
-- ------------------------------------------------------------------ --
do $$ begin
  create type public.app_role as enum ('admin', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_type as enum ('checking', 'savings', 'investment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.txn_type as enum ('deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'adjustment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.txn_status as enum ('pending', 'completed', 'failed', 'reversed');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------ --
-- PROFILES
-- ------------------------------------------------------------------ --
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  country text,
  avatar_url text,
  preferred_skin text not null default 'classic',
  kyc_status text not null default 'verified',
  is_frozen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ------------------------------------------------------------------ --
-- ROLES (separate table — never on profiles)
-- ------------------------------------------------------------------ --
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- ------------------------------------------------------------------ --
-- CURRENCIES
-- ------------------------------------------------------------------ --
create table if not exists public.currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  rate_to_usd numeric(18,6) not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

grant select on public.currencies to anon, authenticated;
grant insert, update, delete on public.currencies to authenticated;
grant all on public.currencies to service_role;
alter table public.currencies enable row level security;

-- ------------------------------------------------------------------ --
-- ACCOUNTS
-- ------------------------------------------------------------------ --
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_number text not null unique,
  iban text,
  label text not null default 'Main Account',
  type public.account_type not null default 'checking',
  currency_code text not null references public.currencies(code) default 'USD',
  balance numeric(18,2) not null default 0,
  is_primary boolean not null default false,
  is_frozen boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_idx on public.accounts(user_id);
grant select on public.accounts to authenticated;
grant insert, update on public.accounts to authenticated;
grant all on public.accounts to service_role;
alter table public.accounts enable row level security;

-- ------------------------------------------------------------------ --
-- TRANSACTIONS
-- ------------------------------------------------------------------ --
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('VLR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  account_id uuid not null references public.accounts(id) on delete cascade,
  counterparty_account_id uuid references public.accounts(id) on delete set null,
  counterparty_name text,
  counterparty_number text,
  type public.txn_type not null,
  status public.txn_status not null default 'completed',
  amount numeric(18,2) not null,
  currency_code text not null default 'USD',
  balance_after numeric(18,2),
  category text not null default 'general',
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_account_idx on public.transactions(account_id, created_at desc);
grant select, insert on public.transactions to authenticated;
grant update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;

-- ------------------------------------------------------------------ --
-- BENEFICIARIES
-- ------------------------------------------------------------------ --
create table if not exists public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_number text not null,
  bank_name text not null default 'velora Bank',
  currency_code text not null default 'USD',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.beneficiaries to authenticated;
grant all on public.beneficiaries to service_role;
alter table public.beneficiaries enable row level security;

-- ------------------------------------------------------------------ --
-- NOTIFICATIONS
-- ------------------------------------------------------------------ --
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, update, delete on public.notifications to authenticated;
grant insert on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

-- ------------------------------------------------------------------ --
-- ANNOUNCEMENTS
-- ------------------------------------------------------------------ --
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  severity text not null default 'info',
  is_published boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;

-- ------------------------------------------------------------------ --
-- BANK SETTINGS / THEMES
-- ------------------------------------------------------------------ --
create table if not exists public.bank_settings (
  id boolean primary key default true check (id),
  bank_name text not null default 'velora Bank',
  tagline text not null default 'Banking, reimagined.',
  support_email text not null default 'support@velorabank.sim',
  default_skin text not null default 'classic',
  maintenance_mode boolean not null default false,
  transfer_fee_percent numeric(6,3) not null default 0,
  updated_at timestamptz not null default now()
);

grant select on public.bank_settings to anon, authenticated;
grant insert, update on public.bank_settings to authenticated;
grant all on public.bank_settings to service_role;
alter table public.bank_settings enable row level security;

create table if not exists public.themes (
  slug text primary key,
  name text not null,
  description text not null default '',
  accent text not null default '#2563eb',
  is_enabled boolean not null default true,
  sort_order int not null default 0
);

grant select on public.themes to anon, authenticated;
grant insert, update, delete on public.themes to authenticated;
grant all on public.themes to service_role;
alter table public.themes enable row level security;

-- ------------------------------------------------------------------ --
-- STATEMENTS & RECEIPTS
-- ------------------------------------------------------------------ --
create table if not exists public.statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  opening_balance numeric(18,2) not null default 0,
  closing_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

grant select, insert, delete on public.statements to authenticated;
grant all on public.statements to service_role;
alter table public.statements enable row level security;

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_number text not null unique default ('RCP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  issued_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

grant select, insert on public.receipts to authenticated;
grant all on public.receipts to service_role;
alter table public.receipts enable row level security;

-- ------------------------------------------------------------------ --
-- ADMIN ACTIVITY LOGS
-- ------------------------------------------------------------------ --
create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.admin_activity_logs to authenticated;
grant all on public.admin_activity_logs to service_role;
alter table public.admin_activity_logs enable row level security;

-- ------------------------------------------------------------------ --
-- POLICIES
-- ------------------------------------------------------------------ --
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles self write" on public.profiles;
create policy "profiles self write" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "roles self read" on public.user_roles;
create policy "roles self read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "currencies read" on public.currencies;
create policy "currencies read" on public.currencies for select to anon, authenticated using (true);
drop policy if exists "currencies admin write" on public.currencies;
create policy "currencies admin write" on public.currencies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "accounts owner read" on public.accounts;
create policy "accounts owner read" on public.accounts for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "accounts owner insert" on public.accounts;
create policy "accounts owner insert" on public.accounts for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "accounts admin update" on public.accounts;
create policy "accounts admin update" on public.accounts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "txn owner read" on public.transactions;
create policy "txn owner read" on public.transactions for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.accounts a where a.id = transactions.account_id and a.user_id = auth.uid())
  );
drop policy if exists "txn admin write" on public.transactions;
create policy "txn admin write" on public.transactions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "beneficiaries owner all" on public.beneficiaries;
create policy "beneficiaries owner all" on public.beneficiaries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications owner read" on public.notifications;
create policy "notifications owner read" on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications owner update" on public.notifications;
create policy "notifications owner update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications admin insert" on public.notifications;
create policy "notifications admin insert" on public.notifications for insert to authenticated
  with check (public.is_admin() or user_id = auth.uid());

drop policy if exists "announcements public read" on public.announcements;
create policy "announcements public read" on public.announcements for select to anon, authenticated
  using (is_published or public.is_admin());
drop policy if exists "announcements admin write" on public.announcements;
create policy "announcements admin write" on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings read" on public.bank_settings;
create policy "settings read" on public.bank_settings for select to anon, authenticated using (true);
drop policy if exists "settings admin write" on public.bank_settings;
create policy "settings admin write" on public.bank_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "themes read" on public.themes;
create policy "themes read" on public.themes for select to anon, authenticated using (true);
drop policy if exists "themes admin write" on public.themes;
create policy "themes admin write" on public.themes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "statements owner" on public.statements;
create policy "statements owner" on public.statements for all to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "receipts owner" on public.receipts;
create policy "receipts owner" on public.receipts for all to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "logs admin read" on public.admin_activity_logs;
create policy "logs admin read" on public.admin_activity_logs for select to authenticated
  using (public.is_admin());
drop policy if exists "logs admin insert" on public.admin_activity_logs;
create policy "logs admin insert" on public.admin_activity_logs for insert to authenticated
  with check (public.is_admin());

-- ------------------------------------------------------------------ --
-- SIGNUP TRIGGER: profile + role + primary account
-- ------------------------------------------------------------------ --
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_number text;
begin
  insert into public.profiles (id, full_name, email, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'country', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  new_number := '4021' || lpad((floor(random() * 1000000000))::bigint::text, 10, '0');

  insert into public.accounts (user_id, account_number, iban, label, type, currency_code, balance, is_primary)
  values (new.id, new_number, 'VL00 VELO ' || substr(new_number, 1, 4) || ' ' || substr(new_number, 5, 4),
          'Everyday Account', 'checking',
          coalesce(new.raw_user_meta_data ->> 'currency', 'USD'), 0, true);

  insert into public.notifications (user_id, title, body, kind)
  values (new.id, 'Welcome to velora Bank', 'Your simulated account is ready. Explore transfers, statements and more.', 'success');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ --
-- TRANSFER FUNCTION (simulated money movement)
-- ------------------------------------------------------------------ --
create or replace function public.make_transfer(
  _from_account uuid,
  _to_account_number text,
  _amount numeric,
  _description text default ''
) returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  src public.accounts;
  dst public.accounts;
  out_txn public.transactions;
begin
  if _amount is null or _amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select * into src from public.accounts where id = _from_account and user_id = auth.uid();
  if src is null then raise exception 'Source account not found'; end if;
  if src.is_frozen then raise exception 'This account is frozen'; end if;
  if src.balance < _amount then raise exception 'Insufficient funds'; end if;

  select * into dst from public.accounts where account_number = _to_account_number;

  update public.accounts set balance = balance - _amount where id = src.id
    returning * into src;

  insert into public.transactions (account_id, counterparty_account_id, counterparty_name, counterparty_number,
                                   type, status, amount, currency_code, balance_after, category, description, created_by)
  values (src.id, dst.id, coalesce((select full_name from public.profiles where id = dst.user_id), 'External beneficiary'),
          _to_account_number, 'transfer', 'completed', -_amount, src.currency_code, src.balance,
          'transfer', coalesce(nullif(_description, ''), 'Outgoing transfer'), auth.uid())
  returning * into out_txn;

  insert into public.receipts (transaction_id, user_id, payload)
  values (out_txn.id, auth.uid(), jsonb_build_object('amount', _amount, 'to', _to_account_number));

  if dst.id is not null then
    update public.accounts set balance = balance + _amount where id = dst.id returning * into dst;
    insert into public.transactions (account_id, counterparty_account_id, counterparty_name, counterparty_number,
                                     type, status, amount, currency_code, balance_after, category, description, created_by)
    values (dst.id, src.id, coalesce((select full_name from public.profiles where id = src.user_id), 'velora customer'),
            src.account_number, 'transfer', 'completed', _amount, dst.currency_code, dst.balance,
            'transfer', coalesce(nullif(_description, ''), 'Incoming transfer'), auth.uid());

    insert into public.notifications (user_id, title, body, kind)
    values (dst.user_id, 'Money received',
            'You received ' || _amount::text || ' ' || dst.currency_code || '.', 'success');
  end if;

  return out_txn;
end $$;

revoke all on function public.make_transfer(uuid, text, numeric, text) from public, anon;
grant execute on function public.make_transfer(uuid, text, numeric, text) to authenticated;

-- Admin balance adjustment
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

  update public.accounts set balance = balance + _amount where id = _account_id returning * into acct;
  if acct is null then raise exception 'Account not found'; end if;

  insert into public.transactions (account_id, type, status, amount, currency_code, balance_after, category, description, created_by)
  values (acct.id, (case when _amount >= 0 then 'deposit' else 'withdrawal' end)::public.txn_type, 'completed', _amount,
          acct.currency_code, acct.balance, 'adjustment', _description, auth.uid())
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

-- Promote a user to admin by email (run manually from the SQL editor)
create or replace function public.grant_admin(_email text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select id into uid from auth.users where email = _email;
  if uid is null then raise exception 'No user with email %', _email; end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin') on conflict do nothing;
end $$;
revoke all on function public.grant_admin(text) from public, anon, authenticated;

-- ------------------------------------------------------------------ --
-- SEED DATA
-- ------------------------------------------------------------------ --
insert into public.currencies (code, name, symbol, rate_to_usd) values
  ('USD','US Dollar','$',1),
  ('EUR','Euro','€',1.09),
  ('GBP','British Pound','£',1.27),
  ('JPY','Japanese Yen','¥',0.0064),
  ('CHF','Swiss Franc','CHF',1.12),
  ('CAD','Canadian Dollar','C$',0.73),
  ('AUD','Australian Dollar','A$',0.66),
  ('SGD','Singapore Dollar','S$',0.74),
  ('AED','UAE Dirham','د.إ',0.27),
  ('INR','Indian Rupee','₹',0.012),
  ('NGN','Nigerian Naira','₦',0.00065),
  ('ZAR','South African Rand','R',0.055),
  ('BRL','Brazilian Real','R$',0.18),
  ('MXN','Mexican Peso','MX$',0.058),
  ('SEK','Swedish Krona','kr',0.095),
  ('NOK','Norwegian Krone','kr',0.092),
  ('DKK','Danish Krone','kr',0.146),
  ('PLN','Polish Zloty','zł',0.25),
  ('TRY','Turkish Lira','₺',0.030),
  ('CNY','Chinese Yuan','¥',0.14),
  ('HKD','Hong Kong Dollar','HK$',0.128),
  ('KRW','South Korean Won','₩',0.00073),
  ('NZD','New Zealand Dollar','NZ$',0.61),
  ('SAR','Saudi Riyal','﷼',0.27),
  ('KES','Kenyan Shilling','KSh',0.0077)
on conflict (code) do nothing;

insert into public.themes (slug, name, description, accent, sort_order) values
  ('classic','Classic Blue','Trusted, institutional, timeless.','#2563eb',1),
  ('emerald','Emerald','Fresh, growth-focused private banking.','#059669',2),
  ('midnight','Midnight','Dark, premium, night-mode luxury.','#0f172a',3),
  ('indigo','Royal Indigo','Regal, bold, high-end wealth.','#4f46e5',4)
on conflict (slug) do update set name = excluded.name, description = excluded.description;

insert into public.bank_settings (id) values (true) on conflict (id) do nothing;

insert into public.announcements (title, body, severity)
select 'Welcome to velora Bank', 'This is a simulation platform. No real money is ever moved.', 'info'
where not exists (select 1 from public.announcements);

-- Backfill for users created before this script ran
insert into public.profiles (id, full_name, email)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name',''), u.email
from auth.users u left join public.profiles p on p.id = u.id where p.id is null;

insert into public.user_roles (user_id, role)
select u.id, 'customer' from auth.users u
left join public.user_roles r on r.user_id = u.id where r.user_id is null
on conflict do nothing;
