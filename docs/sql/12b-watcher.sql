-- Checkpoint 12b, run once in the Supabase SQL editor.
--
-- A filled-in copy with the real secret is written to .cache/12b-watcher.local.sql,
-- which git ignores. Paste that one, not this one: this copy carries a
-- placeholder because the repo is public.

-- 1. Dedupe key on feed posts. The watcher now runs every minute from here and
--    every five from GitHub as a backup, and the key is what stops two
--    overlapping runs posting the same touchdown twice. A unique index allows
--    any number of NULLs, so older rows without a key are untouched.
alter table public.feed_posts add column if not exists dedupe_key text;
create unique index if not exists feed_posts_dedupe_key on public.feed_posts (dedupe_key);

-- 2. Lineup alerts sent, so each one goes out once per player and status.
--    Row level security on with no policies: only the service role, on the
--    server, can read or write it.
create table if not exists public.lineup_alerts (
  key text primary key,
  week integer not null,
  roster_id integer not null,
  player_id text not null,
  status text not null,
  sent_at timestamptz not null default now()
);
alter table public.lineup_alerts enable row level security;

-- 3. The secret the site checks, kept in Supabase Vault rather than in the
--    job text, where anyone reading cron.job would see it.
select vault.create_secret('REPLACE_WITH_WATCH_SECRET', 'snffl_watch_secret');

-- 4. Every minute, Thursday through Tuesday UTC, which covers Thursday night
--    through the end of Monday Night Football Central time. Wednesday is the
--    one day nothing kicks off.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'snffl-watch',
  '* * * * 0,1,2,4,5,6',
  $$
  select net.http_post(
    url := 'https://www.squirtnite.live/api/watch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'snffl_watch_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- To check it is firing:   select * from cron.job_run_details order by start_time desc limit 5;
-- To see what the site answered:  select status_code, content from net._http_response order by created desc limit 5;
-- To stop it:              select cron.unschedule('snffl-watch');
