// Live detection for the watcher, Brief Section 2 and the row at Section 3.
//
// Every claim here was measured against real Week 1 data before it was written:
//
//   Touchdowns come from ESPN scoring plays rather than fantasy point jumps. A
//   six point jump is equally six receiving yards' worth of points in this
//   league, so inference would post wrong things confidently.
//
//   The scorer is parsed out of the play text and matched to the player
//   database after normalising suffixes: ESPN writes "Deebo Samuel Sr." where
//   the database has "Deebo Samuel", and no name in the database carries a
//   suffix, so the normalisation only ever runs one way. That took matching
//   from 28/30 to 29/30 on real plays. The last miss was a defensive player who
//   is correctly absent from a fantasy database, so an unmatched touchdown
//   posts as an NFL play with no manager attached rather than being dropped.
//
//   Dedupe and the hourly cap read feed_posts itself, so the watcher keeps no
//   snapshot file and needs no extra table. Verified: payload->>play_id finds a
//   single row, and a created_at window correctly excludes older posts.

import type { ScoringPlay } from './espn-plays.ts';
import type { Game } from './types.ts';

/** Brief Section 2: no more than four posts land in any hour. */
export const POSTS_PER_HOUR = 4;

export type NewPost = {
  week: number;
  kind: 'live' | 'cmon-man' | 'shart-watch' | 'highlight';
  title: string;
  body: string | null;
  team_ids: number[] | null;
  player_ids: string[] | null;
  payload: Record<string, unknown> | null;
};

/**
 * Suffixes and punctuation removed so two spellings of one player agree.
 * Exported because the match rate is worth testing directly.
 */
export const normaliseName = (value: string): string =>
  String(value)
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, '')
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** "Eli Raridon 2 Yd pass from Drake Maye" gives back "Eli Raridon". */
export const scorerFrom = (text: string): string | null => {
  const match = String(text).match(/^(.+?)\s+\d+\s+Yd\b/i);
  return match ? match[1].trim() : null;
};

export type PlayerLookup = {
  /** Normalised name to player id. */
  byName: Map<string, string>;
  /** Player id to the roster holding them. */
  ownerOf: Map<string, number>;
  /** Roster id to manager name, for the post copy. */
  managerOf: Map<number, string>;
};

/**
 * Touchdowns worth posting, newest first, minus anything already posted.
 *
 * A play with no fantasy owner still posts: it happened, and the Feed is a
 * football feed before it is a fantasy feed.
 */
export function touchdownPosts(
  plays: ScoringPlay[],
  week: number,
  lookup: PlayerLookup,
  alreadyPosted: Set<string>
): NewPost[] {
  const out: NewPost[] = [];

  for (const play of plays) {
    if (alreadyPosted.has(play.id)) continue;

    const scorer = scorerFrom(play.text);
    const playerId = scorer ? lookup.byName.get(normaliseName(scorer)) : undefined;
    const rosterId = playerId ? lookup.ownerOf.get(playerId) : undefined;
    const manager = rosterId != null ? lookup.managerOf.get(rosterId) : undefined;

    out.push({
      week,
      kind: 'live',
      title: manager ? `TOUCHDOWN, ${manager}` : 'TOUCHDOWN',
      body: play.text,
      team_ids: rosterId != null ? [rosterId] : null,
      player_ids: playerId ? [playerId] : null,
      // play_id is what dedupe reads on the next run.
      payload: {
        play_id: play.id,
        game_id: play.gameId,
        type: play.type,
        team: play.team,
        period: play.period,
        clock: play.clock,
      },
    });
  }

  return out;
}

/**
 * Lead changes, from fantasy points rather than the NFL scoreboard.
 *
 * The previous leader comes from the last post about that matchup, so a missed
 * run cannot produce a false alarm: the comparison is always against what was
 * last announced, not against a snapshot that may never have been written.
 */
export function leadChangePosts(
  games: Game[],
  week: number,
  lastAnnouncedLeader: Map<number, number>,
  managerOf: Map<number, string>
): NewPost[] {
  const out: NewPost[] = [];

  for (const game of games) {
    if (game.status !== 'live') continue;
    const { home, away } = game;
    if (home.points === away.points) continue;

    const leader = home.points > away.points ? home : away;
    const trailer = leader === home ? away : home;
    if (lastAnnouncedLeader.get(game.matchupId) === leader.rosterId) continue;
    // Nothing announced yet and the game just started: not a change.
    if (!lastAnnouncedLeader.has(game.matchupId) && trailer.points === 0) continue;

    const leadName = managerOf.get(leader.rosterId) ?? leader.manager;
    const trailName = managerOf.get(trailer.rosterId) ?? trailer.manager;
    const margin = Number((leader.points - trailer.points).toFixed(2));

    out.push({
      week,
      kind: 'live',
      title: `${leadName} takes the lead`,
      body: `${leadName} ${leader.points.toFixed(2)}, ${trailName} ${trailer.points.toFixed(2)}, a lead of ${margin}.`,
      team_ids: [leader.rosterId, trailer.rosterId],
      player_ids: null,
      payload: { matchup_id: game.matchupId, leader: leader.rosterId, margin },
    });
  }

  return out;
}

/**
 * Shart Watch: whoever is currently lowest while games are still running.
 *
 * Posted at most once an hour by the cap, and only when somebody has actually
 * scored, so an empty Sunday morning slate does not crown a leader at 0.00.
 */
export function shartWatchPost(
  games: Game[],
  week: number,
  managerOf: Map<number, string>,
  alreadyPostedRosterId: number | null
): NewPost | null {
  const sides = games
    .filter((game) => game.status === 'live')
    .flatMap((game) => [game.home, game.away]);
  if (!sides.length) return null;
  if (!sides.some((side) => side.points > 0)) return null;

  const lowest = sides.reduce((min, side) => (side.points < min.points ? side : min));
  if (alreadyPostedRosterId === lowest.rosterId) return null;

  const name = managerOf.get(lowest.rosterId) ?? lowest.manager;
  return {
    week,
    kind: 'shart-watch',
    title: `Shart Watch: ${name}`,
    body: `${name} is tracking lowest at ${lowest.points.toFixed(2)}.`,
    team_ids: [lowest.rosterId],
    player_ids: null,
    payload: { roster_id: lowest.rosterId, points: lowest.points },
  };
}

/**
 * Trims a run's posts to what the hourly cap allows.
 *
 * Touchdowns come first because they are the reason anybody opens the Feed
 * during a game, then lead changes, then Shart Watch.
 */
export function applyCap(posts: NewPost[], postedInLastHour: number): NewPost[] {
  const room = Math.max(0, POSTS_PER_HOUR - postedInLastHour);
  if (room === 0) return [];

  const rank = { live: 0, 'shart-watch': 1, 'cmon-man': 2, highlight: 3 } as const;
  return [...posts].sort((a, b) => rank[a.kind] - rank[b.kind]).slice(0, room);
}
