import { getWeekGames } from '@/lib/league';
import type { Game } from '@/lib/types';
import { embedClipsForWeek, type EmbedClip } from '../../../lib/embed-clips';
import type { RailClip } from './ClipRail';
import { teamOf } from './shared';

type Hold = { rosterId: number; started: boolean; points: number };

function holdings(games: Game[]): Map<string, Hold> {
  const out = new Map<string, Hold>();
  for (const g of games)
    for (const side of [g.away, g.home]) {
      for (const p of side.lineup) out.set(p.id, { rosterId: side.rosterId, started: true, points: p.points });
      for (const p of side.bench ?? []) if (!out.has(p.id)) out.set(p.id, { rosterId: side.rosterId, started: false, points: p.points });
    }
  return out;
}

/**
 * NFL clips that hit the league, for the Feed: only plays by a rostered
 * player, starters first, then the biggest fantasy day, then the newest,
 * one clip per player. This week's, or last week's until this week has one.
 */
export async function leagueRailClips(week: number, games: Game[], limit = 6): Promise<RailClip[]> {
  const pick = (clips: EmbedClip[], hold: Map<string, Hold>) => {
    const seen = new Set<string>();
    return clips
      .map((clip) => ({ clip, held: clip.playerIds.map((id) => hold.get(id)).filter((h): h is Hold => Boolean(h)) }))
      .filter((x) => x.held.length)
      .sort(
        (a, b) =>
          Number(b.held[0].started) - Number(a.held[0].started) ||
          b.held[0].points - a.held[0].points ||
          b.clip.publishedAt.localeCompare(a.clip.publishedAt),
      )
      .filter((x) => (seen.has(x.clip.playerIds[0]) ? false : (seen.add(x.clip.playerIds[0]), true)))
      .slice(0, limit)
      .map(({ clip, held }) => ({
        videoId: clip.videoId,
        title: clip.title,
        still: clip.still,
        stillTall: clip.stillTall,
        vertical: clip.vertical,
        channel: clip.channel,
        owners: [...new Map(held.map((h) => [h.rosterId, h])).values()].slice(0, 2).map((h) => ({ name: teamOf(h.rosterId), started: h.started })),
        tags: held[0].points ? [`${held[0].points.toFixed(2)} PTS`] : [],
      }));
  };
  const now = pick(await embedClipsForWeek(week).catch(() => []), holdings(games));
  if (now.length || week <= 1) return now;
  const prev = await getWeekGames(week - 1).catch((): Game[] => []);
  return pick(await embedClipsForWeek(week - 1).catch(() => []), holdings(prev));
}
