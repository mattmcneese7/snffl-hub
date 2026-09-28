// The statistics spine, Checkpoint 13.
//
// Three things nobody publishes for this league, built once a night and
// stored, because they are aggregates over every week of the season and
// recomputing them per request would be absurd.
//
//   dvp     what each NFL defence concedes to each position, scored on THIS
//           league's rules rather than generic ones
//   usage   snap share, target share, carry share and red zone looks, which
//           is what separates a quiet week from a lost job
//   teams   the per week team totals the shares are computed against
//
// The plan for this checkpoint said nflverse. It is not used, and that is a
// deliberate change rather than an omission: Sleeper's own stats payload
// already carries `team`, `opponent`, `off_snp`, `tm_off_snp`, `rec_tgt`,
// `rush_att` and `rec_rz_tgt` on every row. Taking them from there means one
// source, one set of player ids, and the same scoring engine that Checkpoint
// 12 proved against Sleeper's own league scored actuals. Adding nflverse would
// have meant a second id space to reconcile for data we already had.
//
//   node --experimental-strip-types scripts/stats-spine.ts

import fs from 'node:fs';
import path from 'node:path';
import { getNflGames } from '../lib/gameday.ts';
import { league } from '../lib/league.ts';
import { scoreStats, type StatLine } from '../lib/scoring.ts';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;
type Pos = (typeof POSITIONS)[number];

const scoring = league.scoring as Record<string, number>;
const season = league.state.season;
const OUT = path.join('data', 'spine.json');

/**
 * How many games of evidence it takes before a defence's own number outweighs
 * the league average.
 *
 * Defence versus position is the most over-read number in fantasy football,
 * and through week two it is close to meaningless: one game against a team
 * that threw forty times says almost nothing about the next one. So the
 * reported figure is shrunk toward the position's league average, and only
 * pulls away from it as games accumulate. At four games a defence is weighted
 * evenly against the average, which is about where the number starts being
 * worth reading.
 */
const SHRINK_GAMES = 4;

type Row = {
  player_id?: string;
  team?: string;
  opponent?: string;
  week?: number;
  stats?: StatLine;
};

const get = async <T,>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
};

const weeks = Array.from({ length: Math.max(0, league.state.week - 1) }, (_, i) => i + 1);
if (!weeks.length) {
  console.error('No finished weeks yet, nothing to build.');
  process.exit(1);
}

console.log(`Building the spine for ${season}, weeks ${weeks[0]} to ${weeks[weeks.length - 1]}`);

// ---- Collect every scored line for the season so far ----

type Line = {
  id: string;
  pos: Pos;
  team: string;
  opponent: string;
  week: number;
  points: number;
  stats: StatLine;
};

const lines: Line[] = [];
const seen = new Set<string>();

