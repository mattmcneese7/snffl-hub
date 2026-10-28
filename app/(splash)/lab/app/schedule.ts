import type { BarState } from './data';

/**
 * Home's running order, set by where the league is in its week (Central
 * time). Only the modules Matt approved, each in its moment:
 *
 *   recap     Monday night final to Wednesday: the week's awards, Pick'em,
 *             the Rag, every final, and the week in 90 seconds
 *   midweek   Wednesday until Thursday kickoff: the Rag leads, Pick'em before
 *             the lock, every matchup's projection
 *   gameday   a game day with nothing on yet: every matchup and kickoff,
 *             Pick'em, the Rag compact
 *   live      games on: every matchup live, the Rag compact; scoring plays
 *             come through the score bar
 *
 * `?at=recap|midweek|gameday|live` shows any of them on any day, for review.
 */
export type Moment = 'recap' | 'midweek' | 'gameday' | 'live';

// Pick'em took the chug row's slot (Matt, 2026-10-27); the chug keeps its page and pop.
export type ModuleKey = 'awards' | 'pickem' | 'rag' | 'ragCompact' | 'matchups' | 'story';

const ORDER: Record<Moment, ModuleKey[]> = {
  recap: ['awards', 'pickem', 'rag', 'matchups', 'story'],
  midweek: ['rag', 'pickem', 'matchups'],
  gameday: ['matchups', 'pickem', 'ragCompact'],
  live: ['matchups', 'ragCompact'],
};

const MOMENTS: Moment[] = ['recap', 'midweek', 'gameday', 'live'];

export function momentOf(state: BarState, inPlay: boolean, asked?: string): Moment {
  if (asked && (MOMENTS as string[]).includes(asked)) return asked as Moment;
  if (state === 'final') return 'recap';
  if (state === 'preview') return 'midweek';
  return inPlay ? 'live' : 'gameday';
}

export function orderOf(moment: Moment): ModuleKey[] {
  return ORDER[moment];
}
