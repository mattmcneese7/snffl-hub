// Squirt Says, Checkpoint 12c.
//
// C'mon Man judges a week once it cannot change. This is the same arithmetic
// run forwards, before kickoff, when the manager can still do something about
// it. Every saying is a real number with a sentence wrapped around it, and the
// number is always shown, so nobody has to take the oracle's word for it.
//
// Four verdicts per lineup, none of them guesses about football:
//
//   bench        a bench player projected well above the starter in a slot he
//                is eligible for, which is a C'mon Man that has not happened
//   sit          a starter who is Out or Doubtful and still in the lineup
//   ceiling      the widest gap between a starter's ceiling and his projection
//   trap         a starter in the lowest scoring game on the slate
//
// The voice is written here rather than by Claude. It has to be true every
// time and it is built from the numbers, so a writer and a validation pass
// would cost money to arrive at the same sentence.

import { dsWeekly } from './draftsharks.ts';
import { STARTER_SLOTS } from './league.ts';
import type { GameSide, LineupSlot } from './types.ts';

const FLEX_POSITIONS = new Set(['RB', 'WR', 'TE']);
const eligible = (slot: string, position: string) =>
  slot === position || (slot === 'FLEX' && FLEX_POSITIONS.has(position));

/** Projected points a bench player must beat a starter by before it is said. */
const BENCH_MARGIN = 3;
/** A ceiling this far above the projection is a swing worth naming. */
const CEILING_GAP = 10;
/**
 * A floor this high is a slot he can stop thinking about. Quarterbacks are
 * left out of it: they hold the highest floors in every lineup, so a lock
 * verdict that allowed them was fourteen managers being told about their
 * quarterback.
 */
const LOCK_FLOOR = 12;
const LOCK_SKIP = new Set(['QB', 'DEF', 'K']);
/** A starting slot projected at or under this is a hole, not a plan. */
const THIN_POINTS = 6;
/** Designations that mean he should not be in a lineup. */
const SITTING = new Set(['Out', 'Doubtful', 'IR', 'Sus', 'PUP', 'NA', 'DNR']);

export type VerdictKind = 'bench' | 'sit' | 'ceiling' | 'trap' | 'lock' | 'thin' | 'top';

export type Verdict = {
  kind: VerdictKind;
  rosterId: number;
  /** The manager's first name, for the copy. */
  manager: string;
  /** What Squirt says. One sentence, always true, always numbered. */
  saying: string;
  /** The player it is about, and the one it would swap in. */
  player: LineupSlot;
  other?: LineupSlot;
  /** How much is at stake, in projected points. */
  swing: number;
};

export type OracleInput = {
  /** Projected points for a player this week, from Sleeper. */
  projectionOf: (playerId: string) => number | null;
  /** Sleeper's designation: Out, Questionable and so on. */
  injuryOf: (playerId: string) => string | null;
  /** The total points the book expects in a player's NFL game. */
  gameTotalOf: (team: string | null) => number | null;
  week: number;
};

const money = (n: number) => n.toFixed(1);
const named = (player: LineupSlot) => player.short || player.name;

/**
 * Which phrasing a saying takes, decided by the player and the week rather
 * than at random, so the same board reads the same on every render and two
 * managers rarely get the same sentence in the same week. Written out here
 * because one sentence repeated fourteen times is a template, not a voice.
 */
function pick<T>(options: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return options[hash % options.length];
}

/** The projection to use: Sleeper's, falling back to DraftSharks'. */
function projected(player: LineupSlot, input: OracleInput): number | null {
  const sleeper = input.projectionOf(player.id);
  if (sleeper != null) return sleeper;
  return dsWeekly(player.id)?.projection ?? null;
}

