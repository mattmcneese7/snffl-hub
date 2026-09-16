// Lead images for Rag stories, Brief Section 2 and the sources table.
//
// "Highlight stills, YouTube API thumbnails from the week's official NFL
// videos, lead images for every story." The hero used a gradient placeholder
// until the highlights table had real clips in it.
//
// Matching is deliberately simple and checkable: a story about a manager gets a
// clip owned by that manager. Manager names are the only handle both sides
// share, since an article is prose and a highlight carries roster ids. Anything
// unmatched takes the next unused clip, and anything left over gets no still at
// all rather than a wrong one.
//
// Each clip is used once, so the hero slider is not four copies of the same
// frame.

import type { Highlight } from './highlights.ts';
import type { Article } from './rag.ts';

export const stillUrl = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

/** Slug to still URL. A slug missing from the map keeps the gradient. */
export function stillsForArticles(
  articles: Article[],
  highlights: Highlight[],
  managerByRoster: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!articles.length || !highlights.length) return out;

  const used = new Set<string>();
  const pool = [...highlights];

  // Owned clips first: a story is about somebody in this league, so a clip
  // belonging to one of them is a better lead than a free agent's.
  pool.sort((a, b) => Number(Boolean(b.ownerTeamId)) - Number(Boolean(a.ownerTeamId)));

  const haystackOf = (article: Article) =>
    [article.headline, article.deck, ...article.body].join(' ').toLowerCase();

  for (const article of articles) {
    const haystack = haystackOf(article);

    const match = pool.find((clip) => {
      if (used.has(clip.id)) return false;
      if (!clip.ownerTeamId) return false;
      const manager = managerByRoster[clip.ownerTeamId];
      return Boolean(manager) && haystack.includes(manager.toLowerCase());
    });

    if (match) {
      out[article.slug] = stillUrl(match.id);
      used.add(match.id);
    }
  }

  // Whatever is left takes the next unused clip, so a full issue still leads
  // with real frames rather than a row of gradients.
  for (const article of articles) {
    if (out[article.slug]) continue;
    const next = pool.find((clip) => !used.has(clip.id));
    if (!next) break;
    out[article.slug] = stillUrl(next.id);
    used.add(next.id);
  }

  return out;
}
