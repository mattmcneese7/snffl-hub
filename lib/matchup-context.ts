// Matchup context for the Rag, Brief Section 3.
//
// The packet used to stop at the final scores, so a writer asked for a story
// had nothing to tell one with: no lineup decisions, no near misses, no
// history. It filled the gap from memory, the validator rightly threw those
// numbers out, and the lead pieces went to three line templates. This builds
// the story's raw material from Sleeper's own data, every number computed
// here so the writer can cite it and the validator can check it:
//
//   starters   each starter's points, projection, the gap, and his box score
//   bench      bench players who outscored a starter in a slot they could
//              have filled, and what it cost; whether that cost the game
//   context    records, streaks, where each score ranked that week, and the
//              two teams' earlier meetings this season
//   history    every week's lowest and highest score so far

import { firstNameOf } from '../config/managers.ts';
import { getWeekGames, teamByRoster } from './league.ts';
import { getWeekProjections } from './projections.ts';
import { formatStatLine, getWeekStatLines } from './sleeper-live.ts';
import type { Game, GameSide, LineupSlot, Standing } from './types.ts';

export type StarterFact = { player: string; slot: string; position: string; points: number; projected: number | null; vsProjection: number | null; statLine: string };
export type BenchCall = { benched: string; benchedPosition: string; benchedPoints: number; startedInstead: string; slot: string; startedPoints: number; cost: number };
export type SideContext = {
  team: string;
  manager: string;
  firstName: string;
  points: number;
  projected: number | null;
  record: string;
  streak: string;
  /** Where this score ranked among every team that week, 1 is the highest. */
  weekRank: number;
  starters: StarterFact[];
  bestStarter: StarterFact | null;
  worstStarter: StarterFact | null;
  benchPoints: number;
  benchCalls: BenchCall[];
};
export type MatchupContext = {
  matchupId: number;
  away: SideContext;
  home: SideContext;
  winner: string;
  margin: number;
  /** Decided by under 10 points. */
  close: boolean;
  /** The loser's best bench call was worth more than the margin: he benched the win. */
  benchedTheWin: boolean;
  headToHead: { week: number; winner: string; awayTeam: string; awayPoints: number; homeTeam: string; homePoints: number }[];
};
export type SeasonHistory = { weeklyLows: { week: number; team: string; manager: string; points: number }[]; weeklyHighs: { week: number; team: string; manager: string; points: number }[] };

const round = (n: number) => Number(n.toFixed(2));

/** Which positions may fill a starting slot. */
const ELIGIBLE: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  K: ['K'],
  DEF: ['DEF'],
  FLEX: ['RB', 'WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  REC_FLEX: ['WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
};

/**
 * Bench players who beat a starter they could have replaced, best first. Each
 * starter is used once, so the list is a lineup that could actually have been
 * set, and its total is the most this lineup left on the bench.
 */
function benchCalls(side: GameSide): BenchCall[] {
  const used = new Set<number>();
  const out: BenchCall[] = [];
  const bench = [...(side.bench ?? [])].sort((a, b) => b.points - a.points);
  for (const b of bench) {
    let pick = -1;
    side.lineup.forEach((s, i) => {
      if (used.has(i) || !(ELIGIBLE[s.slot] ?? [s.slot]).includes(b.position) || s.points >= b.points) return;
      if (pick < 0 || s.points < side.lineup[pick].points) pick = i;
    });
    if (pick < 0) continue;
    used.add(pick);
    const s = side.lineup[pick];
    out.push({ benched: b.name, benchedPosition: b.position, benchedPoints: b.points, startedInstead: s.name, slot: s.slot, startedPoints: s.points, cost: round(b.points - s.points) });
  }
  return out.slice(0, 3);
}

type AsOf = { record: string; streak: string };

/**
 * Each team's record and streak as they stood after `week`, from that week's
 * results and every week before it. Today's standings would put a later
 * record into an earlier week's story when an issue is rewritten.
 */
function recordsThrough(weeks: Game[][]): Map<number, AsOf> {
  const runs = new Map<number, ('W' | 'L' | 'T')[]>();
  for (const games of weeks) {
    for (const g of games) {
      if (g.winner == null) continue;
      const tie = g.home.points === g.away.points;
      for (const side of [g.home, g.away]) {
        const r: 'W' | 'L' | 'T' = tie ? 'T' : g.winner === side.rosterId ? 'W' : 'L';
        runs.set(side.rosterId, [...(runs.get(side.rosterId) ?? []), r]);
      }
    }
  }
  const out = new Map<number, AsOf>();
  for (const [id, rs] of runs) {
    const w = rs.filter((r) => r === 'W').length;
    const l = rs.filter((r) => r === 'L').length;
    const t = rs.filter((r) => r === 'T').length;
    const last = rs[rs.length - 1];
    let n = 0;
    for (let i = rs.length - 1; i >= 0 && rs[i] === last; i--) n++;
    out.set(id, { record: `${w}-${l}${t ? `-${t}` : ''}`, streak: last ? `${last}${n}` : '' });
  }
  return out;
}