function benchVerdict(side: GameSide, manager: string, input: OracleInput): Verdict | null {
  const bench = side.bench ?? [];
  if (!bench.length) return null;

  let best: { starter: LineupSlot; sub: LineupSlot; gap: number } | null = null;
  for (const starter of side.lineup) {
    if (!STARTER_SLOTS.includes(starter.slot)) continue;
    const starterPoints = projected(starter, input);
    if (starterPoints == null) continue;
    for (const sub of bench) {
      if (!eligible(starter.slot, sub.position)) continue;
      // A bench player who is himself hurt is not the answer to anything.
      if (SITTING.has(input.injuryOf(sub.id) ?? '')) continue;
      const subPoints = projected(sub, input);
      if (subPoints == null) continue;
      const gap = subPoints - starterPoints;
      if (gap >= BENCH_MARGIN && (!best || gap > best.gap)) best = { starter, sub, gap };
    }
  }
  if (!best) return null;

  return {
    kind: 'bench',
    rosterId: side.rosterId,
    manager,
    saying: pick(
      [
        `${manager} starts ${named(best.starter)} while ${named(best.sub)} sits, and that is ${money(best.gap)} points given away before anybody has played.`,
        `The bench is not a waiting room. ${named(best.sub)} projects ${money(best.gap)} above ${named(best.starter)}, and ${manager} has him sitting.`,
        `${manager} will explain on Monday why ${named(best.sub)} watched ${named(best.starter)} take ${money(best.gap)} fewer points.`,
      ],
      `${best.sub.id}:${input.week}`
    ),
    player: best.starter,
    other: best.sub,
    swing: Number(best.gap.toFixed(2)),
  };
}

function sitVerdict(side: GameSide, manager: string, input: OracleInput): Verdict | null {
  for (const starter of side.lineup) {
    const status = input.injuryOf(starter.id);
    if (!status || !SITTING.has(status)) continue;
    const points = projected(starter, input) ?? 0;
    return {
      kind: 'sit',
      rosterId: side.rosterId,
      manager,
      saying: pick(
        [
          `${named(starter)} is listed ${status.toUpperCase()} and is still in ${manager}'s lineup. A slot spent on a man who is not playing scores exactly nothing.`,
          `${manager} is starting ${named(starter)}, who is ${status.toUpperCase()}. The wise man reads the injury report before kickoff, not after.`,
          `No projection saves a starter who is ${status.toUpperCase()}. ${named(starter)} is still in ${manager}'s lineup all the same.`,
        ],
        `${starter.id}:${input.week}`
      ),
      player: starter,
      swing: Number(points.toFixed(2)),
    };
  }
  return null;
}

function ceilingVerdict(side: GameSide, manager: string, input: OracleInput): Verdict | null {
  let best: { player: LineupSlot; gap: number; ceiling: number } | null = null;
  for (const starter of side.lineup) {
    const row = dsWeekly(starter.id);
    const ceiling = row?.ceiling ?? null;
    const projection = projected(starter, input);
    if (ceiling == null || projection == null) continue;
    const gap = ceiling - projection;
    if (gap >= CEILING_GAP && (!best || gap > best.gap)) best = { player: starter, gap, ceiling };
  }
  if (!best) return null;

  return {
    kind: 'ceiling',
    rosterId: side.rosterId,
    manager,
    saying: pick(
      [
        `${named(best.player)} carries ${manager}'s week: ${money(best.ceiling)} at his ceiling, ${money(best.gap)} above what anybody expects of him.`,
        `${manager} has ${money(best.gap)} points of daylight riding on ${named(best.player)}, who tops out at ${money(best.ceiling)}.`,
        `Ask ${named(best.player)} for ${money(best.ceiling)} and he may give it. ${manager}'s week is ${money(best.gap)} points wide either way.`,
      ],
      `${best.player.id}:${input.week}`
    ),
    player: best.player,
    swing: Number(best.gap.toFixed(2)),
  };
}

