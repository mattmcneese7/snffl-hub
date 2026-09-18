// DraftSharks pull. Rest of season and this week's PPR rankings, matched to
// Sleeper ids and written to data/draftsharks.json for the rankings board,
// player pages and matchup rows.
//
// Two requests per run, identified by a named user agent, and a few runs a
// week. A failed or suspiciously short pull leaves the last good file alone
// rather than blanking the board, and exits non-zero so the Actions run shows
// red instead of quietly shipping stale numbers as fresh.
//
// Run with Node 24, which strips TypeScript types natively.

import fs from 'node:fs';
import {
  DS_BASE,
  DS_TEAM_TO_SLEEPER,
  parseRows,
  type DsBoard,
  type DsRow,
  type ParsedRow,
} from '../lib/draftsharks.ts';
import { normaliseName } from '../lib/live.ts';
import { getState } from '../lib/sleeper.ts';
import type { PlayerLite } from '../lib/types.ts';

const FILE = 'data/draftsharks.json';
const USER_AGENT = 'SquirtniteFFL/1.0 (+https://www.squirtnite.live; league hub, credits and links DraftSharks)';
// Offense, kicker and defense. The export also ranks IDP, which this league
// does not roster, so those rows would only ever fail to match.
const POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);
// Fewer rows than this means a changed page or a block, not a real board.
const MIN_ROWS = 150;

async function load(path: string): Promise<string> {
  const res = await fetch(`${DS_BASE}${path}`, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`DraftSharks ${res.status} on ${path}`);
  return res.text();
}

const state = await getState();
// state.week is the week being played. On Tuesday it has already rolled to
// the next one, which is the week managers are setting lineups for.
const week = Math.max(1, state.week || state.display_week || 1);

const [rosHtml, weeklyHtml] = await Promise.all([
  load('/ros-rankings/load-rows?offset=0&limit=400&fantasyPosition=&pprSuperflexSlug=ppr&sort=-dsValue&researchDepth=rankings'),
  load(
    `/weekly-rankings/load-rows?offset=0&limit=400&fantasyPosition=&pprSuperflexSlug=ppr&sort=-weekly3dPts&week=${week}&researchDepth=rankings`
  ),
]);

const rosRows = parseRows(rosHtml, 'ros');
const weeklyRows = parseRows(weeklyHtml, 'weekly');
console.log(`DraftSharks: ${rosRows.length} rest of season rows, ${weeklyRows.length} Week ${week} rows`);

if (rosRows.length < MIN_ROWS || weeklyRows.length < MIN_ROWS) {
  console.error(`too few rows to trust (minimum ${MIN_ROWS}), keeping the last good file`);
  process.exit(1);
}

// ---------- Match to Sleeper ids ----------

const players = JSON.parse(fs.readFileSync('data/players.json', 'utf8')) as Record<string, PlayerLite>;
const byNameTeam = new Map<string, string>();
const byName = new Map<string, string[]>();
const byLastTeamPos = new Map<string, string[]>();
const lastName = (name: string) => normaliseName(name).split(' ').slice(1).join(' ');
for (const [id, player] of Object.entries(players)) {
  if (!player?.name || !POSITIONS.has(player.position)) continue;
  const key = normaliseName(player.name);
  byNameTeam.set(`${key}|${player.team ?? ''}`, id);
  byName.set(key, [...(byName.get(key) ?? []), id]);
  const ltp = `${lastName(player.name)}|${player.team ?? ''}|${player.position}`;
  byLastTeamPos.set(ltp, [...(byLastTeamPos.get(ltp) ?? []), id]);
}

function sleeperId(row: ParsedRow): string | null {
  const team = DS_TEAM_TO_SLEEPER[row.team] ?? row.team;
  // A defense is keyed by its team code in Sleeper, KC or SF.
  if (row.position === 'DEF') return players[team] ? team : null;
  const key = normaliseName(row.name);
  const exact = byNameTeam.get(`${key}|${team}`);
  if (exact) return exact;
  // Name alone only when it is unambiguous, which covers a player DraftSharks
  // already shows on a new team before the nightly Sleeper file catches up.
  const loose = byName.get(key);
  if (loose?.length === 1) return loose[0];
  // Nicknames: DraftSharks prints Cameron Skattebo and Kenneth Gainwell, Sleeper
  // Cam and Kenny. Surname, team and position together pin down one player.
  const bySurname = byLastTeamPos.get(`${lastName(row.name)}|${team}|${row.position}`);
  return bySurname?.length === 1 ? bySurname[0] : null;
}

function toBoard(rows: ParsedRow[], label: string): Record<string, DsRow> {
  const out: Record<string, DsRow> = {};
  const missed: string[] = [];
  for (const row of rows) {
    if (!POSITIONS.has(row.position)) continue;
    const id = sleeperId(row);
    if (!id) {
      missed.push(`${row.name} ${row.position} ${row.team}`);
      continue;
    }
    const { dsId: _dsId, ...rest } = row;
    out[id] = { ...rest, team: DS_TEAM_TO_SLEEPER[row.team] ?? row.team };
  }
  console.log(`  ${label}: matched ${Object.keys(out).length}, unmatched ${missed.length}`);
  if (missed.length) console.log(`    unmatched: ${missed.slice(0, 15).join(', ')}`);
  return out;
}

const ros = toBoard(rosRows, 'rest of season');
const weekly = toBoard(weeklyRows, `Week ${week}`);

// ---------- Write, only when the rankings moved ----------

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(source)
        .sort()
        .map((key) => [key, canonical(source[key])])
    );
  }
  return value;
}

let previous: DsBoard | null = null;
try {
  previous = JSON.parse(fs.readFileSync(FILE, 'utf8')) as DsBoard;
} catch {
  previous = null;
}

const same =
  previous &&
  previous.week === week &&
  JSON.stringify(canonical(previous.ros)) === JSON.stringify(canonical(ros)) &&
  JSON.stringify(canonical(previous.weekly)) === JSON.stringify(canonical(weekly));

if (same) {
  // pulledAt alone changing would commit a new file on every run.
  console.log('rankings unchanged since the last pull, nothing written');
} else {
  const board: DsBoard = { pulledAt: new Date().toISOString(), week, ros, weekly };
  fs.writeFileSync(FILE, JSON.stringify(canonical(board), null, 1) + '\n');
  console.log(`wrote ${FILE}`);
}
