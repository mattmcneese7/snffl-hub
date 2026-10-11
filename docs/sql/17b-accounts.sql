-- Accounts, optional, on top of the device pick. Run once in the Supabase SQL
-- editor, after Google is switched on under Authentication.
--
-- Nothing here holds a secret, so this file can be pasted as it is, and it can
-- be run more than once without harm.
--
-- Until it runs, the site still works: sign in succeeds, the team stays on the
-- device where it already was, and saving a Swami view says it could not.

-- 1. One row per person who has signed in. The team they linked and the alert
--    settings that should follow them to every device they sign in on. prefs
--    has the same shape as push_subscriptions.prefs: see lib/alert-prefs.ts.
create table if not exists public.accounts (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  roster_id  int check (roster_id between 1 and 14),
  prefs      jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Saved Swami views. The Swami filters through the URL, so a view is just
--    the path it opens. Only /swami paths, and short ones.
create table if not exists public.saved_views (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 60),
  path       text not null check ((path = '/swami' or path like '/swami?%') and char_length(path) <= 200),
  created_at timestamptz not null default now(),
  unique (user_id, path)
);

-- 3. Row level security. The anon key ships in the public bundle, so these
--    policies are the whole of what keeps one person out of another's rows:
--    a signed in user reads and writes only the rows carrying his own id, and
--    a visitor who is not signed in reads and writes nothing at all.
alter table public.accounts enable row level security;
alter table public.saved_views enable row level security;

drop policy if exists "own account read" on public.accounts;
drop policy if exists "own account insert" on public.accounts;
drop policy if exists "own account update" on public.accounts;
drop policy if exists "own account delete" on public.accounts;
create policy "own account read" on public.accounts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own account insert" on public.accounts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own account update" on public.accounts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own account delete" on public.accounts
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "own views read" on public.saved_views;
drop policy if exists "own views insert" on public.saved_views;
drop policy if exists "own views delete" on public.saved_views;
create policy "own views read" on public.saved_views
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own views insert" on public.saved_views
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own views delete" on public.saved_views
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Granted explicitly rather than left to the project's default privileges,
-- so the result does not depend on how the project was set up. The anon role
-- gets nothing.
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, delete on public.saved_views to authenticated;
revoke all on public.accounts from anon;
revoke all on public.saved_views from anon;

-- 4. Which person a device's push subscription belongs to, when anyone. Null
--    for every device that has never signed in, which is how it already
--    works. Written only by /api/push with the service role: the table keeps
--    its existing policies, so the anon key still cannot read it.
alter table public.push_subscriptions
  add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);
