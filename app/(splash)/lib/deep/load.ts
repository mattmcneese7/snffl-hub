// Fetches everything the Insights page reads and hands it to the pure
// functions in insights.ts. Only finished weeks feed the season numbers, so
// a Sunday afternoon never ranks a draft pick on half a game.

import { allPlayers, getWeekGames, league, playerOf, teams } from '@/lib/league';
import { getOwnership } from '@/lib/players';
import { getState } from '@/lib/sleeper';
import { getWeekStatLines } from '@/lib/sleeper-live';
import { nflverse } from './nflverse';
import {
  draftValue,
  luck,
  pickupReturn,
  trendingFreeAgents,
  usageMovers,
  type StartedLine,
  type WeekScore,
} from './insights';
import { getDraftPicks, getMoves, getTrending } from './sleeper';

export type Insights = Awaited<ReturnType<typeof getInsights>>;

export async function getInsights() {
  const state = await getState().catch(() => null);
  const current = Math.max(1, state?.week || league.state.week || 1);
  const allWeeks = Array.from({ length: current }, (_, i) => i + 1);

  const [games, picks, moves, trending, owned] = await Promise.all([
    Promise.all(allWeeks.map((w) => getWeekGames(w).catch(() => []))),
    getDraftPicks(),
    getMoves(current),
    getTrending('add', 24, 50),
    getOwnership(),
  ]);

  // Finished weeks: every game in them final.
  const finals = games.filter((g) => g.length && g.every((x) => x.status === 'final'));
  const finalWeeks = finals.map((g) => g[0].week);
  const throughWeek = finalWeeks.length ? Math.max(...finalWeeks) : 0;

  // Season points on this league's rules, every player, finished weeks only.
  const lines = await Promise.all(finalWeeks.map((w) => getWeekStatLines(league.season, w).catch(() => ({}) as Record<string, { points: number | null }>)));
  const points: Record<string, number> = {};
  for (const week of lines) {
    for (const [id, line] of Object.entries(week)) {
      if (line.points != null) points[id] = (points[id] ?? 0) + line.points;
    }
  }
  const linesComplete = lines.length === finalWeeks.length && lines.every((l) => Object.keys(l).length > 0);

  const pool = allPlayers().map((p) => ({ id: p.id, position: p.position }));
  const draft = finalWeeks.length && linesComplete ? draftValue(picks, points, pool) : { steals: [], busts: [] };

  const lineups: StartedLine[] = finals.flatMap((week) =>
    week.flatMap((g) =>
      [g.home, g.away].map((side) => ({
        week: g.week,
        rosterId: side.rosterId,
        starters: side.lineup.map((s) => ({ playerId: s.id, points: s.points })),
      }))
    )
  );
  const pickups = pickupReturn(moves, lineups);

  const scores: WeekScore[] = finals.flatMap((week) =>
    week.flatMap((g) => [
      { week: g.week, rosterId: g.home.rosterId, points: g.home.points, opponentPoints: g.away.points },
      { week: g.week, rosterId: g.away.rosterId, points: g.away.points, opponentPoints: g.home.points },
    ])
  );

  const known = new Set(pool.map((p) => p.id));
  // getOwnership falls back to the nightly starters when Sleeper does not
  // answer, which would call every bench player a free agent. A full league
  // rosters about 15 a team, so anything near the starter count is that.
  const ownershipComplete = owned.size > teams.length * 10;
  const positionOf = (id: string) => (known.has(id) ? playerOf(id).position : null);

  return {
    throughWeek,
    draft,
    pickups,
    usage: ownershipComplete ? usageMovers(nflverse, owned, positionOf) : null,
    trending: ownershipComplete ? trendingFreeAgents(trending, owned, (id) => known.has(id)) : [],
    luck: luck(scores),
  };
}