for (const week of weeks) {
  for (const pos of POSITIONS) {
    const rows = await get<Row[]>(
      `https://api.sleeper.com/stats/nfl/${season}/${week}?season_type=regular&position[]=${pos}`
    );
    for (const row of rows ?? []) {
      const id = row?.player_id;
      if (!id || !row.stats || !row.team || !row.opponent) continue;
      // A player listed at two positions would otherwise be charged to a
      // defence twice in the same game.
      const key = `${id}-${week}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({
        id,
        pos,
        team: row.team,
        opponent: row.opponent,
        week,
        points: scoreStats(row.stats, scoring),
        stats: row.stats,
      });
    }
  }
  console.log(`  week ${week}: ${lines.filter((l) => l.week === week).length} lines`);
}

// ---- Defence versus position ----

/** Points a defence conceded to a position, by the game it happened in. */
const conceded = new Map<string, Map<Pos, Map<number, number>>>();
for (const line of lines) {
  const byPos = conceded.get(line.opponent) ?? new Map<Pos, Map<number, number>>();
  const byWeek = byPos.get(line.pos) ?? new Map<number, number>();
  byWeek.set(line.week, (byWeek.get(line.week) ?? 0) + line.points);
  byPos.set(line.pos, byWeek);
  conceded.set(line.opponent, byPos);
}

/** The league average concession per game, per position. */
const positionMean = {} as Record<Pos, number>;
for (const pos of POSITIONS) {
  const games: number[] = [];
  for (const byPos of conceded.values()) {
    for (const points of (byPos.get(pos) ?? new Map()).values()) games.push(points);
  }
  positionMean[pos] = games.length ? games.reduce((a, b) => a + b, 0) / games.length : 0;
}

type DvpEntry = {
  /** Raw points conceded per game. */
  perGame: number;
  games: number;
  /** Shrunk toward the league average by SHRINK_GAMES, which is the number to use. */
  adjusted: number;
  /** Adjusted against the position average. Above 1 is a defence to attack. */
  vsAverage: number;
  rank: number;
};

const dvp: Record<string, Partial<Record<Pos, DvpEntry>>> = {};
for (const [team, byPos] of conceded) {
  for (const pos of POSITIONS) {
    const byWeek = byPos.get(pos);
    if (!byWeek?.size) continue;
    const games = byWeek.size;
    const perGame = [...byWeek.values()].reduce((a, b) => a + b, 0) / games;
    const mean = positionMean[pos];
    const adjusted = (games * perGame + SHRINK_GAMES * mean) / (games + SHRINK_GAMES);
    dvp[team] = dvp[team] ?? {};
    dvp[team][pos] = {
      perGame: Number(perGame.toFixed(2)),
      games,
      adjusted: Number(adjusted.toFixed(2)),
      vsAverage: mean ? Number((adjusted / mean).toFixed(3)) : 1,
      rank: 0,
    };
  }
}

// Rank 1 is the defence conceding most, which is the one you want to attack.
for (const pos of POSITIONS) {
  const entries = Object.entries(dvp)
    .filter(([, byPos]) => byPos[pos])
    .sort((a, b) => b[1][pos]!.adjusted - a[1][pos]!.adjusted);
  entries.forEach(([team], i) => {
    dvp[team][pos]!.rank = i + 1;
  });
}

// ---- Usage ----

/** Team totals per week, which every share is a fraction of. */
const teamTotals = new Map<string, { targets: number; carries: number; rzTargets: number; rzCarries: number }>();
for (const line of lines) {
  const key = `${line.team}-${line.week}`;
  const t = teamTotals.get(key) ?? { targets: 0, carries: 0, rzTargets: 0, rzCarries: 0 };
  t.targets += line.stats.rec_tgt ?? 0;
  t.carries += line.stats.rush_att ?? 0;
  t.rzTargets += line.stats.rec_rz_tgt ?? 0;
  t.rzCarries += line.stats.rush_rz_att ?? 0;
  teamTotals.set(key, t);
}

type UsageEntry = {
  weeks: number;
  /** Share of his team's offensive snaps. */
  snapShare: number;
  targetShare: number;
  carryShare: number;
  /** Red zone targets plus carries, per game. */
  redZone: number;
  pointsPerGame: number;
  /** The same four over the last three weeks, for the trend. */
  recent: { weeks: number; snapShare: number; targetShare: number; carryShare: number; pointsPerGame: number } | null;
};

const RECENT = 3;
const lastWeek = weeks[weeks.length - 1];

function usageOver(playerLines: Line[]) {
  let snaps = 0;
  let teamSnaps = 0;
  let targets = 0;
  let teamTargets = 0;
  let carries = 0;
  let teamCarries = 0;
  let redZone = 0;
  let points = 0;

  for (const line of playerLines) {
    const totals = teamTotals.get(`${line.team}-${line.week}`);
    snaps += line.stats.off_snp ?? 0;
    teamSnaps += line.stats.tm_off_snp ?? 0;
    targets += line.stats.rec_tgt ?? 0;
    carries += line.stats.rush_att ?? 0;
    teamTargets += totals?.targets ?? 0;
    teamCarries += totals?.carries ?? 0;
    redZone += (line.stats.rec_rz_tgt ?? 0) + (line.stats.rush_rz_att ?? 0);
    points += line.points;
  }

  const share = (part: number, whole: number) => (whole > 0 ? Number((part / whole).toFixed(3)) : 0);
  const n = playerLines.length;
  return {
    weeks: n,
    snapShare: share(snaps, teamSnaps),
    targetShare: share(targets, teamTargets),
    carryShare: share(carries, teamCarries),
    redZone: n ? Number((redZone / n).toFixed(2)) : 0,
    pointsPerGame: n ? Number((points / n).toFixed(2)) : 0,
  };
}

const byPlayer = new Map<string, Line[]>();
for (const line of lines) {
  byPlayer.set(line.id, [...(byPlayer.get(line.id) ?? []), line]);
}

const usage: Record<string, UsageEntry> = {};
for (const [id, playerLines] of byPlayer) {
  // Somebody who never took a snap is not usage data, he is noise, and there
  // are hundreds of him in every week's payload.
  if (!playerLines.some((l) => (l.stats.off_snp ?? 0) > 0 || l.points !== 0)) continue;
  const all = usageOver(playerLines);
  const recentLines = playerLines.filter((l) => l.week > lastWeek - RECENT);
  usage[id] = {
    ...all,
    recent: recentLines.length && recentLines.length < playerLines.length ? usageOver(recentLines) : null,
  };
}

// ---- Schedule ahead ----
//
// Which defence every NFL team meets over the next few weeks, which is what
// joins a player to the dvp table above and turns "he is good" into "he has
// three soft matchups and then a wall".

const AHEAD = 4;
const schedule: Record<string, { week: number; opponent: string; home: boolean }[]> = {};

for (let i = 0; i < AHEAD; i++) {
  const week = league.state.week + i;
  const games = await getNflGames(week, season).catch(() => []);
  for (const game of games) {
    const pairs: [string, string, boolean][] = [
      [game.home.abbr, game.away.abbr, true],
      [game.away.abbr, game.home.abbr, false],
    ];
    for (const [team, opponent, home] of pairs) {
      if (!team || !opponent) continue;
      schedule[team] = [...(schedule[team] ?? []), { week, opponent, home }];
    }
  }
  console.log(`  week ${week} schedule: ${games.length} games`);
}

// A bye is an absence rather than a row, so it is left absent: a caller
// reading three weeks ahead gets two entries and can say so.

// ---- Write ----

const out = {
  season,
  throughWeek: lastWeek,
  builtAt: new Date().toISOString(),
  shrinkGames: SHRINK_GAMES,
  positionMean: Object.fromEntries(
    Object.entries(positionMean).map(([k, v]) => [k, Number(v.toFixed(2))])
  ),
  dvp,
  usage,
  schedule,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(
  `\n  ${Object.keys(dvp).length} defences, ${Object.keys(usage).length} players, ` +
    `${Object.keys(schedule).length} teams scheduled, ${kb}KB`
);
console.log('\nLeague average conceded per game:');
for (const pos of POSITIONS) console.log(`  ${pos.padEnd(4)} ${positionMean[pos].toFixed(2)}`);
