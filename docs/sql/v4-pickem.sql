-- Pick'em, Splash 4.0.
--
-- Every manager picks the winner of each of the week's league matchups (their
-- own included). Picks lock at Thursday kickoff and stay hidden until then,
-- so nobody copies. There is no sign-in: each team sets a 4-digit PIN with its
-- first pick, and picking as that team needs it after.
--
-- Both tables have row level security on and no policies, so the anon key in
-- the public bundle can neither read nor write them. Only the site's server
-- routes, with the service role key, touch them; they enforce the lock and
-- keep picks hidden until it passes.
--
-- Run this once in the Supabase SQL editor. To reset a forgotten PIN, delete
-- that team's row from pickem_pins; the next pick sets a new one.

create table if not exists pickem_pins (
  roster_id     int primary key,
  -- scrypt of the PIN with a per-team salt. The PIN itself is never stored.
  salt          text not null,
  pin_hash      text not null,
  -- Five wrong tries lock the team for 15 minutes, so 10,000 PINs cannot be
  -- walked through.
  failed        int not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists pickem_picks (
  season        text not null,
  week          int not null,
  roster_id     int not null,
  matchup_id    int not null,
  -- The roster id this team picked to win that matchup.
  pick          int not null,
  updated_at    timestamptz not null default now(),
  primary key (season, week, roster_id, matchup_id)
);

create index if not exists pickem_picks_week on pickem_picks (season, week);

alter table pickem_pins enable row level security;
alter table pickem_picks enable row level security;
