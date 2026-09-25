// The Feed as one timeline, rather than four stacked lists.
//
// It used to be a section per post kind with a jump bar, and highlights split
// into Owned, Waiver Adds and Free Agents underneath. That split does not
// survive contact with a fourteen team league: 188 players are rostered, which
// covers nearly every fantasy relevant player in the NFL, so Owned held 49
// clips and the other two tabs held one and two. Three tabs, two of them
// permanently empty, is not navigation.
//
// So: everything the watcher wrote and every clip worth seeing, merged into one
// stream newest first, and filters built from what is actually in it. A filter
// that would return nothing is never offered.
//
// Pure, so the page can build the model on the server and the client can
// filter it without refetching.

import type { FeedPost } from './feed.ts';
import { isEspnClip, stillFor, type Highlight } from './highlights.ts';

export type FeedItemKind = 'touchdown' | 'lead' | 'cmon' | 'shart' | 'clip';

export type FeedItem = {
  id: string;
  kind: FeedItemKind;
  at: string;
  week: number;
  title: string;
  body: string | null;
  /** Roster ids as text, for the manager filter and for linking. */
  managerIds: string[];
  /** Set for a clip: what it is, and whether it can play in the site. */
  clip?: {
    playType: string | null;
    playable: boolean;
    still: string | null;
    points: number | null;
    started: boolean | null;
  };
};

const KIND_OF = (post: FeedPost): FeedItemKind => {
  if (post.kind === 'cmon-man') return 'cmon';
  if (post.kind === 'shart-watch') return 'shart';
  if (post.payload?.play_id) return 'touchdown';
  if (post.payload?.matchup_id != null) return 'lead';
  return 'touchdown';
};

export const KIND_LABELS: Record<FeedItemKind, string> = {
  touchdown: 'Touchdowns',
  lead: 'Lead changes',
  cmon: "C'mon Man",
  shart: 'Shart watch',
  clip: 'Replays',
};

/** One stream, newest first. */
export function buildFeed(posts: FeedPost[], clips: Highlight[]): FeedItem[] {
  const items: FeedItem[] = posts.map((post) => ({
    id: post.id,
    kind: KIND_OF(post),
    at: post.createdAt,
    week: post.week,
    title: post.title,
    body: post.body,
    managerIds: post.teamIds.map(String),
  }));

  for (const clip of clips) {
    items.push({
      id: clip.id,
      kind: 'clip',
      at: clip.publishedAt,
      week: clip.week,
      title: clip.title,
      body: null,
      managerIds: clip.ownerTeamId ? [clip.ownerTeamId] : [],
      clip: {
        playType: clip.playType,
        // The NFL blocks its own YouTube clips on outside sites, so only
        // ESPN's syndicatable ones can play here at all, and only while ESPN
        // still has them: half of ours already answer 404, and a clip ESPN has
        // dropped has no still either. So the still is the liveness test, and
        // a clip that cannot play is never offered as if it could.
        playable: isEspnClip(clip.id) && Boolean(stillFor(clip)),
        still: stillFor(clip),
        points: clip.fantasyPoints,
        started: clip.started,
      },
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export type Facet = { value: string; label: string; count: number };

export type Facets = {
  kinds: Facet[];
  managers: Facet[];
  weeks: Facet[];
};

const tally = (values: string[]) => {
  const out = new Map<string, number>();
  for (const value of values) out.set(value, (out.get(value) ?? 0) + 1);
  return out;
};

/**
 * The filters worth showing: only values present in the stream, and only a
 * dimension with more than one value to choose between. Offering a filter that
 * cannot change what is on screen is what made the old tabs feel broken.
 */
export function facetsOf(items: FeedItem[], managerNameOf: (id: string) => string): Facets {
  const kinds = tally(items.map((item) => item.kind));
  const managers = tally(items.flatMap((item) => item.managerIds));
  const weeks = tally(items.map((item) => String(item.week)).filter((week) => week !== '0'));

  const facet = (entries: Map<string, number>, label: (value: string) => string): Facet[] =>
    [...entries.entries()]
      .filter(([, count]) => count > 0)
      .map(([value, count]) => ({ value, label: label(value), count }));

  return {
    kinds: facet(kinds, (value) => KIND_LABELS[value as FeedItemKind] ?? value).sort(
      (a, b) => b.count - a.count
    ),
    managers: facet(managers, managerNameOf).sort((a, b) => a.label.localeCompare(b.label)),
    weeks: facet(weeks, (value) => `Week ${value}`).sort((a, b) => Number(b.value) - Number(a.value)),
  };
}

export type FeedFilter = { kind: string | null; manager: string | null; week: string | null };

export const EMPTY_FILTER: FeedFilter = { kind: null, manager: null, week: null };

export function applyFilter(items: FeedItem[], filter: FeedFilter): FeedItem[] {
  return items.filter((item) => {
    if (filter.kind && item.kind !== filter.kind) return false;
    if (filter.manager && !item.managerIds.includes(filter.manager)) return false;
    if (filter.week && String(item.week) !== filter.week) return false;
    return true;
  });
}
