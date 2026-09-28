// The movement poller, Checkpoint 16.
//
// Reads every roster, compares it to what was last seen, and writes down the
// difference. That is the whole trick: Sleeper will tell you what a roster
// looks like now and nothing about what it looked like an hour ago, so the
// history only exists because something kept it.
//
// Runs on the same schedule as the live watcher during game windows. The first
// run of a season writes no events at all, because there is nothing to compare
// against yet, and that is correct rather than a failure.
//
//   node --experimental-strip-types scripts/movement-poll.ts

import { league } from '../lib/league.ts';
import { getRosters } from '../lib/sleeper.ts';
import { writeClient, writerConfigured } from '../lib/supabase.ts';

if (!writerConfigured) {
  console.error('no Supabase service credentials, nothing can be written');
  process.exit(1);
}

const db = writeClient();
if (!db) process.exit(1);

const week = league.state.week;

type Snapshot = { roster_id: number; week: number; starters: string[]; players: string[] };
type Event = {
  week: number;
  roster_id: number;
  kind: 'start' | 'bench' | 'add' | 'drop';
  player_id: string;
  other_id?: string | null;
};

const rosters = await getRosters().catch(() => []);
if (!rosters.length) {
  console.error('no rosters came back, leaving the last snapshot alone');
  process.exit(1);
}

const previous = new Map<number, Snapshot>();
const { data: rows, error: readError } = await db
  .from('roster_snapshots')
  .select('roster_id, week, starters, players');

if (readError) {
  console.error(`could not read snapshots: ${readError.message}`);
  process.exit(1);
}
for (const row of (rows ?? []) as Snapshot[]) previous.set(row.roster_id, row);

/** An empty lineup slot is the string "0", not a player. */
const real = (ids: string[] | null | undefined) => (ids ?? []).filter((id) => id && id !== '0');

const events: Event[] = [];
const snapshots: Snapshot[] = [];

for (const roster of rosters) {
  const starters = real(roster.starters);
  const players = real(roster.players);
  snapshots.push({ roster_id: roster.roster_id, week, starters, players });

  const before = previous.get(roster.roster_id);
  // Nothing to compare against, or a new week, in which case every lineup
  // looks different for reasons that are not decisions.
  if (!before || before.week !== week) continue;

  const wasStarting = new Set(real(before.starters));
  const nowStarting = new Set(starters);
  const started = starters.filter((id) => !wasStarting.has(id));
  const benched = real(before.starters).filter((id) => !nowStarting.has(id));

  // A swap is one in and one out in the same run. Any other shape and the
  // pairing would be a guess, so the events stand on their own instead.
  const paired = started.length === 1 && benched.length === 1;

  for (const id of started) {
    events.push({
      week,
      roster_id: roster.roster_id,
      kind: 'start',
      player_id: id,
      other_id: paired ? benched[0] : null,
    });
  }
  for (const id of benched) {
    events.push({
      week,
      roster_id: roster.roster_id,
      kind: 'bench',
      player_id: id,
      other_id: paired ? started[0] : null,
    });
  }

  const had = new Set(real(before.players));
  const has = new Set(players);
  for (const id of players) if (!had.has(id)) events.push({ week, roster_id: roster.roster_id, kind: 'add', player_id: id });
  for (const id of real(before.players)) if (!has.has(id)) events.push({ week, roster_id: roster.roster_id, kind: 'drop', player_id: id });
}

if (events.length) {
  const { error } = await db.from('movement').insert(events);
  if (error) {
    // The snapshot is deliberately not advanced when the events fail to save.
    // Advancing it would make the next run compare against a state whose
    // changes were never recorded, and those changes would be lost for good.
    console.error(`could not write movement: ${error.message}`);
    process.exit(1);
  }
}

const { error: writeError } = await db
  .from('roster_snapshots')
  .upsert(snapshots, { onConflict: 'roster_id' });

if (writeError) {
  console.error(`could not save snapshots: ${writeError.message}`);
  process.exit(1);
}

const counts = events.reduce<Record<string, number>>((acc, e) => {
  acc[e.kind] = (acc[e.kind] ?? 0) + 1;
  return acc;
}, {});
console.log(
  `week ${week}: ${rosters.length} rosters, ${events.length} events` +
    (events.length ? ` (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')})` : '')
);
