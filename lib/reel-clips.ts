// Turning stored highlights into reel slides. Pure and import free apart from
// types, so server pages and client components can both use it.

import type { Highlight } from './highlights.ts';
import type { GameSide } from './types.ts';

export type ReelClip = {
  id: string;
  title: string;
  /** Short labels under the title: play type, Started, points, manager. */
  tags: string[];
  still: string | null;
  /**
   * Where the clip can play inside the site. ESPN clips play in ESPN's
   * syndicated player. The NFL blocks its YouTube clips on outside sites, so
   * those have no embed and open in YouTube instead.
   */
  embed: string | null;
  /** Where the clip lives at its source, for the "watch there" button. */
  sourceUrl: string;
  source: 'espn' | 'youtube';
  /**
   * A slide with no video: the manager's week in numbers.
   *
   * ESPN prunes the clips off a game page within days and its live feed holds
   * only a handful at a time, so most weeks most managers have no clip at all.
   * Ten of fourteen story rings were dark. A recap card means every manager's
   * story opens with something true about his week, and his clips lead when he
   * has them.
   */
  card?: StoryCard;
};

export type StoryCard = {
  /** "Beat Jack" or "Lost to Jack". */
  headline: string;
  score: string;
  lines: { label: string; value: string }[];
  player: { name: string; slot: string; points: string; headshot: string } | null;
};

/** The labels a clip carries, on the card and in the reel alike. */
export function clipTags(highlight: Highlight, managerName?: string | null): string[] {
  const tags: string[] = [];
  if (highlight.playType) tags.push(highlight.playType);
  if (highlight.started != null) tags.push(highlight.started ? 'Started' : 'Benched');
  if (highlight.fantasyPoints != null) tags.push(`${highlight.fantasyPoints.toFixed(2)} pts`);
  if (managerName) tags.push(managerName);
  return tags;
}

const money = (n: number) => n.toFixed(2);

/**
 * One manager's week as a card slide: the result, his best start, and what he
 * left on the bench, which is the number people argue about.
 */
export function weekCardClip(
  side: GameSide,
  opponent: GameSide,
  managerName: string,
  opponentName: string,
  week: number
): ReelClip {
  const best = [...side.lineup].sort((a, b) => b.points - a.points)[0] ?? null;
  const benched = (side.bench ?? []).reduce((sum, player) => sum + player.points, 0);
  const won = side.points > opponent.points;
  const tied = side.points === opponent.points;

  return {
    id: `card:${week}:${side.rosterId}`,
    title: `${managerName}, Week ${week}`,
    tags: [managerName, `Week ${week}`],
    still: null,
    embed: null,
    sourceUrl: `/matchups/${week}`,
    source: 'espn',
    card: {
      headline: tied ? `Tied with ${opponentName}` : won ? `Beat ${opponentName}` : `Lost to ${opponentName}`,
      score: `${money(side.points)} to ${money(opponent.points)}`,
      lines: [
        { label: 'Points', value: money(side.points) },
        { label: 'Best start', value: best ? `${best.short}, ${money(best.points)}` : 'Nobody' },
        { label: 'Left on the bench', value: money(benched) },
      ],
      player: best
        ? { name: best.short, slot: best.slot, points: money(best.points), headshot: best.headshot }
        : null,
    },
  };
}

export function toReelClip(highlight: Highlight, managerName?: string | null): ReelClip {
  const espn = highlight.id.startsWith('espn:');
  const raw = espn ? highlight.id.slice(5) : highlight.id;
  return {
    id: highlight.id,
    title: highlight.title,
    tags: clipTags(highlight, managerName),
    still: highlight.thumbnail ?? (espn ? null : `https://i.ytimg.com/vi/${raw}/hqdefault.jpg`),
    embed: espn ? `https://www.espn.com/watch/syndicatedplayer/_/id/${raw}/endcard/false` : null,
    sourceUrl: espn ? `https://www.espn.com/video/clip/_/id/${raw}` : `https://www.youtube.com/watch?v=${raw}`,
    source: espn ? 'espn' : 'youtube',
  };
}
