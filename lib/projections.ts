// Sleeper projections, scored on this league's rulebook. Unofficial and
// public, no login. Used for win probability, playoff odds and previews.
// Falls back to season scoring averages if the endpoint breaks, per Brief
// Section 3.
//
// The payload carries a precomputed `pts_ppr` and this used to take it. That
// field is scored on Sleeper's defaults, which are not this league's, so the
// number was systematically wrong in three places every week:
//
//   QB    interceptions cost 2 here and 1 by default, and a starting
//         quarterback is projected for about two thirds of one a week, so
//         every QB came through about 0.66 too high
//   DEF   points allowed pays about half the default rate, and the league
//         scores yards allowed too, which default scoring does not price at
//         all: about 0.48 a week, and up to 2.94 for one defence
//   K     fifty yard field goals pay through the fine grained buckets
//
// Receivers, backs and tight ends were unaffected: full PPR with standard
// yardage and touchdowns is exactly what `pts_ppr` assumes.

import { league } from './league.ts';
import { scoreStats } from './scoring.ts';

const PROJECTIONS = 'https://api.sleeper.com/projections/nfl';
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

export type ProjectionMap = Record<string, number>;

type RawProjection = {
  player_id?: string;
  stats?: Record<string, number>;
};

/**
 * Projected fantasy points by player id for one week. Returns an empty map on
 * any failure so callers can fall back to season averages.
 */
export async function getWeekProjections(
  season: string,
  week: number
): Promise<ProjectionMap> {
  const query = POSITIONS.map((p) => `position[]=${p}`).join('&');
  const url = `${PROJECTIONS}/${season}/${week}?season_type=regular&order_by=ppr&${query}`;

  try {
    // No revalidate here on purpose. The response is about 2.8MB, over Next's
    // 2MB data cache ceiling, so asking to cache it logged a failure on every
    // build and cached nothing. The map this returns is a few hundred numbers,
    // so callers cache the result instead of the payload.
    const res = await fetch(url);
    if (!res.ok) return {};
    const rows: RawProjection[] = await res.json();
    if (!Array.isArray(rows)) return {};

    const scoring = league.scoring as Record<string, number>;
    const out: ProjectionMap = {};
    for (const row of rows) {
      const id = row?.player_id;
      if (!id || !row?.stats) continue;
      out[id] = scoreStats(row.stats, scoring);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Season scoring average per roster, the fallback when projections are missing.
 * Weeks with no score are skipped so a bye or a future week does not drag the
 * average down.
 */
export function seasonAverages(
  pointsByWeek: Record<number, Record<number, number>>
): Record<number, number> {
  const totals: Record<number, { sum: number; n: number }> = {};
  for (const week of Object.keys(pointsByWeek)) {
    for (const [rosterId, points] of Object.entries(pointsByWeek[Number(week)])) {
      if (!points) continue;
      const id = Number(rosterId);
      totals[id] ??= { sum: 0, n: 0 };
      totals[id].sum += points;
      totals[id].n += 1;
    }
  }
  const out: Record<number, number> = {};
  for (const [id, { sum, n }] of Object.entries(totals)) {
    out[Number(id)] = n ? Number((sum / n).toFixed(2)) : 0;
  }
  return out;
}

/** Standard deviation of weekly scores, used to shape the odds simulation. */
export function seasonVariance(
  pointsByWeek: Record<number, Record<number, number>>,
  averages: Record<number, number>
): Record<number, number> {
  const spread: Record<number, number[]> = {};
  for (const week of Object.keys(pointsByWeek)) {
    for (const [rosterId, points] of Object.entries(pointsByWeek[Number(week)])) {
      if (!points) continue;
      (spread[Number(rosterId)] ??= []).push(points);
    }
  }
  const out: Record<number, number> = {};
  for (const [id, values] of Object.entries(spread)) {
    const mean = averages[Number(id)] ?? 0;
    // One data point tells us nothing about spread, so assume a league-typical 25.
    if (values.length < 2) {
      out[Number(id)] = 25;
      continue;
    }
    const variance =
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
    out[Number(id)] = Number(Math.sqrt(variance).toFixed(2));
  }
  return out;
}
