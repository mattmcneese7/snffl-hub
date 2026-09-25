-- Notification overhaul, run once in the Supabase SQL editor.
--
-- Nothing here holds a secret, so this file can be pasted as it is.
--
-- Until it runs, the site still works: a device without a prefs column gets
-- the default settings, and close finish, final score and Rag alerts claim
-- nothing and so send nothing rather than repeating every minute.

-- 1. What each device wants to hear about. One jsonb column rather than ten
--    boolean ones, so adding an alert type later is a code change and not a
--    migration. The two original booleans stay where they are and are still
--    honoured for rows written before this: see lib/alert-prefs.ts.
alter table public.push_subscriptions add column if not exists prefs jsonb;

-- 2. Alerts that are not feed posts, recorded so they go out once. The watcher
--    runs every minute and the publisher runs hourly until it fires, so
--    without this a close finish would arrive sixty times an hour.
--    Row level security on with no policies: only the service role can touch it.
create table if not exists public.alert_claims (
  key text primary key,
  week integer not null,
  kind text not null,
  sent_at timestamptz not null default now()
);
alter table public.alert_claims enable row level security;

-- Housekeeping, if it is ever wanted: delete from public.alert_claims where week < 1;
