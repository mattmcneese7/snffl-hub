// The Swami, Checkpoint 15.
//
// Squirt Says judges one lineup: bench this man, he is projected under the one
// sat behind him. This reads the game the lineup is in. Who actually decides
// it, what the losing side still needs, and which starters are walking into
// something soft or something hard.
//
// It inherits the rule that makes Squirt Says worth reading: every claim is a
// real number and the number is on screen. "Aaron needs a big game from Gibbs"
// is a horoscope. "Aaron is 7.2 behind with Gibbs and Njigba yet to play, and
// those two at their eightieth percentile are worth 9.1 between them" is a
// statement somebody can check and disagree with.
//
// Nothing here is written by Claude. It is arithmetic over numbers the app
// already has, which is why it can run on every matchup, every week, for
// nothing, and why it cannot say something untrue.

import { dvpFor, dvpConfidence, type Pos } from './spine.ts';
import type { LiveMatchup, LivePlayer, LiveSide } from './matchup-live.ts';

/**
 * The lift a good game is worth, as a share of a player's spread.
 *
 * 0.84 standard deviations is the eightieth percentile of a normal, which is
 * "he played well" rather than "everything broke his way". Using the ceiling
 * instead would let any deficit be closed on paper and the path would always
 * exist, which would make it worthless.
 */
const GOOD_GAME = 0.84;

export type SwingPlayer = {
  player: LivePlayer;
  manager: string;
  rosterId: number;
  /** Points of outcome still hanging on him. */
  leverage: number;
  matchup: { opponent: string; label: 'soft' | 'even' | 'hard'; rank: number } | null;
};

export type SwamiRead = {
  /** Null when the game is over, or too close to call a favourite. */
  favourite: { rosterId: number; manager: string; team: string } | null;
  underdog: { rosterId: number; manager: string; team: string } | null;
  /** Expected points between them, favourite first. */
  margin: number;
  winProb: number;
  /** Who still decides it, most leverage first. */
  swing: SwingPlayer[];
  /** What the underdog needs, or null when nothing realistic gets there. */
  path: { need: number; players: LivePlayer[]; upside: number } | null;
  /** Starters walking into a defence worth naming, either way. */
  edges: SwingPlayer[];
  confidence: ReturnType<typeof dvpConfidence>;
  /** Nothing left to play, so nothing left to say. */
  settled: boolean;
};

const isPos = (p: string): p is Pos => ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p);

function matchupOf(player: LivePlayer) {
  const opponent = player.nfl?.opponent?.abbr;
  if (!opponent || !isPos(player.position)) return null;
  const entry = dvpFor(opponent, player.position);
  if (!entry) return null;
  const label = entry.vsAverage > 1.05 ? 'soft' : entry.vsAverage < 0.95 ? 'hard' : 'even';
  return { opponent, label: label as 'soft' | 'even' | 'hard', rank: entry.rank };
}

/**
 * How much of the result is still in a player's hands.
 *
 * His spread times the share of his game left to play. Somebody who has
 * finished cannot swing anything however wide his range was, and somebody on
 * a bye is not in the game at all. This is why the answer changes through a
 * Sunday rather than being a preview that goes stale at one o'clock.
 */
const leverageOf = (player: LivePlayer) => player.sd * player.remaining;

function describe(side: LiveSide) {
  return { rosterId: side.rosterId, manager: side.manager, team: side.team };
}

/**
 * What the underdog needs, as the shortest list of players that gets there.
 *
 * Greedy by upside, which is the honest reading: the question is not "can any
 * combination cover this" but "who has to play well". A gap no combination of
 * good games closes returns null rather than a list nobody could deliver,
 * because "he needs all nine of them at their best" is a loss, not a path.
 */
function pathFor(side: LiveSide, need: number) {
  if (need <= 0) return null;
  const live = side.lineup
    .filter((p) => p.remaining > 0)
    .map((p) => ({ player: p, upside: p.sd * GOOD_GAME * p.remaining }))
    .filter((p) => p.upside > 0)
    .sort((a, b) => b.upside - a.upside);

  const players: LivePlayer[] = [];
  let upside = 0;
  for (const entry of live) {
    players.push(entry.player);
    upside += entry.upside;
    if (upside >= need) {
      return { need: Number(need.toFixed(1)), players, upside: Number(upside.toFixed(1)) };
    }
    // Past four names it stops being a path and starts being a prayer.
    if (players.length >= 4) break;
  }
  return null;
}

export function swamiRead(live: LiveMatchup): SwamiRead {
  const confidence = dvpConfidence();
  const sides = [live.home, live.away];
  const [ahead, behind] = sides[0].expected >= sides[1].expected ? sides : [sides[1], sides[0]];
  const margin = Number((ahead.expected - behind.expected).toFixed(1));
  const settled = sides.every((s) => s.lineup.every((p) => p.remaining <= 0));

  const all: SwingPlayer[] = sides.flatMap((side) =>
    side.lineup.map((player) => ({
      player,
      manager: side.manager,
      rosterId: side.rosterId,
      leverage: leverageOf(player),
      matchup: matchupOf(player),
    }))
  );

  const swing = all
    .filter((s) => s.leverage > 0)
    .sort((a, b) => b.leverage - a.leverage)
    .slice(0, 3);

  // Only spots worth naming, and only for players who can still use them.
  const edges = all
    .filter((s) => s.player.remaining > 0 && s.matchup && s.matchup.label !== 'even')
    .sort((a, b) => (b.player.projected ?? 0) - (a.player.projected ?? 0))
    .slice(0, 4);

  return {
    favourite: settled ? null : describe(ahead),
    underdog: settled ? null : describe(behind),
    margin,
    winProb: ahead.winProb,
    swing,
    path: settled ? null : pathFor(behind, margin),
    edges,
    confidence,
    settled,
  };
}

/**
 * The read as one sentence, for a list where a whole panel will not fit.
 *
 * Returns null rather than filler when there is nothing true and interesting
 * to say, which a caller should render as nothing at all.
 */
export function swamiLine(read: SwamiRead): string | null {
  if (read.settled || !read.underdog || !read.favourite) return null;
  if (read.margin < 1) {
    return `Level, with ${read.swing.length ? read.swing[0].player.short : 'the bench'} carrying the most of it.`;
  }
  if (read.path) {
    const names = read.path.players.map((p) => p.short || p.name).join(' and ');
    return `${read.underdog.manager} is ${read.margin} behind and needs ${names}, worth ${read.path.upside} between them on a good day.`;
  }
  return `${read.favourite.manager} is ${read.margin} clear with nothing left on the other side big enough to catch it.`;
}
