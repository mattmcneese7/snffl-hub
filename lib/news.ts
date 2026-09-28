// Player news, as the app reads it. Checkpoint 18d.
//
// Written by scripts/news-pull.ts, keyed by ESPN athlete id, which the app
// already carries on a player as espnId. Every item is somebody else's
// reporting, so it is shown as theirs: their headline, their summary, their
// name, and a link to the source. The app adds nothing and infers nothing from
// it.

import newsData from '../data/news.json' with { type: 'json' };

export type NewsItem = {
  headline: string;
  summary: string;
  source: string;
  byline: string;
  url: string;
  published: string;
};

type NewsFile = { builtAt: string; players: Record<string, NewsItem[]> };

const news = newsData as unknown as NewsFile;

/** Recent notes on a player, newest first, or empty when there are none. */
export function newsFor(espnId: string | undefined | null): NewsItem[] {
  if (!espnId) return [];
  return news.players[String(espnId)] ?? [];
}

/** How long ago an item was filed, as words. */
export function filed(published: string): string {
  const t = new Date(published).getTime();
  if (!t) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}
