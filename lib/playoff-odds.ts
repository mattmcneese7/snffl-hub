// Assembles the Monte Carlo inputs from Sleeper and runs the SNFFL odds.
//
// Projections drive expectations when they exist; season scoring averages take
// over when they do not, per Brief Section 2.

import { getSeasonResults, getStandings, league, scoredWeek } from './league';
import { seasonAverages, seasonVariance } from './projections';
import { remainingSchedule, simulatePlayoffOdds } from './odds';
import { getMatchups } from './sleeper';
import type { PlayoffOdds, Standing } from './types';

export type OddsRow = PlayoffOdds & { team: Standing };

export async function getPlayoffOdds(): Promise<OddsRow[]> {
  const week = await scoredWeek();
  const standings = await getStandings();
  const results = await getSeasonResults(week);

  const pointsByWeek: Record<number, Record<number, number>> = {};
  for (const row of results) {
    pointsByWeek[row.week] ??= {};
    pointsByWeek[row.week][row.rosterId] = row.points;
  }

  const rawExpected = seasonAverages(pointsByWeek);
  const rawSpread = seasonVariance(pointsByWeek, rawExpected);

  // One week played is not a scoring average. Left raw, the simulation treats a
  // single result as the truth and starts declaring teams clinched in Week 1,
  // so expectations regress toward the league mean and spread widens while the
  // sample is thin. Both converge on the raw numbers as weeks accumulate.
  const gamesPlayed: Record<number, number> = {};
  for (const row of results) gamesPlayed[row.rosterId] = (gamesPlayed[row.rosterId] ?? 0) + 1;

  const values = Object.values(rawExpected);
  const leagueMean = values.length
    ? values.reduce((sum, v) => sum + v, 0) / values.length
    : 100;

  const PRIOR_WEIGHT = 4;
  const expected: Record<number, number> = {};
  const spread: Record<number, number> = {};

  for (const rosterId of Object.keys(rawExpected).map(Number)) {
    const n = gamesPlayed[rosterId] ?? 0;
    expected[rosterId] =
      (n * rawExpected[rosterId] + PRIOR_WEIGHT * leagueMean) / (n + PRIOR_WEIGHT);
    // A thin sample understates how much a team can swing week to week.
    spread[rosterId] = Math.max(rawSpread[rosterId] ?? 25, 25) * (1 + 2 / (n + 1));
  }

  // Remaining regular season fixtures, read from Sleeper rather than assumed.
  const matchupsByWeek: Record<number, { matchup_id: number; roster_id: number }[]> = {};
  const upcoming = [];
  for (let w = week + 1; w < league.playoffWeekStart; w++) upcoming.push(w);

  const fetched = await Promise.all(
    upcoming.map(async (w) => {
      try {
        return { week: w, rows: await getMatchups(w) };
      } catch {
        return { week: w, rows: [] };
      }
    })
  );
  for (const { week: w, rows } of fetched) matchupsByWeek[w] = rows;

  const remaining = remainingSchedule(matchupsByWeek, week + 1, league.playoffWeekStart);

  const wins: Record<number, number> = {};
  const pointsFor: Record<number, number> = {};
  for (const team of standings) {
    wins[team.rosterId] = team.wins + team.ties * 0.5;
    pointsFor[team.rosterId] = team.pointsFor;
  }

  // 7 playoff teams means the top seed alone gets a bye.
  const byeSeeds = Math.max(0, 2 ** Math.ceil(Math.log2(league.playoffTeams)) - league.playoffTeams);

  const odds = simulatePlayoffOdds({
    rosters: standings.map((t) => t.rosterId),
    wins,
    pointsFor,
    remaining,
    expected,
    spread,
    playoffTeams: league.playoffTeams,
    byeSeeds,
  });

  return odds.map((row) => ({
    ...row,
    team: standings.find((t) => t.rosterId === row.rosterId)!,
  }));
}

export async function getOddsFor(rosterId: number): Promise<OddsRow | undefined> {
  const all = await getPlayoffOdds();
  return all.find((row) => row.rosterId === rosterId);
}
