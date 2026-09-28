// Does scoring projections on this league's rulebook actually help?
//
// Checkpoint 12 claims the old number was wrong for defences and kickers. A
// claim like that is worth nothing without the measurement, so this is the
// measurement, and it runs in two parts.
//
// Part one proves the engine. Sleeper's league matchups endpoint returns
// `players_points`: what every rostered player actually scored, under this
// league's own rules, as calculated by Sleeper itself. Running the engine over
// the same week's real stat lines has to reproduce those numbers. If it does
// not, the engine is wrong and part two is meaningless.
//
// Part two is the backtest. For each finished week, compare what the old code
// would have predicted (`pts_ppr`, straight off the projection) and what the
// new code predicts (the projected stat line scored on this league's rules),
// both against what actually happened. Mean absolute error, per position.
//
//   node --experimental-strip-types scripts/projection-backtest.ts

import { league } from '../lib/league.ts';
import { scoreStats, type StatLine } from '../lib/scoring.ts';

const LEAGUE_ID = '1394336593518546944';
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const scoring = league.scoring as Record<string, number>;
const season = league.state.season;

type Row = { player_id?: string; stats?: StatLine };

const get = async <T,>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
};

/** Every rostered player's real points for a week, as Sleeper scored them. */
async function truthFor(week: number): Promise<Map<string, number>> {
  const matchups = await get<{ players_points?: Record<string, number> }[]>(
    `https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${week}`
  );
  const out = new Map<string, number>();
  for (const side of matchups ?? []) {
    for (const [id, pts] of Object.entries(side.players_points ?? {})) {
      if (typeof pts === 'number') out.set(id, pts);
    }
  }
  return out;
}

/** Stat lines by player id for a week, either the real ones or the forecast. */
async function linesFor(kind: 'stats' | 'projections', week: number) {
  const out = new Map<string, { pos: string; stats: StatLine; ptsPpr: number }>();
  for (const pos of POSITIONS) {
    const rows = await get<Row[]>(
      `https://api.sleeper.com/${kind}/nfl/${season}/${week}?season_type=regular&position[]=${pos}`
    );
    for (const row of rows ?? []) {
      const id = row?.player_id;
      if (!id || !row.stats) continue;
      // A player listed at more than one position is counted once, under the
      // first that claims him, so he cannot skew two averages at the same time.
      if (out.has(id)) continue;
      out.set(id, { pos, stats: row.stats, ptsPpr: Number(row.stats.pts_ppr ?? 0) });
    }
  }
  return out;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmt = (n: number) => n.toFixed(2).padStart(6);

const weeks = Array.from({ length: Math.max(0, league.state.week - 1) }, (_, i) => i + 1);
if (!weeks.length) {
  console.log('No finished weeks yet, nothing to measure.');
  process.exit(0);
}

console.log(`Season ${season}, weeks ${weeks[0]} to ${weeks[weeks.length - 1]}\n`);

// ---- Part one: does the engine reproduce Sleeper's own league scoring? ----

console.log('ENGINE CHECK  engine over real stats vs Sleeper\'s league-scored actuals');
let checked = 0;
const byPosError = new Map<string, number[]>();

for (const week of weeks) {
  const [truth, actual] = await Promise.all([truthFor(week), linesFor('stats', week)]);
  for (const [id, points] of truth) {
    const line = actual.get(id);
    if (!line) continue;
    // Nobody who did not play: a zero against a zero proves nothing and there
    // are hundreds of them, which would flatter the average.
    if (!points && !Object.keys(line.stats).some((k) => scoring[k])) continue;
    const mine = scoreStats(line.stats, scoring);
    const list = byPosError.get(line.pos) ?? [];
    list.push(Math.abs(mine - points));
    byPosError.set(line.pos, list);
    checked += 1;
  }
}

for (const pos of POSITIONS) {
  const errs = byPosError.get(pos) ?? [];
  if (!errs.length) continue;
  const worst = Math.max(...errs);
  const flag = mean(errs) < 0.2 ? 'ok' : 'MISMATCH';
  console.log(`  ${pos.padEnd(4)} n=${String(errs.length).padStart(4)}  mean ${fmt(mean(errs))}  worst ${fmt(worst)}  ${flag}`);
}
console.log(`  ${checked} player weeks checked\n`);

// ---- Part two: old projection vs new projection, against what happened ----

console.log('BACKTEST  mean absolute error against actual points');
console.log('  pos    n     old     new    gain');

const oldErr = new Map<string, number[]>();
const newErr = new Map<string, number[]>();

for (const week of weeks) {
  const [truth, proj] = await Promise.all([truthFor(week), linesFor('projections', week)]);
  for (const [id, points] of truth) {
    const line = proj.get(id);
    if (!line) continue;
    // Only players the projection expected to feature. Scoring a projection of
    // zero against an actual of zero is measuring the bye week, not the model.
    if (!line.ptsPpr && !scoreStats(line.stats, scoring)) continue;
    const o = oldErr.get(line.pos) ?? [];
    const n = newErr.get(line.pos) ?? [];
    o.push(Math.abs(line.ptsPpr - points));
    n.push(Math.abs(scoreStats(line.stats, scoring) - points));
    oldErr.set(line.pos, o);
    newErr.set(line.pos, n);
  }
}

for (const pos of POSITIONS) {
  const o = oldErr.get(pos) ?? [];
  const n = newErr.get(pos) ?? [];
  if (!o.length) continue;
  const a = mean(o);
  const b = mean(n);
  const gain = a - b;
  const mark = Math.abs(gain) < 0.01 ? '     same' : gain > 0 ? `  ${gain.toFixed(2)} better` : `  ${(-gain).toFixed(2)} WORSE`;
  console.log(`  ${pos.padEnd(4)} ${String(o.length).padStart(4)} ${fmt(a)} ${fmt(b)} ${mark}`);
}
