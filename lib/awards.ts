// Weekly awards derived straight from Sleeper scores.
//
// Manager of the Week, the Shart and chug counts are all just the high and low
// score each week, so none of them wait on the writing pipeline. The Chug Meter
// counts lowest score finishes, not beers: submissions happen off site.

import { getSeasonResults, scoredWeek } from './league.ts';

export type WeeklyExtreme = { week: number; rosterId: number; points: number };

export type AwardTally = {
  rosterId: number;
  count: number;
  weeks: number[];
};

async function extremes(throughWeek?: number) {
  const week = throughWeek ?? (await scoredWeek());
  const results = await getSeasonResults(week);

  const byWeek = new Map<number, typeof results>();
  for (const row of results) {
    const list = byWeek.get(row.week) ?? [];
    list.push(row);
    byWeek.set(row.week, list);
  }

  const highs: WeeklyExtreme[] = [];
  const lows: WeeklyExtreme[] = [];

  for (const [wk, rows] of byWeek) {
    // A week with no scores yet has no high or low worth claiming.
    const scored = rows.filter((r) => r.points > 0);
    if (!scored.length) continue;

    const high = scored.reduce((a, b) => (b.points > a.points ? b : a));
    const low = scored.reduce((a, b) => (b.points < a.points ? b : a));
    highs.push({ week: wk, rosterId: high.rosterId, points: high.points });
    lows.push({ week: wk, rosterId: low.rosterId, points: low.points });
  }

  highs.sort((a, b) => a.week - b.week);
  lows.sort((a, b) => a.week - b.week);
  return { highs, lows };
}

function tally(list: WeeklyExtreme[]): AwardTally[] {
  const counts = new Map<number, number[]>();
  for (const item of list) {
    const weeks = counts.get(item.rosterId) ?? [];
    weeks.push(item.week);
    counts.set(item.rosterId, weeks);
  }
  return [...counts.entries()]
    .map(([rosterId, weeks]) => ({ rosterId, count: weeks.length, weeks }))
    .sort((a, b) => b.count - a.count || a.rosterId - b.rosterId);
}

export async function getWeeklyExtremes(throughWeek?: number) {
  return extremes(throughWeek);
}

/** One per weekly lowest score. Sorted most to fewest for the meter. */
export async function getChugCounts(throughWeek?: number): Promise<AwardTally[]> {
  const { lows } = await extremes(throughWeek);
  return tally(lows);
}

export async function getManagerOfTheWeekCounts(throughWeek?: number): Promise<AwardTally[]> {
  const { highs } = await extremes(throughWeek);
  return tally(highs);
}

/** Every scored week for one roster, for the points by week chart. */
export async function getPointsByWeek(
  rosterId: number,
  throughWeek?: number
): Promise<{ week: number; points: number; won: boolean }[]> {
  const week = throughWeek ?? (await scoredWeek());
  const results = await getSeasonResults(week);
  return results
    .filter((r) => r.rosterId === rosterId)
    .sort((a, b) => a.week - b.week)
    .map((r) => ({ week: r.week, points: r.points, won: r.won }));
}
