-- ==================================================================== --
-- VELORA BANK — dashboard upgrade migration
-- Run this ONCE in Supabase → SQL Editor (after velora_schema.sql)
-- ==================================================================== --

-- 1. Profile fields used by the new profile page ---------------------- --
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists preferred_currency text not null default 'USD';

-- backfill first/last from full_name
update public.profiles
set first_name = coalesce(nullif(first_name, ''), split_part(full_name, ' ', 1)),
    last_name  = coalesce(nullif(last_name, ''), nullif(substring(full_name from position(' ' in full_name) + 1), full_name))
where first_name is null or last_name is null;

-- 2. Beneficiary avatars ---------------------------------------------- --
alter table public.beneficiaries add column if not exists avatar_url text;

-- 3. Avatar storage bucket -------------------------------------------- --
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
