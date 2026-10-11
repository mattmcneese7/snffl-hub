// Loads what the rest of season valuation reads, once per page render.
//
// Split from lib/rest-of-season.ts so the arithmetic there stays pure and can
// be run against fixed inputs, and so the network lives in one place.

import { getNflGames } from './gameday.ts';
import { allPlayers, league, playerOf } from './league.ts';
import { getWeekProjectionDetail } from './projections.ts';
import { LOOK_AHEAD, rosContext, rosRead, type RosContext, type RosRead } from './rest-of-season.ts';
import { getRosters, type SleeperRoster } from './sleeper.ts';
import type { PlayerLite } from './types.ts';

export type RosBoard = {
  ctx: RosContext;
  rosters: SleeperRoster[];
  /** Who owns whom, by player id. */
  ownerOf: Map<string, number>;
  /** Read for any player id, computed once and kept. */
  readOf: (id: string) => RosRead;
  /** Every player in the database nobody has rostered. */
  unrostered: PlayerLite[];
};

export async function loadRosBoard(): Promise<RosBoard> {
  const week = league.state.week;
  const season = league.state.season;
  const weeks = Array.from({ length: LOOK_AHEAD + 1 }, (_, k) => week + k);
  const [rosters, games, ...projections] = await Promise.all([
    getRosters().catch(() => []),
    getNflGames(week, season).catch(() => []),
    ...weeks.map((w) => getWeekProjectionDetail(season, w)),
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
  for (const roster of rosters) {
    for (const id of roster.players ?? []) ownerOf.set(id, roster.roster_id);
  }

  const cache = new Map<string, RosRead>();
  const readOf = (id: string) => {
    let read = cache.get(id);
    if (!read) {
      read = rosRead(playerOf(id), ctx);
      cache.set(id, read);
    }
    return read;
  };

  return {
    ctx,
    rosters,
    ownerOf,
    readOf,
    unrostered: allPlayers().filter((p) => !ownerOf.has(p.id)),
  };
}
