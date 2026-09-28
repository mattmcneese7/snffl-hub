// Player news, attributed and linked, never converted to a number. Checkpoint 18d.
//
// Beat-reporter news carries real signal a box score does not: a role change, a
// coach's quote, an injury nuance. The temptation is to feed it to a model and
// let it judge sentiment, which is exactly where a made-up number would come
// from. So this does the opposite: it stores the reporter's own headline and
// summary, credits the byline, links to the source, and stops. The human reads
// it and decides. Nothing here ever moves a projection.
//
// One short summary per item, ESPN's own published description, with a link and
// a byline. Attribution and a link out, not a reproduction of the article.
//
//   node --experimental-strip-types scripts/news-pull.ts

import fs from 'node:fs';
import path from 'node:path';

const FEED = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=50';
const OUT = path.join('data', 'news.json');
const PER_PLAYER = 3;

type Item = { headline: string; summary: string; source: string; byline: string; url: string; published: string };

const res = await fetch(FEED);
if (!res.ok) {
  console.error(`ESPN news returned ${res.status}, leaving the last file alone`);
  process.exit(1);
}
const feed = (await res.json()) as { articles?: any[] };
const articles = Array.isArray(feed.articles) ? feed.articles : [];

const byPlayer: Record<string, Item[]> = {};
for (const a of articles) {
  const url = a?.links?.web?.href ?? '';
  const headline = String(a?.headline ?? '').trim();
  if (!url || !headline) continue;
  const item: Item = {
    headline,
    // ESPN's own one or two sentence summary, kept short. A link out, not a copy.
    summary: String(a?.description ?? '').trim().slice(0, 240),
    source: 'ESPN',
    byline: String(a?.byline ?? '').trim(),
    url,
    published: String(a?.published ?? ''),
  };
  const seen = new Set<string>();
  for (const c of a?.categories ?? []) {
    if (c?.type !== 'athlete') continue;
    const id = c?.athleteId ?? c?.athlete?.id;
    if (!id) continue;
    const key = String(id);
    // A player tagged twice on one article gets it once.
    if (seen.has(key)) continue;
    seen.add(key);
    (byPlayer[key] ??= []).push(item);
  }
}

// Newest first, capped, so a player page shows the current word and not a wall.
for (const key of Object.keys(byPlayer)) {
  byPlayer[key].sort((a, b) => (b.published > a.published ? 1 : -1));
  byPlayer[key] = byPlayer[key].slice(0, PER_PLAYER);
}

const payload = { builtAt: new Date().toISOString(), players: byPlayer };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload));
console.log(`news: ${articles.length} articles, ${Object.keys(byPlayer).length} players with a note`);
