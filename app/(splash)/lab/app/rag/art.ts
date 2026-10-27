import { photosForWeek } from '@/lib/game-photos';
import { getHighlights } from '@/lib/highlights';
import { teams } from '@/lib/league';
import type { Article } from '@/lib/rag';
import { artForArticles, featuredPlayers, type StoryArt } from '@/lib/story-images';

/**
 * Art for every story in an issue, worked out over the whole issue in its
 * order, so each story wears the same picture on the front, on its own page
 * and in another story's More From This Week.
 */
export async function issueArt(week: number, articles: Article[]): Promise<Record<string, StoryArt>> {
  if (!articles.length) return {};
  const [clips, featured] = await Promise.all([getHighlights(week, 200).catch(() => []), featuredPlayers(week).catch(() => [])]);
  return artForArticles(
    articles,
    clips,
    Object.fromEntries(teams.map((t) => [String(t.rosterId), t.manager])),
    featured,
    photosForWeek(week),
  );
}
