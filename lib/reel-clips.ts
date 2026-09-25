// Turning stored highlights into reel slides. Pure and import free apart from
// types, so server pages and client components can both use it.

import type { Highlight } from './highlights.ts';
import type { Game, GameSide } from './types.ts';

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
  /** ESPN's own id, when this is an ESPN clip: the key to its video stream. */
  espnId?: string;
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
 *
 * A result is only claimed once the matchup is final. A week in progress says
 * who is ahead and says it is in progress, because "beat Adam 35.30 to 18.48"
 * with one running back played is not a fact, it is a scoreboard mid quarter.
 */
export function weekCardClip(
  side: GameSide,
  opponent: GameSide,
  managerName: string,
  opponentName: string,
  week: number,
  status: Game['status']
): ReelClip {
  const best = [...side.lineup].sort((a, b) => b.points - a.points)[0] ?? null;
  const benched = (side.bench ?? []).reduce((sum, player) => sum + player.points, 0);
  const final = status === 'final';
  const ahead = side.points > opponent.points;
  const level = side.points === opponent.points;

  const headline = final
    ? level
      ? `Tied with ${opponentName}`
      : ahead
        ? `Beat ${opponentName}`
        : `Lost to ${opponentName}`
    : level
      ? `Level with ${opponentName}`
      : ahead
        ? `Leading ${opponentName}`
        : `Trailing ${opponentName}`;

  return {
    id: `card:${week}:${side.rosterId}`,
    title: `${managerName}, Week ${week}`,
    tags: [managerName, `Week ${week}`, final ? 'Final' : 'In progress'],
    still: null,
    embed: null,
    sourceUrl: `/matchups/${week}`,
    source: 'espn',
    card: {
      headline,
      score: final ? `${money(side.points)} to ${money(opponent.points)}` : `${money(side.points)} to ${money(opponent.points)}, still playing`,
      // The best start is the headshot above, so it is not repeated here: a
      // hyphenated name and a score wrapped onto two lines and left a word
      // hanging on its own.
      lines: [
        { label: 'His points', value: money(side.points) },
        { label: `${opponentName}`, value: money(opponent.points) },
        { label: final ? 'Left on the bench' : 'On the bench so far', value: money(benched) },
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
    espnId: espn ? raw : undefined,
    embed: espn ? `https://www.espn.com/watch/syndicatedplayer/_/id/${raw}/endcard/false` : null,
    sourceUrl: espn ? `https://www.espn.com/video/clip/_/id/${raw}` : `https://www.youtube.com/watch?v=${raw}`,
    source: espn ? 'espn' : 'youtube',
  };
}
