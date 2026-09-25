// YouTube Data API v3, for highlight clips. Brief Section 3.
//
// Uploads, never search. search.list costs 100 units of the 10,000 unit daily
// quota and playlistItems.list costs 1, so search would allow about a hundred
// calls a day against roughly ten thousand. The brief specifies the NFL
// channel's uploads for exactly this reason.
//
// Official API with a key, but still treated like every other source here: a
// failure returns an empty list rather than throwing, so a highlights outage
// shows an empty tab instead of breaking a page.

const API = 'https://www.googleapis.com/youtube/v3';

/** The NFL's channel. Its uploads playlist is the only thing this reads. */
const NFL_CHANNEL_ID = 'UCDVYQ4Zhbm3S2dlz7P1GBDg';

export type Upload = {
  /** YouTube video id, which is also the highlights table primary key. */
  id: string;
  title: string;
  publishedAt: string;
  /** Highest resolution still the API offered. */
  thumbnail: string | null;
  description: string;
};

const key = () => process.env.YOUTUBE_API_KEY || '';

export const youtubeConfigured = () => Boolean(key());

/** Watch URL, for the "real clips" the brief asks for rather than re-hosting. */
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Privacy preserving embed host, so a card that is never played sets no cookie. */
export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`;

/**
 * The uploads playlist id for a channel.
 *
 * channels.list costs 1 unit and the answer never changes, so the caller is
 * expected to hold onto it rather than ask on every run.
 */
/**
 * A channel's uploads playlist, without asking.
 *
 * Every channel's uploads playlist is its own id with the `UC` prefix swapped
 * for `UU`. That is a documented invariant of the service, not a guess, so
 * resolving it over the network spent a quota unit on every run of a job that
 * runs every ten minutes, and worse, gave the job a way to fail: the pull
 * exits on a null playlist, so one bad response to a question whose answer
 * cannot change took out an entire highlights run.
 *
 * The request stays as the path for anything that is not a `UC` id.
 */
export async function uploadsPlaylistId(channelId = NFL_CHANNEL_ID): Promise<string | null> {
  if (channelId.startsWith('UC')) return `UU${channelId.slice(2)}`;
  if (!youtubeConfigured()) return null;
  try {
    const params = new URLSearchParams({
      part: 'contentDetails',
      id: channelId,
      key: key(),
    });
    const res = await fetch(`${API}/channels?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
  } catch {
    return null;
  }
}

const bestThumbnail = (thumbnails: Record<string, { url?: string }> | undefined): string | null => {
  if (!thumbnails) return null;
  // Widest first: these become lead images, so a 120px default would look poor.
  for (const size of ['maxres', 'standard', 'high', 'medium', 'default']) {
    const url = thumbnails[size]?.url;
    if (url) return url;
  }
  return null;
};

/**
 * Recent uploads, newest first.
 *
 * One unit per page of up to 50. `since` stops paging once the results predate
 * what we already have, so a run during a game window reads one page rather
 * than walking the channel's whole history.
 */
export async function recentUploads(
  playlistId: string,
  { since, maxPages = 4 }: { since?: string; maxPages?: number } = {}
): Promise<Upload[]> {
  if (!youtubeConfigured()) return [];

  const out: Upload[] = [];
  let pageToken: string | undefined;

  try {
    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: '50',
        key: key(),
      });
      if (pageToken) params.set('pageToken', pageToken);

      const res = await fetch(`${API}/playlistItems?${params}`);
      if (!res.ok) break;
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      if (!items.length) break;

      let reachedKnown = false;
      for (const item of items) {
        const id = item?.contentDetails?.videoId ?? item?.snippet?.resourceId?.videoId;
        const publishedAt = item?.contentDetails?.videoPublishedAt ?? item?.snippet?.publishedAt;
        if (!id || !publishedAt) continue;
        if (since && publishedAt <= since) {
          reachedKnown = true;
          continue;
        }
        out.push({
          id: String(id),
          title: String(item?.snippet?.title ?? ''),
          publishedAt: String(publishedAt),
          thumbnail: bestThumbnail(item?.snippet?.thumbnails),
          description: String(item?.snippet?.description ?? '').slice(0, 600),
        });
      }

      if (reachedKnown) break;
      pageToken = json?.nextPageToken;
      if (!pageToken) break;
    }
  } catch {
    // Source moved or the quota is spent. Callers show the empty state.
    return out;
  }

  return out;
}

/**
 * Title, description and publish time for specific videos, 50 per call at one
 * quota unit each. For re-tagging stored clips with the same text the tagger
 * saw the first time: titles alone lose too much, "Mahomes' best plays" reads
 * as a show without the description saying which game.
 */
export async function videoDetails(ids: string[]): Promise<Upload[]> {
  if (!youtubeConfigured() || !ids.length) return [];
  const out: Upload[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({ part: 'snippet', id: ids.slice(i, i + 50).join(','), key: key() });
    try {
      const res = await fetch(`${API}/videos?${params}`);
      if (!res.ok) continue;
      const json = await res.json();
      for (const item of Array.isArray(json?.items) ? json.items : []) {
        out.push({
          id: String(item.id),
          title: String(item?.snippet?.title ?? ''),
          publishedAt: String(item?.snippet?.publishedAt ?? ''),
          thumbnail: bestThumbnail(item?.snippet?.thumbnails),
          description: String(item?.snippet?.description ?? '').slice(0, 600),
        });
      }
    } catch {
      // A failed batch leaves those ids out; the rest still re-tag.
    }
  }
  return out;
}
