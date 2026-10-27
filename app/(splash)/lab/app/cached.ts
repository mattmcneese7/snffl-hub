import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getNflGames } from '@/lib/gameday';
import { allPlayers, league, playerOf } from '@/lib/league';
import { getWeekProjectionDetail, type ProjectionDetail, type ProjectionMap } from '@/lib/projections';
import { LOOK_AHEAD, rosContext, rosRead, type RosRead } from '@/lib/rest-of-season';
import type { RosBoard } from '@/lib/ros-load';
import { getRosters } from '@/lib/sleeper';
import { getTrophyBoard } from '@/lib/trophies';

/**
 * The slow reads 4.0 pages share, cached where the lib cannot cache itself.
 *
 * Sleeper's weekly projections come back as one 2.8MB payload, over Next's
 * 2MB data cache ceiling, so lib/projections fetches it fresh every call and
 * leaves caching the result to callers. Nobody did: Swami's rest of season
 * board pulled it for three weeks on every cold request. The scored map is a
 * small fraction of that, so it is cached here for ten minutes. Sleeper
 * updates projections a few times a day, so ten minutes costs nothing.
 *
 * lib stays untouched because the scripts in .github import it outside Next.
 */
const projectionDetailCached = unstable_cache(
  async (season: string, week: number): Promise<ProjectionDetail> => {
    const detail = await getWeekProjectionDetail(season, week);
    // The lib answers a failed read with an empty map. Throwing keeps that
    // out of the cache, so the next request tries Sleeper again.
    if (!Object.keys(detail).length) throw new Error(`No projections for ${season} week ${week}`);
    return detail;
  },
  ['v4-projection-detail'],
  { revalidate: 600 },
);

/** Projection detail for a week: points, whether a game was projected, the injury tag. Empty when Sleeper has none. */
export const projectionDetail = cache((season: string, week: number): Promise<ProjectionDetail> => projectionDetailCached(season, week).catch(() => ({})));

/** Projected points by player id for a week, the same map lib/projections returns. */
export const weekProjections = cache(async (season: string, week: number): Promise<ProjectionMap> => {
  const out: ProjectionMap = {};
  for (const [id, row] of Object.entries(await projectionDetail(season, week))) out[id] = row.points;
  return out;
});

/**
 * lib/ros-load's rest of season board, built from the cached projections.
 * Same inputs, same arithmetic, once per request.
 */
export const rosBoard = cache(async (): Promise<RosBoard> => {
  const week = league.state.week;
  const season = league.state.season;
  const weeks = Array.from({ length: LOOK_AHEAD + 1 }, (_, k) => week + k);
  const [rosters, games, ...projections] = await Promise.all([
    getRosters().catch(() => []),
    getNflGames(week, season).catch(() => []),
    ...weeks.map((w) => projectionDetail(season, w)),
  ]);
  const sleeper = Object.fromEntries(weeks.map((w, i) => [w, projections[i]]));
  const started = new Set<string>();
  for (const game of games) {
    if (game.state === 'pre') continue;
    started.add(game.home.abbr);
    started.add(game.away.abbr);
  }
  const ctx = rosContext({ week, sleeper, started });
  const ownerOf = new Map<string, number>();
  for (const roster of rosters) for (const id of roster.players ?? []) ownerOf.set(id, roster.roster_id);
  const reads = new Map<string, RosRead>();
  const readOf = (id: string) => {
    let read = reads.get(id);
    if (!read) {
      read = rosRead(playerOf(id), ctx);
      reads.set(id, read);
    }
    return read;
  };
  return { ctx, rosters, ownerOf, readOf, unrostered: allPlayers().filter((p) => !ownerOf.has(p.id)) };
});

/** The trophy board, once per request however many modules read it (Home reads it three times). */
export const trophyBoard = cache(() => getTrophyBoard());
