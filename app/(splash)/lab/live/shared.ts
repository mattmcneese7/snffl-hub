import type { LabGame, LabSide, LabStarter } from '../kit/liveFeed';

/**
 * Small readings of a live matchup that the board, the gamecast and its
 * loading state all share. Pure, so they run on either side.
 */

/** Nobody on either side has anything left to play. */
export const isDone = (g: LabGame) => g.away.inPlay + g.away.yetToPlay + g.home.inPlay + g.home.yetToPlay === 0;

/** Starters still able to score: on the field first, then those yet to kick off. */
export const leftToPlay = (side: LabSide): LabStarter[] => [
  ...side.starters.filter((p) => p.gameState === 'in'),
  ...side.starters.filter((p) => p.gameState === 'pre'),
];

/**
 * A side's win chance as printed. Never 100 to 0 while anything is left: the
 * model caps at 99.5 percent, which would round to a certainty it has not
 * earned. Once nothing is left the result is the result.
 */
export function shownPct(g: LabGame, side: 'away' | 'home'): number {
  const raw = Math.round(g[side].winProb * 100);
  return isDone(g) ? raw : Math.min(99, Math.max(1, raw));
}

/** Which side is ahead on points right now, or null when level. */
export function leaderOf(g: LabGame): 'away' | 'home' | null {
  if (g.away.points === g.home.points) return null;
  return g.away.points > g.home.points ? 'away' : 'home';
}

/** How lopsided the game is: 0 a coin flip, 0.5 decided. */
export const lean = (g: LabGame) => Math.abs(g.away.winProb - 0.5);

export function statusOf(g: LabGame): string {
  if (isDone(g)) return 'Final';
  if (g.inPlay) return 'Live';
  const left = g.away.inPlay + g.away.yetToPlay + g.home.inPlay + g.home.yetToPlay;
  const started = g.away.points !== 0 || g.home.points !== 0;
  return started ? `${left} left to play` : 'Not started';
}

const pts = (n: number) => n.toFixed(2);

/** "Puka Nacua", "Puka Nacua and Bijan Robinson", "A, B and C". */
function names(list: LabStarter[]): string {
  const n = list.map((p) => (p.position === 'DEF' ? `the ${p.name} defense` : p.name));
  if (n.length <= 1) return n.join('');
  return `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

/**
 * What it takes, in one sentence from the real numbers: what the side behind
 * on points needs from whoever it has left to pass the leader's expected
 * finish, or how it ended.
 */
export function whatItTakes(g: LabGame): string {
  const a = g.away;
  const h = g.home;
  if (isDone(g)) {
    if (a.points === h.points) return `Final: ${a.firstName} and ${h.firstName} tied at ${pts(a.points)}.`;
    const [win, lose] = a.points > h.points ? [a, h] : [h, a];
    return `Final: ${win.firstName} beat ${lose.firstName} by ${pts(win.points - lose.points)}.`;
  }
  const started = a.points !== 0 || h.points !== 0;
  if (!started) {
    const [fav, dog] = a.expected >= h.expected ? [a, h] : [h, a];
    return `Nobody has played yet. ${fav.firstName} is projected for ${pts(fav.expected)}, ${dog.firstName} for ${pts(dog.expected)}.`;
  }
  const lead = leaderOf(g) ?? (a.expected >= h.expected ? 'away' : 'home');
  const leader = g[lead];
  const trailer = g[lead === 'away' ? 'home' : 'away'];
  const left = leftToPlay(trailer);
  const leaderLeft = leftToPlay(leader).length;
  if (!left.length) {
    return `${trailer.firstName} is done at ${pts(trailer.points)}. ${leader.firstName} leads by ${pts(leader.points - trailer.points)} with ${leaderLeft} left to play.`;
  }
  const need = Math.max(0.01, leader.expected - trailer.points + 0.01);
  const target = leaderLeft ? `${leader.firstName}’s projected ${pts(leader.expected)}` : `${leader.firstName}’s ${pts(leader.points)}`;
  return `${trailer.firstName} needs ${pts(need)} more from ${names(left)} to pass ${target}.`;
}
