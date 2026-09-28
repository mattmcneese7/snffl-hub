-- Movement, Checkpoint 16.
--
-- Nobody publishes a lineup change feed. Sleeper will tell you what a roster
-- looks like right now and nothing at all about what it looked like an hour
-- ago, so the only way to have the history is to keep it. A poller reads the
-- rosters, compares them to what it last saw, and writes down the difference.
--
-- Two tables and they do different jobs. roster_snapshots holds the present,
-- fourteen rows, overwritten every time something changes. movement holds the
-- past and only ever grows, one row per thing that happened.
--
-- Run this in the Supabase SQL editor before the poller's first run.

create table if not exists roster_snapshots (
  roster_id   int primary key,
  week        int not null,
  -- Sleeper's starters array is positional: index 0 is QB, 1 is RB, and an
  -- empty slot is the string "0". Order is kept because a swap between two
  -- flex slots is not a change and comparing sets would say it was.
  starters    text[] not null default '{}',
  players     text[] not null default '{}',
  taken_at    timestamptz not null default now()
);

create table if not exists movement (
  id          bigserial primary key,
  week        int not null,
  roster_id   int not null,
  -- start and bench are lineup decisions, add and drop are roster ones.
  -- Trades already have their own page from Sleeper's transactions endpoint
  -- and are deliberately not duplicated here.
  kind        text not null check (kind in ('start', 'bench', 'add', 'drop')),
  player_id   text not null,
  -- The other half of a swap, when a run produced exactly one start and one
  -- bench for a roster and the pairing is therefore unambiguous. Null when it
  -- is not, because a guessed pairing reads as fact and would be worse than
  -- two separate lines.
  other_id    text,
  at          timestamptz not null default now()
);

-- The feed reads the most recent first, always filtered to a week.
create index if not exists movement_week_at_idx on movement (week, at desc);
-- A manager's own history, for the profile pages in Checkpoint 17.
create index if not exists movement_roster_idx on movement (roster_id, at desc);

alter table roster_snapshots enable row level security;
alter table movement enable row level security;

-- The site reads with the anon key and only the poller writes, with the
-- service role, which bypasses RLS. Same split every other table here uses.
drop policy if exists movement_read on movement;
create policy movement_read on movement for select using (true);

drop policy if exists roster_snapshots_read on roster_snapshots;
create policy roster_snapshots_read on roster_snapshots for select using (true);