function trapVerdict(side: GameSide, manager: string, input: OracleInput): Verdict | null {
  let worst: { player: LineupSlot; total: number } | null = null;
  for (const starter of side.lineup) {
    if (starter.position === 'DEF') continue;
    const total = input.gameTotalOf(starter.team ?? null);
    if (total == null) continue;
    if (!worst || total < worst.total) worst = { player: starter, total };
  }
  // Only worth saying when the game really is expected to be quiet.
  if (!worst || worst.total > 41) return null;

  return {
    kind: 'trap',
    rosterId: side.rosterId,
    manager,
    saying: pick(
      [
        `${named(worst.player)} plays the quietest game on the board, ${money(worst.total)} points expected between both teams. There are only so many to go round.`,
        `${manager} is asking ${named(worst.player)} to feed from a table set for ${money(worst.total)}. Nobody leaves that one full.`,
        `The book expects ${money(worst.total)} points in ${named(worst.player)}'s game. ${manager} needs some of them.`,
      ],
      `${worst.player.id}:${input.week}`
    ),
    player: worst.player,
    swing: Number((45 - worst.total).toFixed(2)),
  };
}

function lockVerdict(side: GameSide, manager: string, input: OracleInput): Verdict | null {
  let best: { player: LineupSlot; floor: number } | null = null;
  for (const starter of side.lineup) {
    if (LOCK_SKIP.has(starter.position)) continue;
    const floor = dsWeekly(starter.id)?.floor ?? null;
    if (floor == null || floor < LOCK_FLOOR) continue;
    if (!best || floor > best.floor) best = { player: starter, floor };
  }
  if (!best) return null;

  return {
    kind: 'lock',
    rosterId: side.rosterId,
    manager,
    saying: pick(
      [
        `${named(best.player)} floors at ${money(best.floor)}, the steadiest number in ${manager}'s lineup. That is a slot he can stop thinking about.`,
        `${manager} gets ${money(best.floor)} from ${named(best.player)} even in the bad version of Sunday. Worry about the other eight.`,
        `Everything in ${manager}'s week is weather except ${named(best.player)}, whose floor is ${money(best.floor)}.`,
      ],
      `${best.player.id}:${input.week}`
    ),
    player: best.player,
    swing: Number(best.floor.toFixed(2)),
  };
}

function thinVerdict(side: GameSide, manager: string, input: OracleInput): Verdict | null {
  let worst: { player: LineupSlot; points: number } | null = null;
  for (const starter of side.lineup) {
    if (starter.position === 'DEF' || starter.position === 'K') continue;
    const points = projected(starter, input);
    if (points == null || points > THIN_POINTS) continue;
    if (!worst || points < worst.points) worst = { player: starter, points };
  }
  if (!worst) return null;

  return {
    kind: 'thin',
    rosterId: side.rosterId,
    manager,
    saying: pick(
      [
        `${manager} is starting ${named(worst.player)} for ${money(worst.points)} projected points, which is not a plan so much as a hole with a name on it.`,
        `Somebody has to fill the slot. ${manager} filled it with ${named(worst.player)} and ${money(worst.points)} points.`,
        `${money(worst.points)} projected from ${named(worst.player)}. ${manager} is playing this week a man short and knows it.`,
      ],
      `${worst.player.id}:${input.week}`
    ),
    player: worst.player,
    swing: Number((THIN_POINTS - worst.points).toFixed(2)),
  };
}

/**
 * The last resort, so nobody is left off the board. A lineup with no mistake
 * in it, no hole, no quiet game and no obvious swing still has a best player,
 * and the presentation rule is that all fourteen managers appear.
 */
