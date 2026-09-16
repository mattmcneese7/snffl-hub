// SNFFL playoff odds: our own Monte Carlo simulation over the remaining
// schedule, per Brief Section 2. Projections drive the weekly score when they
// are available, and season scoring averages take over when they are not.

import type { PlayoffOdds } from './types';

export type ScheduleGame = { week: number; home: number; away: number };

export type OddsInput = {
  /** Roster ids in the league. */
  rosters: number[];
  /** Wins so far, keyed by roster id. */
  wins: Record<number, number>;
  /** Points for so far, the tiebreaker Sleeper uses. */
  pointsFor: Record<number, number>;
  /** Remaining regular season games. */
  remaining: ScheduleGame[];
  /** Expected weekly score per roster. */
  expected: Record<number, number>;
  /** Weekly standard deviation per roster. */
  spread: Record<number, number>;
  playoffTeams: number;
  /** Seeds that get a first round bye. 7 playoff teams means the top seed. */
  byeSeeds: number;
  runs?: number;
};

/** Box-Muller, so scores vary the way real weekly scores do. */
function gaussian(mean: number, sd: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * sd;
}

export function simulatePlayoffOdds(input: OddsInput): PlayoffOdds[] {
  const {
    rosters,
    wins,
    pointsFor,
    remaining,
    expected,
    spread,
    playoffTeams,
    byeSeeds,
    runs = 10000,
  } = input;

  const madeCount: Record<number, number> = {};
  const byeCount: Record<number, number> = {};
  const topCount: Record<number, number> = {};
  for (const id of rosters) {
    madeCount[id] = 0;
    byeCount[id] = 0;
    topCount[id] = 0;
  }

  for (let run = 0; run < runs; run++) {
    const w: Record<number, number> = { ...wins };
    const pf: Record<number, number> = { ...pointsFor };

    for (const game of remaining) {
      const homeScore = Math.max(0, gaussian(expected[game.home] ?? 100, spread[game.home] ?? 25));
      const awayScore = Math.max(0, gaussian(expected[game.away] ?? 100, spread[game.away] ?? 25));
      pf[game.home] += homeScore;
      pf[game.away] += awayScore;
      if (homeScore > awayScore) w[game.home] += 1;
      else if (awayScore > homeScore) w[game.away] += 1;
      else {
        // Sleeper can tie. Half a win each keeps the seeding math honest.
        w[game.home] += 0.5;
        w[game.away] += 0.5;
      }
    }

    const order = [...rosters].sort((a, b) => w[b] - w[a] || pf[b] - pf[a]);
    for (let seed = 0; seed < order.length; seed++) {
      const id = order[seed];
      if (seed < playoffTeams) madeCount[id]++;
      if (seed < byeSeeds) byeCount[id]++;
      if (seed === 0) topCount[id]++;
    }
  }

  const pct = (n: number) => Number(((n / runs) * 100).toFixed(1));

  return rosters
    .map((id) => {
      const makePlayoffs = pct(madeCount[id]);
      return {
        rosterId: id,
        makePlayoffs,
        bye: pct(byeCount[id]),
        topSeed: pct(topCount[id]),
        tag: tagFor(makePlayoffs),
      };
    })
    .sort((a, b) => b.makePlayoffs - a.makePlayoffs);
}

function tagFor(makePlayoffs: number): PlayoffOdds['tag'] {
  if (makePlayoffs >= 99.9) return 'Clinched';
  if (makePlayoffs <= 0.1) return 'Eliminated';
  if (makePlayoffs >= 85) return 'Clinch Watch';
  if (makePlayoffs >= 40) return 'Bubble';
  return 'In Trouble';
}

/**
 * Remaining regular season schedule, derived from Sleeper matchups rather than
 * assumed, so a league with an odd schedule still simulates correctly.
 */
export function remainingSchedule(
  matchupsByWeek: Record<number, { matchup_id: number; roster_id: number }[]>,
  fromWeek: number,
  playoffWeekStart: number
): ScheduleGame[] {
  const games: ScheduleGame[] = [];
  for (let week = fromWeek; week < playoffWeekStart; week++) {
    const rows = matchupsByWeek[week];
    if (!rows?.length) continue;
    const pairs: Record<number, number[]> = {};
    for (const row of rows) (pairs[row.matchup_id] ??= []).push(row.roster_id);
    for (const [, sides] of Object.entries(pairs)) {
      if (sides.length === 2) games.push({ week, home: sides[0], away: sides[1] });
    }
  }
  return games;
}
