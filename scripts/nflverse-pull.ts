// nflverse pull. Weekly usage for every fantasy relevant player this season,
// matched to Sleeper ids and written to data/nflverse-2026.json for Splash's
// Insights page and the Usage widget on player pages.
//
// Three public files per run: nflverse's weekly player stats and snap counts,
// both from their GitHub releases, and DynastyProcess's id map to turn
// nflverse's gsis and Pro Football Reference ids into Sleeper ids. Both
// nflverse files are a few megabytes, which is why this runs once a night
// rather than on a page request.
//
// Only what the app reads is kept: targets, receptions, target share, air
// yards share, WOPR, carries and carry share, the three EPA figures, and
// offensive snaps with snap share. Zeros are dropped and shares are rounded to
// three places, so the file stays small and only changes when a number does.
// nflverse does not publish red zone looks in these files, so there are none.
//
// A failed or suspiciously short pull leaves the last good file alone and
// exits non-zero, the same as the DraftSharks pull.
//
// Run with Node 24, which strips TypeScript types natively.

import fs from 'node:fs';

const SEASON = 2026;
const FILE = `data/nflverse-${SEASON}.json`;
const RELEASES = 'https://github.com/nflverse/nflverse-data/releases/download';
const STATS_URL = `${RELEASES}/stats_player/stats_player_week_${SEASON}.csv`;
const SNAPS_URL = `${RELEASES}/snap_counts/snap_counts_${SEASON}.csv`;
const IDS_URL = 'https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv';
const USER_AGENT = 'SquirtniteFFL/1.0 (+https://www.squirtnite.live; league hub, credits nflverse)';
const POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);
// Fewer rows than this means a moved file or an outage, not a real season.
const MIN_ROWS = 200;

type Csv = Record<string, string>[];

/** Minimal CSV reader. The sources quote fields but never embed newlines. */
function parseCsv(text: string): Csv {
  const lines = text.split('\n').filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (line: string) => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        cells.push(cell);
        cell = '';
      } else cell += ch;
    }
    cells.push(cell);
    return cells;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()]));
  });
}