function sideContext(side: GameSide, rank: number, standing: AsOf | undefined, proj: Record<string, number>, stats: Awaited<ReturnType<typeof getWeekStatLines>>): SideContext {
  const team = teamByRoster(side.rosterId);
  const starters: StarterFact[] = side.lineup.map((s: LineupSlot) => {
    const projected = proj[s.id] != null ? round(proj[s.id]) : null;
    return {
      player: s.name,
      slot: s.slot,
      position: s.position,
      points: s.points,
      projected,
      vsProjection: projected != null ? round(s.points - projected) : null,
      statLine: formatStatLine(s.position, stats[s.id]?.stats),
    };
  });
  const rated = starters.filter((s) => s.vsProjection != null);
  const byGap = [...rated].sort((a, b) => (b.vsProjection ?? 0) - (a.vsProjection ?? 0));
  const projected = rated.length ? round(rated.reduce((n, s) => n + (s.projected ?? 0), 0)) : null;
  return {
    team: team?.teamName ?? side.team,
    manager: team?.manager ?? side.manager,
    firstName: firstNameOf(side.rosterId) ?? side.manager,
    points: side.points,
    projected,
    record: standing?.record ?? '',
    streak: standing?.streak ?? '',
    weekRank: rank,
    starters,
    bestStarter: byGap[0] ?? null,
    worstStarter: byGap.length ? byGap[byGap.length - 1] : null,
    benchPoints: round((side.bench ?? []).reduce((n, b) => n + b.points, 0)),
    benchCalls: benchCalls(side),
  };
}

/** Every played matchup this week with its story material. */
export async function matchupContext(week: number, season: string, games: Game[], standings: Standing[]): Promise<MatchupContext[]> {
  const played = games.filter((g) => g.status !== 'pending');
  const [proj, stats, earlier] = await Promise.all([
    getWeekProjections(season, week).catch(() => ({}) as Record<string, number>),
    getWeekStatLines(season, week, false).catch(() => ({}) as Awaited<ReturnType<typeof getWeekStatLines>>),
    Promise.all(Array.from({ length: Math.max(0, week - 1) }, (_, i) => getWeekGames(i + 1).catch(() => [] as Game[]))),
  ]);
  const scores = played.flatMap((g) => [g.home.points, g.away.points]).sort((a, b) => b - a);
  const rankOf = (pts: number) => scores.indexOf(pts) + 1;
  // Records as of this week, so a rewritten issue never quotes a later one.
  const asOf = recordsThrough([...earlier, played]);
  const standingOf = (id: number) => asOf.get(id) ?? (() => {
    const s = standings.find((x) => x.rosterId === id);
    return s ? { record: `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ''}`, streak: s.streak } : undefined;
  })();
  const nameOf = (id: number) => teamByRoster(id)?.teamName ?? `Team ${id}`;

  return played.map((g) => {
    const away = sideContext(g.away, rankOf(g.away.points), standingOf(g.away.rosterId), proj, stats);
    const home = sideContext(g.home, rankOf(g.home.points), standingOf(g.home.rosterId), proj, stats);
    const homeWon = g.winner === g.home.rosterId;
    const loser = homeWon ? away : home;
    const pair = new Set([g.home.rosterId, g.away.rosterId]);
    const headToHead = earlier
      .flat()
      .filter((x) => pair.has(x.home.rosterId) && pair.has(x.away.rosterId) && x.status === 'final')
      .map((x) => ({ week: x.week, winner: nameOf(x.winner ?? 0), awayTeam: nameOf(x.away.rosterId), awayPoints: x.away.points, homeTeam: nameOf(x.home.rosterId), homePoints: x.home.points }));
    return {
      matchupId: g.matchupId,
      away,
      home,
      winner: (homeWon ? home : away).team,
      margin: g.margin,
      close: g.margin < 10,
      benchedTheWin: (loser.benchCalls[0]?.cost ?? 0) > g.margin,
      headToHead,
    };
  });
}

/** Every finished week's lowest and highest score, by team. */
export function seasonHistory(extremes: { lows: { week: number; rosterId: number; points: number }[]; highs: { week: number; rosterId: number; points: number }[] }): SeasonHistory {
  const row = (x: { week: number; rosterId: number; points: number }) => ({ week: x.week, team: teamByRoster(x.rosterId)?.teamName ?? `Team ${x.rosterId}`, manager: teamByRoster(x.rosterId)?.manager ?? '', points: x.points });
  return { weeklyLows: extremes.lows.map(row), weeklyHighs: extremes.highs.map(row) };
}

/** Every number in the context, in the exact forms a writer may use, for the validator. */
export function contextNumbers(ctx: MatchupContext[], history: SeasonHistory): number[] {
  const out: number[] = [];
  const walk = (v: unknown, key = '') => {
    if (typeof v === 'number') {
      if (key !== 'matchupId') out.push(v);
    } else if (typeof v === 'string') {
      // Box score lines carry their own figures: "26/44, 295 YD, 2 TD".
      if (key === 'statLine' || key === 'record' || key === 'streak') for (const n of v.match(/\d+(?:\.\d+)?/g) ?? []) out.push(Number(n));
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(ctx);
  walk(history);
  return out;
}
