// The read on a player, in the app's voice. Checkpoint 18c.
//
// The same contract Squirt Says keeps: the smartass lives in the templates,
// the numbers are computed. Every line here is chosen by a real statistical
// condition on the model's calibrated distribution and prints the real
// percentage it is talking about, so there is no generated claim to be wrong
// about, only a phrasing wrapped around a number.
//
// Returns null when the model has no read on the player, because a voice with
// nothing behind it is exactly the filler this app refuses.

import type { Outlook } from './outlook.ts';

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** A stable pick from a set of variants, so a player's line does not flicker. */
function pick<T>(seed: string, options: T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return options[Math.abs(h) % options.length];
}

/**
 * One sentence on what kind of week to expect, or null.
 *
 * `seed` is just the player id, used only to keep the phrasing stable between
 * renders. It never changes which condition fires; that is decided by the
 * numbers alone.
 */
export function readOf(outlook: Outlook, seed = ''): string | null {
  if (outlook.source !== 'model' || !outlook.boomBust) return null;
  const { boom, bust } = outlook.boomBust;
  const median = outlook.median ?? outlook.adjusted;

  // Volatile: a real shot at both a smash and a dud.
  if (boom >= 0.3 && bust >= 0.3) {
    return pick(seed, [
      `Coin-flip in cleats: a ${pct(boom)} shot at a smash and a ${pct(bust)} chance he torches your week.`,
      `Boom or bust, no in-between. ${pct(boom)} says hero, ${pct(bust)} says goat.`,
      `Bring a helmet. ${pct(boom)} ceiling week, ${pct(bust)} faceplant, pick your poison.`,
    ]);
  }
  // Safe: rarely craters.
  if (bust <= 0.15) {
    return pick(seed, [
      `Boring is beautiful. Only ${pct(bust)} chance of a dud, start him and forget him.`,
      `About as safe as this gets, ${pct(bust)} bust odds. Set it and move on.`,
      `The floor is a mattress here, ${pct(bust)} chance he lets you down.`,
    ]);
  }
  // Ceiling play: the upside is real, the floor is not.
  if (boom >= 0.28) {
    return pick(seed, [
      `Swing for the fences: ${pct(boom)} shot at a week-winner, but he can vanish.`,
      `Upside merchant. ${pct(boom)} chance of a big one, just do not count on it.`,
    ]);
  }
  // Trap: little chance of the game you actually need.
  if (boom <= 0.15) {
    return pick(seed, [
      `Fine, not exciting. Only a ${pct(boom)} shot at the game you need him to have.`,
      `A body in the lineup. ${pct(boom)} chance he actually wins you anything.`,
    ]);
  }
  // Ordinary: he is what he is.
  return pick(seed, [
    `Is what he is: about ${median.toFixed(0)} points, not much drama either way.`,
    `Steady, unspectacular, roughly ${median.toFixed(0)}. You know the guy.`,
  ]);
}