async function load(url: string): Promise<Csv> {
  // GitHub release downloads redirect to object storage; fetch follows them.
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} on ${url}`);
  return parseCsv(await res.text());
}

let stats: Csv;
let snaps: Csv;
let ids: Csv;
try {
  [stats, snaps, ids] = await Promise.all([load(STATS_URL), load(SNAPS_URL), load(IDS_URL)]);
} catch (error) {
  console.error(`pull failed, keeping the last good file: ${(error as Error).message}`);
  process.exit(1);
}

stats = stats.filter((r) => r.season_type === 'REG');
snaps = snaps.filter((r) => r.game_type === 'REG');
console.log(`nflverse: ${stats.length} stat rows, ${snaps.length} snap rows, ${ids.length} id rows`);
if (stats.length < MIN_ROWS || snaps.length < MIN_ROWS) {
  console.error(`too few rows to trust (minimum ${MIN_ROWS}), keeping the last good file`);
  process.exit(1);
}

// ---------- Ids ----------

const real = (v: string | undefined) => Boolean(v && v !== 'NA');
const gsisToSleeper = new Map<string, string>();
const pfrToSleeper = new Map<string, string>();
for (const row of ids) {
  if (!real(row.sleeper_id)) continue;
  if (real(row.gsis_id)) gsisToSleeper.set(row.gsis_id, row.sleeper_id);
  if (real(row.pfr_id)) pfrToSleeper.set(row.pfr_id, row.sleeper_id);
}

// ---------- Build ----------

/** One player's week. Short keys, because there are a couple thousand of them. */
type Week = {
  /** Targets. */
  tgt?: number;
  /** Receptions. */
  rec?: number;
  /** Share of his team's targets. */
  ts?: number;
  /** Share of his team's intended air yards. */
  ays?: number;
  /** Weighted opportunity rating: 1.5 x target share + 0.7 x air yards share. */
  wopr?: number;
  /** Carries. */
  car?: number;
  /** Share of his team's carries, derived from every carry in the file. */
  cs?: number;
  /** Expected points added, passing, rushing and receiving. */
  pepa?: number;
  repa?: number;
  cepa?: number;
  /** Offensive snaps and share of his team's. */
  snp?: number;
  sp?: number;
};
type Player = { pos: string; team: string; w: Record<string, Week> };

const num = (v: string | undefined) => {
  const n = Number(v);
  return v && v !== 'NA' && Number.isFinite(n) ? n : 0;
};
const r3 = (n: number) => Math.round(n * 1000) / 1000;

// Team carries per game, so a carry share can be stated rather than guessed.
const teamCarries = new Map<string, number>();
for (const row of stats) {
  const key = `${row.week}|${row.team}`;
  teamCarries.set(key, (teamCarries.get(key) ?? 0) + num(row.carries));
}

const players: Record<string, Player> = {};
const missed = new Set<string>();
const slot = (id: string, pos: string, team: string, week: string): Week => {
  const p = (players[id] ??= { pos, team, w: {} });
  p.team = team || p.team;
  return (p.w[week] ??= {});
};
const put = (week: Week, key: keyof Week, value: number) => {
  const v = r3(value);
  if (v !== 0) week[key] = v;
};

for (const row of stats) {
  if (!POSITIONS.has(row.position)) continue;
  const id = gsisToSleeper.get(row.player_id);
  if (!id) {
    missed.add(`${row.player_display_name} ${row.position} ${row.team}`);
    continue;
  }
  const week = slot(id, row.position, row.team, row.week);
  put(week, 'tgt', num(row.targets));
  put(week, 'rec', num(row.receptions));
  put(week, 'ts', num(row.target_share));
  put(week, 'ays', num(row.air_yards_share));
  put(week, 'wopr', num(row.wopr));
  const carries = num(row.carries);
  put(week, 'car', carries);
  const team = teamCarries.get(`${row.week}|${row.team}`) ?? 0;
  if (carries && team) put(week, 'cs', carries / team);
  put(week, 'pepa', num(row.passing_epa));
  put(week, 'repa', num(row.rushing_epa));
  put(week, 'cepa', num(row.receiving_epa));
}

for (const row of snaps) {
  if (!POSITIONS.has(row.position)) continue;
  const id = pfrToSleeper.get(row.pfr_player_id);
  if (!id) {
    if (num(row.offense_snaps)) missed.add(`${row.player} ${row.position} ${row.team}`);
    continue;
  }
  const snapsPlayed = num(row.offense_snaps);
  if (!snapsPlayed) continue;
  const week = slot(id, players[id]?.pos ?? row.position, row.team, row.week);
  put(week, 'snp', snapsPlayed);
  put(week, 'sp', num(row.offense_pct));
}

// A week with nothing left in it after the zeros go is not a week of usage.
for (const [id, player] of Object.entries(players)) {
  for (const [wk, week] of Object.entries(player.w)) if (!Object.keys(week).length) delete player.w[wk];
  if (!Object.keys(player.w).length) delete players[id];
}

const weeks = [...new Set(stats.map((r) => Number(r.week)))].filter(Number.isFinite).sort((a, b) => a - b);
const throughWeek = weeks.length ? weeks[weeks.length - 1] : 0;

// Snap counts land a day or two behind the box score stats. A week only
// counts for usage once every team with stats that week has snaps too, so a
// share trend never compares a full week against one game of it.
const teamsIn = (rows: Csv, week: number) => new Set(rows.filter((r) => Number(r.week) === week).map((r) => r.team));
const snapWeeks = weeks.filter((wk) => {
  const withStats = teamsIn(stats, wk);
  const withSnaps = teamsIn(snaps, wk);
  return withStats.size > 0 && [...withStats].every((team) => withSnaps.has(team));
});
console.log(`  matched ${Object.keys(players).length} players through week ${throughWeek}, snap counts complete for weeks ${snapWeeks.join(', ')}, unmatched ${missed.size}`);
if (missed.size) console.log(`    unmatched: ${[...missed].slice(0, 15).join(', ')}`);

// ---------- Write, only when the numbers moved ----------

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

/** One player per line: small on disk, and a nightly diff reads as who changed. */
function serialize(file: {
  pulledAt: string;
  season: number;
  throughWeek: number;
  weeks: number[];
  snapWeeks: number[];
  players: Record<string, Player>;
}) {
  const ordered = Object.keys(file.players).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  const body = ordered.map((id) => `${JSON.stringify(id)}:${JSON.stringify(canonical(file.players[id]))}`).join(',\n');
  return `{"pulledAt":${JSON.stringify(file.pulledAt)},"season":${file.season},"throughWeek":${file.throughWeek},"weeks":${JSON.stringify(file.weeks)},"snapWeeks":${JSON.stringify(file.snapWeeks)},\n"players":{\n${body}\n}}\n`;
}

let previous: { throughWeek?: number; snapWeeks?: number[]; players?: Record<string, Player> } | null = null;
try {
  previous = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  previous = null;
}

const same =
  previous &&
  previous.throughWeek === throughWeek &&
  JSON.stringify(previous.snapWeeks) === JSON.stringify(snapWeeks) &&
  JSON.stringify(canonical(previous.players)) === JSON.stringify(canonical(players));

if (same) {
  // pulledAt alone changing would commit a new file on every run.
  console.log('usage unchanged since the last pull, nothing written');
} else {
  const text = serialize({ pulledAt: new Date().toISOString(), season: SEASON, throughWeek, weeks, snapWeeks, players });
  fs.writeFileSync(FILE, text);
  console.log(`wrote ${FILE}, ${(Buffer.byteLength(text) / 1024).toFixed(1)}KB`);
}
