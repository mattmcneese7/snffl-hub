import type { EmbedClip } from '../../../lib/embed-clips';
import type { RailClip } from './Clips';

/**
 * Clips for a rail: vertical ones first on a phone, at most two of any one
 * player so one big day does not fill it, each tagged with who rosters him.
 */
export function railOf(clips: EmbedClip[], ownerOf: (playerId: string) => string | null, cap = 10): RailClip[] {
  const seen = new Map<string, number>();
  return [...clips]
    .sort((a, b) => Number(b.vertical) - Number(a.vertical))
    .filter((c) => {
      const lead = c.playerIds[0];
      if (!lead) return true;
      const n = seen.get(lead) ?? 0;
      seen.set(lead, n + 1);
      return n < 2;
    })
    .slice(0, cap)
    .map((c) => ({
      videoId: c.videoId,
      title: c.title,
      still: c.vertical ? c.stillTall || c.still : c.still,
      vertical: c.vertical,
      channel: c.channel,
      owners: [...new Set(c.playerIds.map(ownerOf).filter((o): o is string => !!o))].slice(0, 2),
    }));
}
