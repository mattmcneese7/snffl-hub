// Turning stored highlights into reel slides. Pure and import free apart from
// types, so server pages and client components can both use it.

import type { Highlight } from './highlights.ts';

export type ReelClip = {
  id: string;
  title: string;
  /** Short labels under the title: play type, Started, points, manager. */
  tags: string[];
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

export const toReelClip = (highlight: Highlight, managerName?: string | null): ReelClip => ({
  id: highlight.id,
  title: highlight.title,
  tags: clipTags(highlight, managerName),
});
