import type { BarState } from './data';

/**
 * Home's running order, set by where the league is in its week (Central
 * time). The same modules every week, led by whichever one the moment is
 * about:
 *
 *   recap     Monday night final to Wednesday: the awards, who owes the chug,
 *             the week in 90 seconds, last week's best performers, the Rag
 *   midweek   Wednesday until Thursday kickoff: the Rag leads, the chug film
 *             (or the chug still owed), Squirt's early reads, the latest trade
 *   gameday   a game day with nothing on yet (Sunday morning): Squirt's lineup
 *             reads, the day's NFL slate, the chug deadline at noon
 *   live      games on: every matchup live first, top performers, NFL scores,
 *             the feed's live posts
 *
 * `?at=recap|midweek|gameday|live` shows any of them on any day, for review.
 */
export type Moment = 'recap' | 'midweek' | 'gameday' | 'live';

export type ModuleKey =
  | 'rag'
  | 'hardware'
  | 'film'
  | 'chug'
  | 'scorers'
  | 'matchups'
  | 'nfl'
  | 'squirt'
  | 'trade'
  | 'feed'
  | 'chugs';

const ORDER: Record<Moment, ModuleKey[]> = {
  recap: ['hardware', 'chug', 'film', 'rag', 'scorers', 'matchups', 'feed', 'chugs', 'trade'],
  midweek: ['rag', 'chug', 'film', 'squirt', 'matchups', 'trade', 'hardware', 'feed', 'chugs'],
  gameday: ['squirt', 'chug', 'nfl', 'matchups', 'rag', 'feed', 'trade'],
  live: ['matchups', 'scorers', 'nfl', 'feed', 'squirt', 'rag', 'chug'],
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