function topVerdict(side: GameSide, manager: string, input: OracleInput): Verdict | null {
  let best: { player: LineupSlot; points: number } | null = null;
  for (const starter of side.lineup) {
    const points = projected(starter, input);
    if (points == null) continue;
    if (!best || points > best.points) best = { player: starter, points };
  }
  if (!best) return null;

  return {
    kind: 'top',
    rosterId: side.rosterId,
    manager,
    saying: pick(
      [
        `${manager} leans on ${named(best.player)} for ${money(best.points)}. There is no trick to the rest of it.`,
        `Nothing in ${manager}'s lineup needs fixing, which leaves ${named(best.player)} and his ${money(best.points)} to decide it.`,
        `${named(best.player)} is ${manager}'s biggest number at ${money(best.points)}. The week follows him.`,
      ],
      `${best.player.id}:${input.week}`
    ),
    player: best.player,
    swing: Number(best.points.toFixed(2)),
  };
}

/** Everything Squirt has to say about one lineup, worst first. */
export function verdictsFor(side: GameSide, manager: string, input: OracleInput): Verdict[] {
  return [
    sitVerdict(side, manager, input),
    benchVerdict(side, manager, input),
    thinVerdict(side, manager, input),
    ceilingVerdict(side, manager, input),
    lockVerdict(side, manager, input),
    trapVerdict(side, manager, input),
    topVerdict(side, manager, input),
  ].filter((verdict): verdict is Verdict => Boolean(verdict));
}

/**
 * The league's sayings for the week, the most consequential first, and at most
 * one per manager so the board is not four verdicts about the same lineup.
 */
export function leagueVerdicts(
  sides: { side: GameSide; manager: string }[],
  input: OracleInput
): Verdict[] {
  const best = new Map<number, Verdict>();
  // What is worth saying first: a mistake he can still fix, then a hole, then
  // the shape of his week.
  const rank: Record<VerdictKind, number> = { sit: 6, bench: 5, thin: 4, trap: 3, ceiling: 2, lock: 1, top: 0 };
  for (const entry of sides) {
    for (const verdict of verdictsFor(entry.side, entry.manager, input)) {
      const held = best.get(verdict.rosterId);
      if (!held || rank[verdict.kind] > rank[held.kind] || (rank[verdict.kind] === rank[held.kind] && verdict.swing > held.swing)) {
        best.set(verdict.rosterId, verdict);
      }
    }
  }
  return [...best.values()].sort(
    (a, b) => rank[b.kind] - rank[a.kind] || b.swing - a.swing
  );
}

/**
 * The oracle's inputs, gathered once. Projections come from Sleeper, ranges
 * from DraftSharks and the game totals from the book through ESPN, which is
 * the same set the matchup model uses, so the two never disagree on screen.
 */
export async function oracleFor(week: number): Promise<{
  input: OracleInput;
  sides: { side: GameSide; manager: string }[];
}> {
  const [{ getNflGames, getSlateLines, toSleeperTeam }, { getWeekGames, league }, { getWeekProjectionLines }, { firstNameOf }] =
    await Promise.all([
      import('./gameday.ts'),
      import('./league.ts'),
      import('./sleeper-live.ts'),
      import('../config/managers.ts'),
    ]);

  const [games, nfl] = await Promise.all([getWeekGames(week), getNflGames(week, league.season)]);
  const [projections, lines] = await Promise.all([
    getWeekProjectionLines(league.season, week),
    getSlateLines(nfl),
  ]);

  const totalOf = new Map<string, number>();
  for (const game of nfl) {
    const total = lines[game.id]?.overUnder ?? null;
    if (total == null) continue;
    totalOf.set(toSleeperTeam(game.home.abbr), total);
    totalOf.set(toSleeperTeam(game.away.abbr), total);
  }

  return {
    input: {
      projectionOf: (id) => {
        const points = projections[id]?.stats.pts_ppr;
        return points == null ? null : Number(points);
      },
      injuryOf: (id) => projections[id]?.injury ?? null,
      gameTotalOf: (team) => (team ? (totalOf.get(team) ?? null) : null),
      week,
    },
    sides: games
      .flatMap((game) => [game.home, game.away])
      .map((side) => ({ side, manager: firstNameOf(side.rosterId) ?? side.manager })),
  };
}
