// ESPN highlight clips, Checkpoint 12b.
//
// Why ESPN and not YouTube. The NFL's YouTube uploads report as embeddable, but
// the NFL's rights claim blocks them on any site it has not approved: on
// squirtnite.live every one of them showed "This video contains content from
// NFL, who has blocked it from display on this website". That is a deliberate
// restriction by the owner, so the site does not try to get around it.
//
// ESPN publishes clips of the same plays with a syndicatable flag and its own
// syndicated player for other sites to embed. Only clips ESPN marks
// syndicatable are used, and they play in ESPN's player, ads and all.
//
// ESPN also tags each clip with the athletes in it by ESPN id, and the nightly
// player file carries ESPN ids from nflverse, so a clip is attributed to a
// Sleeper player by id rather than by guessing at a name in a title.
//
// Clips roll off quickly: a game summary lists its clips for a day or two and
// the global feed reaches back about ten hours. The hourly pull during games
// is what catches them.

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const CONTENT = 'https://content.core.api.espn.com/v1/video/clips';

export type EspnClip = {
  /** ESPN's clip id, stored as espn:<id>. */
  id: string;
  headline: string;
  description: string;
  durationSeconds: number;
  publishedAt: string;
  thumbnail: string | null;
  /** ESPN offers a vertical cut, used for stories. */
  vertical: boolean;
  /** ESPN athlete ids tagged on the clip. */
  athleteIds: string[];
  gameId: string | null;
};

export const espnPlayerUrl = (clipId: string) =>
  `https://www.espn.com/watch/syndicatedplayer/_/id/${clipId}/endcard/false`;

type Json = Record<string, any>;

function toClip(raw: Json): EspnClip | null {
  if (!raw?.id || raw.syndicatable !== true) return null;
  const categories: Json[] = Array.isArray(raw.categories) ? raw.categories : [];
  const isNfl = categories.some((c) => c.type === 'league' && c.leagueId === 28);
  if (!isNfl) return null;
  return {
    id: String(raw.id),
    headline: String(raw.headline ?? raw.title ?? ''),
    description: String(raw.description ?? '').slice(0, 400),
    durationSeconds: Number(raw.duration ?? 0),
    publishedAt: String(raw.originalPublishDate ?? raw.lastModified ?? new Date().toISOString()),
    thumbnail: raw.thumbnail ?? raw.posterImages?.default?.href ?? null,
    vertical: String(raw.videoRatio ?? '').includes('9:16'),
    athleteIds: categories
      .filter((c) => c.type === 'athlete' && c.athleteId != null)
      .map((c) => String(c.athleteId)),
    gameId: raw.gameId != null ? String(raw.gameId) : null,
  };
}

/** Full detail for one clip, or null when it is not a syndicatable NFL clip. */
export async function getEspnClip(id: string): Promise<EspnClip | null> {
  try {
    const res = await fetch(`${CONTENT}/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return toClip((json?.videos ?? [json])[0]);
  } catch {
    return null;
  }
}

/** Clip ids listed on the summaries of the given ESPN games. */
export async function clipIdsForGames(eventIds: string[]): Promise<string[]> {
  const out = new Set<string>();
  await Promise.all(
    eventIds.map(async (eventId) => {
      try {
        const res = await fetch(`${SITE}/summary?event=${eventId}`);
        if (!res.ok) return;
        const json = await res.json();
        for (const video of json?.videos ?? []) if (video?.id) out.add(String(video.id));
      } catch {
        // One game failing leaves the rest.
      }
    })
  );
  return [...out];
}

/**
 * NFL clips from ESPN's global clip feed, which carries full detail inline.
 * It covers every sport and only the last several hours, so it complements
 * the game summaries rather than replacing them.
 */
export async function recentNflClips(pages = 3): Promise<EspnClip[]> {
  const out: EspnClip[] = [];
  for (let page = 0; page < pages; page++) {
    try {
      const res = await fetch(`${CONTENT}?limit=100&offset=${page * 100}`);
      if (!res.ok) break;
      const json = await res.json();
      const videos: Json[] = json?.videos ?? [];
      if (!videos.length) break;
      for (const raw of videos) {
        const clip = toClip(raw);
        if (clip) out.push(clip);
      }
    } catch {
      break;
    }
  }
  return out;
}
