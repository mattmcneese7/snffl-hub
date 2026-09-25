// C'mon Man, Brief Section 2: the week's bad decisions, called out once they
// are actually decisions rather than guesses.
//
// Nothing fires while a player can still score. Every call waits for the NFL
// game involved to be final, so "you benched him" cannot be published in the
// second quarter and then be wrong by dinner. Three calls:
//
//   bench blunder   a benched player eligible for that slot beat the starter
//                   by a wide margin, both games final
//   ghost starter   a starter finished on nothing at all
//   the lost win    at week's end, the best lineup available would have won a
//                   game that was lost
//
// Each is keyed so it posts once however many times the watcher runs.

import { firstNameOf } from '../config/managers.ts';
import { gamesByTeam, type NflGame } from './gameday.ts';
import { STARTER_SLOTS } from './league.ts';
import type { NewPost } from './live.ts';
import type { Game, GameSide, LineupSlot } from './types.ts';

/** A bench player has to be eligible for the slot before it is a blunder. */
const FLEX_POSITIONS = new Set(['RB', 'WR', 'TE']);
const eligible = (slot: string, position: string) =>
  slot === position || (slot === 'FLEX' && FLEX_POSITIONS.has(position));

/** Points a bench player must beat a starter by before it is worth saying. */
const BLUNDER_MARGIN = 10;
/** At or under this, a starter contributed nothing worth the slot. */
const GHOST_POINTS = 2;

type Ctx = { nfl: NflGame[]; week: number; managerOf: Map<number, string> };

const isFinal = (byTeam: Map<string, { game: NflGame }>, player: LineupSlot) => {
  const entry = player.team ? byTeam.get(player.team) : undefined;
  return entry ? entry.game.state === 'post' : false;
};

const nameOf = (rosterId: number, ctx: Ctx, side: GameSide) =>
  ctx.managerOf.get(rosterId) ?? firstNameOf(rosterId) ?? side.manager;

/** The best score available from a side's whole roster, slot by slot. */
export function optimalPoints(side: GameSide): { points: number; lineup: LineupSlot[] } {
  const pool = [...side.lineup, ...(side.bench ?? [])];
  const used = new Set<string>();
  const lineup: LineupSlot[] = [];
  // Fixed slots first, then FLEX, so a flex eligible star is not spent on a
  // slot a specialist could fill.
  const order = [...STARTER_SLOTS].sort((a, b) => Number(a === 'FLEX') - Number(b === 'FLEX'));
  for (const slot of order) {
    const best = pool
      .filter((p) => !used.has(p.id) && eligible(slot, p.position))
      .sort((a, b) => b.points - a.points)[0];
    if (!best) continue;
    used.add(best.id);
    lineup.push({ ...best, slot });
  }
  return { points: Number(lineup.reduce((sum, p) => sum + p.points, 0).toFixed(2)), lineup };
}

/**
 * Calls for one side. `final` marks a week whose games are all over, which is
 * the only time the lost win can be judged.
 */
function callsFor(side: GameSide, opponent: GameSide, ctx: Ctx, weekFinal: boolean): NewPost[] {
  const byTeam = gamesByTeam(ctx.nfl);
  const who = nameOf(side.rosterId, ctx, side);
  const out: NewPost[] = [];
  const bench = (side.bench ?? []).filter((p) => isFinal(byTeam, p));

  for (const starter of side.lineup) {
    if (!isFinal(byTeam, starter)) continue;

    const better = bench
      .filter((p) => eligible(starter.slot, p.position))
      .sort((a, b) => b.points - a.points)[0];

    if (better && better.points - starter.points >= BLUNDER_MARGIN) {
      out.push({
        week: ctx.week,
        kind: 'cmon-man',
        title: `C'mon Man, ${who}`,
        body: `${better.name} put up ${better.points.toFixed(2)} on your bench while ${starter.name} gave you ${starter.points.toFixed(2)} at ${starter.slot}.`,
        team_ids: [side.rosterId],
        player_ids: [better.id, starter.id],
        payload: {
          call: 'bench',
          roster_id: side.rosterId,
          starter_id: starter.id,
          bench_id: better.id,
          swing: Number((better.points - starter.points).toFixed(2)),
        },
      });
      continue;
    }

    if (starter.points <= GHOST_POINTS) {
      out.push({
        week: ctx.week,
        kind: 'cmon-man',
        title: `C'mon Man, ${who}`,
        body: `${starter.name} finished with ${starter.points.toFixed(2)} in your ${starter.slot}. That is a slot, not a hospice.`,
        team_ids: [side.rosterId],
        player_ids: [starter.id],
        payload: { call: 'ghost', roster_id: side.rosterId, starter_id: starter.id, points: starter.points },
      });
    }
  }

  // The one that stings: the bench had the win in it.
  if (weekFinal && side.points < opponent.points) {
    const best = optimalPoints(side);
    if (best.points > opponent.points) {
      out.push({
        week: ctx.week,
        kind: 'cmon-man',
        title: `C'mon Man, ${who}`,
        body: `Your best lineup scored ${best.points.toFixed(2)} and you started ${side.points.toFixed(2)}. ${opponent.points.toFixed(2)} would have lost to it. You beat yourself.`,
        team_ids: [side.rosterId],
        player_ids: null,
        payload: { call: 'lost-win', roster_id: side.rosterId, optimal: best.points, actual: side.points },
      });
    }
  }
  return out;
}

/**
 * Every call worth making across a week, worst first.
 *
 * One call of each kind per manager per week. The raw detections repeat: a
 * 22 point bench receiver beats three different starters, and posting all
 * three would bury the Feed in one man's Sunday. Only the worst survives.
 */
export function cmonManPosts(games: Game[], ctx: Ctx): NewPost[] {
  const raw: NewPost[] = [];
  for (const game of games) {
    const weekFinal = game.status === 'final';
    raw.push(...callsFor(game.away, game.home, ctx, weekFinal));
    raw.push(...callsFor(game.home, game.away, ctx, weekFinal));
  }

  const worst = new Map<string, NewPost>();
  const severity = (post: NewPost) => {
    const p = post.payload ?? {};
    if (p.call === 'bench') return Number(p.swing ?? 0);
    if (p.call === 'ghost') return GHOST_POINTS + 1 - Number(p.points ?? 0);
    return Number(p.optimal ?? 0) - Number(p.actual ?? 0);
  };
  for (const post of raw) {
    const key = `${post.payload?.roster_id}:${post.payload?.call}`;
    const held = worst.get(key);
    if (!held || severity(post) > severity(held)) worst.set(key, post);
  }
  // The lost win outranks everything, then the biggest bench swing.
  const rank = (post: NewPost) => (post.payload?.call === 'lost-win' ? 1000 : severity(post));
  return [...worst.values()].sort((a, b) => rank(b) - rank(a));
}

/** The key that makes each call unique, so it posts once. */
export function cmonDedupeKey(post: NewPost): string | null {
  const p = post.payload ?? {};
  if (p.call === 'bench') return `cmon:${post.week}:${p.roster_id}:${p.starter_id}:${p.bench_id}`;
  if (p.call === 'ghost') return `cmon:${post.week}:${p.roster_id}:ghost:${p.starter_id}`;
  if (p.call === 'lost-win') return `cmon:${post.week}:${p.roster_id}:lost-win`;
  return null;
}
