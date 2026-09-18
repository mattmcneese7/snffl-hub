// Turning stored highlights into reel slides. Pure and import free apart from
// types, so server pages and client components can both use it.

import type { Highlight } from './highlights.ts';

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
