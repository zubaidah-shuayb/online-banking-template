-- ============================================================
-- ZEEAYB Bank — Make yourself an Administrator
-- Run this in your Supabase project's SQL Editor AFTER running
-- velora_schema.sql (and the other migrations), and AFTER you
-- have registered your account through the app's sign-up page.
-- ============================================================

-- OPTION 1 (easiest): use the built-in helper function.
-- Just replace the email with yours and run:

select public.grant_admin('you@example.com');

-- If you see "No user with email ..." it means the account
-- doesn't exist yet — register it in the app first, then re-run.


-- OPTION 2: do it manually (same thing, more explicit):

-- insert into public.user_roles (user_id, role)
-- select id, 'admin'
-- from auth.users
-- where email = 'you@example.com'
-- on conflict (user_id, role) do nothing;


-- Verify it worked — you should see your email with role 'admin':

-- select u.email, r.role
-- from public.user_roles r
-- join auth.users u on u.id = r.user_id;


-- Afterwards, sign in at /admin/login with that account.
-- If your Supabase project requires email confirmation, confirm
-- the account's email first or sign-in will be rejected.
