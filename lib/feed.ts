// Feed posts, Brief Section 2.
//
// The table already existed in the project, so this maps onto its columns
// rather than inventing a shape: id, week, kind, title, body, team_ids,
// player_ids, payload, created_at. payload is nullable with no default, so it
// carries whatever a kind needs that the columns do not cover, such as the
// period and clock of a touchdown.

import { readClient } from './supabase.ts';

/** The four sections the Feed renders, matching the jump buttons. */
export const FEED_KINDS = ['live', 'cmon-man', 'shart-watch', 'highlight'] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

export type FeedPost = {
  id: string;
  week: number;
  kind: FeedKind;
  title: string;
  body: string | null;
  teamIds: number[];
  playerIds: string[];
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type Row = {
  id: string;
  week: number;
  kind: string;
  title: string;
  body: string | null;
  team_ids: number[] | null;
  player_ids: string[] | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const toPost = (row: Row): FeedPost => ({
  id: row.id,
  week: row.week,
  kind: (FEED_KINDS as readonly string[]).includes(row.kind)
    ? (row.kind as FeedKind)
    : 'live',
  title: row.title,
  body: row.body,
  teamIds: row.team_ids ?? [],
  playerIds: row.player_ids ?? [],
  payload: row.payload,
  createdAt: row.created_at,
});

/**
 * Newest posts first.
 *
 * Returns an empty list when Supabase is not configured or the call fails. The
 * tab bar links to the Feed from every screen, so an outage has to read as an
 * empty Feed rather than a 500.
 */
export async function getFeedPosts(limit = 60): Promise<FeedPost[]> {
  const client = readClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as Row[]).map(toPost);
  } catch {
    return [];
  }
}
