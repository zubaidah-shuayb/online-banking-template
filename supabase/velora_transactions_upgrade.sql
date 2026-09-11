-- ==================================================================== --
-- velora BANK — transaction posting upgrade
-- Run this ONCE in Supabase → SQL Editor (idempotent, safe to re-run)
-- Adds: admin_create_transaction() + customer-safe wording everywhere
-- ==================================================================== --

-- 1. Admin can post a full transaction (any type, date, counterparty) ---
create or replace function public.admin_create_transaction(
  _account_id uuid,
  _type text,
  _amount numeric,
  _description text,
  _counterparty_name text default null,
  _counterparty_number text default null,
  _category text default 'transfer',
  _status text default 'completed',
  _created_at timestamptz default now(),
  _reference text default null
) returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  acct public.accounts;
  out_txn public.transactions;
  signed numeric;
  ref text;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;

  select * into acct from public.accounts where id = _account_id;
  if acct is null then raise exception 'Account not found'; end if;

  -- credits are positive, debits negative — derived from the chosen type
  signed := case
    when _type in ('withdrawal', 'fee') then -abs(_amount)
    when _type = 'transfer' then _amount           -- caller signs transfers
    else abs(_amount)
  end;

  ref := coalesce(nullif(_reference, ''),
                  'VLR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)));

  if _status = 'completed' then
    update public.accounts set balance = balance + signed
    where id = acct.id returning * into acct;
  end if;

  insert into public.transactions (
    reference, account_id, type, status, amount, currency_code, balance_after,
    category, description, counterparty_name, counterparty_number, created_by, created_at
  ) values (
    ref, acct.id, _type::public.txn_type, _status::public.txn_status, signed,
    acct.currency_code, acct.balance, _category, _description,
    nullif(_counterparty_name, ''), nullif(_counterparty_number, ''),
    auth.uid(), coalesce(_created_at, now())
  ) returning * into out_txn;

  insert into public.admin_activity_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'create_transaction', 'account', acct.id::text,
          jsonb_build_object('amount', signed, 'type', _type, 'reference', ref));

  insert into public.notifications (user_id, title, body, kind)
  values (
    acct.user_id,
    case when signed >= 0 then 'Money received' else 'Payment sent' end,
    case when signed >= 0
      then 'A credit of ' || to_char(abs(signed), 'FM999999990.00') || ' ' || acct.currency_code ||
           ' has been posted to your ' || acct.label || ' account.'
      else 'A debit of ' || to_char(abs(signed), 'FM999999990.00') || ' ' || acct.currency_code ||
           ' has been posted from your ' || acct.label || ' account.'
    end,
    'info');

  return out_txn;
end $$;

revoke all on function public.admin_create_transaction(uuid, text, numeric, text, text, text, text, text, timestamptz, text) from public, anon;
grant execute on function public.admin_create_transaction(uuid, text, numeric, text, text, text, text, text, timestamptz, text) to authenticated;

-- 2. Customer-safe wording for balance adjustments ---------------------- --
create or replace function public.admin_adjust_balance(
  _account_id uuid,
  _amount numeric,
  _description text default null
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
          acct.currency_code, acct.balance, case when _amount >= 0 then 'income' else 'payment' end,
          coalesce(nullif(_description, ''), case when _amount >= 0 then 'Funds received' else 'Payment' end),
          auth.uid())
  returning * into out_txn;

  insert into public.admin_activity_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'adjust_balance', 'account', acct.id::text,
          jsonb_build_object('amount', _amount, 'balance_after', acct.balance));

  insert into public.notifications (user_id, title, body, kind)
  values (acct.user_id,
          case when _amount >= 0 then 'Money received' else 'Payment sent' end,
          case when _amount >= 0
            then 'A credit of ' || to_char(abs(_amount), 'FM999999990.00') || ' ' || acct.currency_code || ' has been posted to your account.'
            else 'A debit of ' || to_char(abs(_amount), 'FM999999990.00') || ' ' || acct.currency_code || ' has been posted from your account.'
          end,
          'info');

  return out_txn;
end $$;

revoke all on function public.admin_adjust_balance(uuid, numeric, text) from public, anon;
grant execute on function public.admin_adjust_balance(uuid, numeric, text) to authenticated;

-- 3. Clean up historical internal wording -------------------------------- --
update public.transactions
set description = case when amount >= 0 then 'Funds received' else 'Payment' end,
    category    = case when amount >= 0 then 'income' else 'payment' end
where description ilike '%administrative%' or description ilike '%adjust%' or category = 'adjustment';

update public.notifications
set title = 'Money received',
    body  = 'A credit has been posted to your account.'
where body ilike '%adjusted%';

-- 4. Verification -------------------------------------------------------- --
select
  exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'admin_create_transaction') as create_txn_fn_ok,
  (select count(*) from public.transactions where description ilike '%adjust%') = 0 as wording_clean;
