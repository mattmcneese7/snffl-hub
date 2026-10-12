// NFL clips that play inside Splash, for the redesign bench only. Read only.
//
// The NFL's own channel cannot be used: the API says its videos are
// embeddable, but they refuse to play on any site but YouTube (player errors
// 150 and 152). So this reads the broadcasters and outlets that post NFL
// plays from their own channels, whose embeds do play: the networks that air
// the games, and a few NFL outlets. The API cannot show the NFL's restriction,
// so the player in the app also guards at runtime (ClipPlayer.tsx swaps any
// clip that errors), and /video-check proves each channel in a
// browser. Never the NFL's channel, never ESPN.
//
// Quota. The YouTube Data API gives 10,000 units a day; playlistItems.list
// and videos.list cost 1 unit each, and this never calls search.list (100).
// One read spends at most MAX_CALLS units: per rail channel up to
// PAGES_PER_CHANNEL pages of uploads and one page of Shorts, then videos.list
// for the clips that survived the title filters, 50 ids a call. Every request
// is a fetch cached for 30 minutes, and the playlist page URLs are the same
// whichever week asks. Worst case for a deployment is about 28 units every
// 30 minutes per week read, about 1,350 a day, under 14% of the allowance.

import { getWeekGames } from '@/lib/league';
import { cleanTitle, LOOKS_LIKE_A_PLAY, matchTitle, NOT_A_CLIP, weekWindow } from './nfl-clips';

const API = 'https://www.googleapis.com/youtube/v3';
const REVALIDATE = 1800;
const PAGES_PER_CHANNEL = 2;
const MAX_DETAIL_CALLS = 4;
const MAX_CALLS = 28;
/** Game highlights run to about 19 minutes; past this it is a show or a stream. */
const MAX_SECONDS = 20 * 60;
/** YouTube's Shorts limit. A taller than wide video longer than this is not a Short. */
const SHORT_MAX_SECONDS = 180;

export type Source = {
  name: string;
  handle: string;
  id: string;
  /** In the app's rails. The rest are only tried on /video-check. */
  rail: boolean;
};

/**
 * Channels, resolved once with channels.list forHandle (1 unit each) on
 * 2026-10-11, so nothing spends a unit resolving them again. A channel's
 * uploads playlist is its id with UC swapped for UU, and its Shorts are UUSH.
 * Rail channels posted at least 20 NFL titles in the week before; the rest
 * are candidates for the playback check (lower NFL volume, or team channels
 * whose footage may carry the league's restriction).
 */
export const SOURCES: Source[] = [
  { name: 'NFL on FOX', handle: 'NFLonFOX', id: 'UCvQrivswRDGK0lZ_AcUHp8g', rail: true },
  { name: 'NFL on CBS', handle: 'NFLonCBS', id: 'UC7ZUfHFsuQcW7BkTHnXJtqw', rail: true },
  { name: 'NFL on NBC', handle: 'NFLonNBC', id: 'UCXn8eue3paGXJyI5UDQIyWg', rail: true },
  { name: 'CBS Sports', handle: 'CBSSports', id: 'UCja8sZ2T4ylIqjggA1Zuukg', rail: true },
  { name: 'FOX Sports', handle: 'FOXSports', id: 'UCwNqHDsnBCKT-olwJwIFyfg', rail: true },
  { name: 'B/R Gridiron', handle: 'BRGridiron', id: 'UC1rGz0f5Z3w5aIkXitILv6A', rail: true },
  { name: 'Pro Football Focus', handle: 'ProFootballFocus', id: 'UCY-IDqcyz8tev_jmRboQRsg', rail: true },
  { name: 'NBC Sports', handle: 'NBCSports', id: 'UCqZQlzSHbVJrwrn5XvzrzcA', rail: false },
  { name: 'Bleacher Report', handle: 'BleacherReport', id: 'UC9-OpMMVoNP5o10_Iyq7Ndw', rail: false },
  { name: 'House of Highlights', handle: 'HouseofHighlights', id: 'UCqQo7ewe87aYAe7ub5UqXMw', rail: false },
  { name: 'The Athletic', handle: 'TheAthletic', id: 'UCCl9GMgbh3IbMwyMcU3YLjA', rail: false },
  { name: 'Yahoo Sports', handle: 'YahooSports', id: 'UCi9ACGG8NptsQhaMyezITEw', rail: false },
  { name: 'San Francisco 49ers', handle: '49ers', id: 'UCeIOarQkwmGhimim9cDUTng', rail: false },
  { name: 'Dallas Cowboys', handle: 'DallasCowboys', id: 'UCC0BPKJxAyxjQoRTYbpW0FQ', rail: false },
  { name: 'Philadelphia Eagles', handle: 'Eagles', id: 'UCaogx6OHpsGg0zuGRKsjbtQ', rail: false },
];

export type EmbedClip = {
  videoId: string;
  title: string;
  publishedAt: string;
  /** Widest still YouTube offered, else hqdefault. */
  still: string;
  /** The still at the video's own shape (9:16 for a Short), from oar2. */
  stillTall: string;
  /** Sleeper player ids named in the title, rostered players first. */
  playerIds: string[];
  nflTeams: string[];
  /** A Short, or taller than wide and Short length. */
  vertical: boolean;
  durationSec: number;
  channel: string;
};

type Budget = { left: number; used: number };
type Raw = { id: string; title: string; publishedAt: string; still: string; channel: string };

const bestStill = (id: string, thumbnails: Record<string, { url?: string }> | undefined) => {
  for (const size of ['maxres', 'standard', 'high']) {
    const url = thumbnails?.[size]?.url;
    if (url) return url;
  }
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
};

const tallStill = (id: string) => `https://i.ytimg.com/vi/${id}/oar2.jpg`;

const seconds = (iso: string | undefined) => {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? '');
  if (!m) return 0;
  return (+(m[1] ?? 0)) * 86400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60 + +(m[4] ?? 0);
};

/** One API request against the budget. Null on a spent budget or any failure. */
async function call(budget: Budget, path: string, params: Record<string, string>): Promise<Record<string, unknown> | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || budget.left <= 0) return null;
  budget.left--;
  budget.used++;
  try {
    const res = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key })}`, {
      next: { revalidate: REVALIDATE },
    } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type PlaylistItem = {
  snippet?: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }>; resourceId?: { videoId?: string } };
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
};

function toRaw(items: unknown[], channel: string): Raw[] {
  const out: Raw[] = [];
  for (const entry of items) {
    const item = entry as PlaylistItem;
    const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
    const publishedAt = item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt;
    if (!id || !publishedAt) continue;
    out.push({ id, title: String(item.snippet?.title ?? ''), publishedAt, still: bestStill(id, item.snippet?.thumbnails), channel });
  }
  return out;
}

/** Newest first until `start` is passed or `pages` run out. */
async function walk(budget: Budget, playlistId: string, channel: string, start: number, pages: number, perPage = 50) {
  const items: Raw[] = [];
  let pageToken: string | undefined;
  let complete = false;
  for (let page = 0; page < pages; page++) {
    const params: Record<string, string> = { part: 'snippet,contentDetails', playlistId, maxResults: String(perPage) };
    if (pageToken) params.pageToken = pageToken;
    const json = await call(budget, 'playlistItems', params);
    if (!json) break;
    const batch = toRaw(Array.isArray(json.items) ? json.items : [], channel);
    items.push(...batch);
    const oldest = batch.length ? Date.parse(batch[batch.length - 1].publishedAt) : -Infinity;
    pageToken = typeof json.nextPageToken === 'string' ? json.nextPageToken : undefined;
    if (oldest < start || !pageToken) {
      complete = true;
      break;
    }
  }
  return { items, complete };
}

type Details = { embeddable: boolean; usBlocked: boolean; durationSec: number; tall: boolean };

/** videos.list for these ids, 50 a call, ids sorted so the cached URL is stable. */
async function details(budget: Budget, ids: string[], maxCalls: number): Promise<Map<string, Details>> {
  const out = new Map<string, Details>();
  const sorted = [...new Set(ids)].sort();
  for (let i = 0, calls = 0; i < sorted.length && calls < maxCalls; i += 50, calls++) {
    const json = await call(budget, 'videos', {
      part: 'status,contentDetails,player',
      id: sorted.slice(i, i + 50).join(','),
      maxHeight: '360',
    });
    if (!json) break;
    for (const entry of Array.isArray(json.items) ? json.items : []) {
      const item = entry as {
        id?: string;
        status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string };
        contentDetails?: { duration?: string; regionRestriction?: { allowed?: string[]; blocked?: string[] } };
        player?: { embedWidth?: string | number; embedHeight?: string | number };
      };
      if (!item.id) continue;
      const region = item.contentDetails?.regionRestriction;
      const usBlocked = Boolean(region && ((region.blocked ?? []).includes('US') || (region.allowed && !region.allowed.includes('US'))));
      out.set(item.id, {
        embeddable: item.status?.embeddable === true && item.status?.privacyStatus === 'public',
        usBlocked,
        durationSec: seconds(item.contentDetails?.duration),
        tall: Number(item.player?.embedHeight ?? 0) > Number(item.player?.embedWidth ?? 0),
      });
    }
  }
  return out;
}

/**
 * Talk, not a play: interviews, press conferences and studio segments, which
 * these channels post as much as plays. On top of the NFL reader's filters.
 */
const TALK =
  /\b(at the mic|mic'?d up|mic|podium|locker room|talks?|reacts?|reflects?|breaks? down|explains?|discuss(es)?|news|post-?game|press|presser|comments|says|tells|hypes?|interview|recap|analysis|debate|predicts?|rankings?|mailbag|reaction|preview|keys to|what we learned|takeaways|overreactions?|reveals?|respects?|exclusive|player of the game|lessons?|remembers?|thoughts)\b|\?/i;

/**
 * Talk by its shape rather than its words: a title that opens on a quote
 * (a studio soundbite), "<player> after his ..." (a post-game interview),
 * "<analyst> on <team>", and all-time ranking graphics.
 */
const TALK_SHAPE = /^['"\u2018\u201c]|\bafter (his|her|their|the|a)\b|\s[\u2013\u2014-]\s[A-Z][a-z]+ [A-Z][a-z]+ on\b|\b(all[- ]time|ranks?)\b/;

/** Hashtags out of a title: Shorts titles end in a run of them. */
const dropTags = (title: string) => title.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, ' ');

async function rosteredIn(week: number): Promise<Set<string>> {
  try {
    const ids = new Set<string>();
    for (const game of await getWeekGames(week)) {
      for (const side of [game.home, game.away]) for (const slot of [...side.lineup, ...(side.bench ?? [])]) ids.add(slot.id);
    }
    return ids;
  } catch {
    return new Set();
  }
}

export type EmbedWeekRead = {
  clips: EmbedClip[];
  /** API units this read spent. */
  calls: number;
  /** Rail channels whose walk reached back to the start of the week. */
  complete: string[];
};

/** The week's plays from the rail channels that embed. Never throws. */
export async function readEmbedWeek(week: number): Promise<EmbedWeekRead> {
  const budget: Budget = { left: MAX_CALLS, used: 0 };
  try {
    const { start, end } = weekWindow(week);
    const rails = SOURCES.filter((s) => s.rail);
    const [walks, rostered] = await Promise.all([
      Promise.all(
        rails.map(async (s) => {
          const tail = s.id.slice(2);
          const [uploads, shorts] = await Promise.all([
            walk(budget, `UU${tail}`, s.name, start, PAGES_PER_CHANNEL),
            walk(budget, `UUSH${tail}`, s.name, start, 1),
          ]);
          return { source: s, uploads, shorts };
        })
      ),
      rosteredIn(week),
    ]);

    const shortIds = new Set<string>();
    const byId = new Map<string, Raw>();
    const complete: string[] = [];
    for (const { source, uploads, shorts } of walks) {
      if (uploads.complete) complete.push(source.name);
      for (const r of shorts.items) shortIds.add(r.id);
      for (const r of [...uploads.items, ...shorts.items]) if (!byId.has(r.id)) byId.set(r.id, r);
    }

    // Titles first, so videos.list is only spent on likely plays.
    const kept: { raw: Raw; title: string; playerIds: string[]; nflTeams: string[] }[] = [];
    for (const raw of byId.values()) {
      const at = Date.parse(raw.publishedAt);
      if (!(at >= start && at < end)) continue;
      const title = cleanTitle(dropTags(raw.title));
      if (!title || NOT_A_CLIP.test(title) || TALK.test(title) || TALK_SHAPE.test(title)) continue;
      const { playerIds, nflTeams } = matchTitle(title, rostered);
      // A rail of plays only: the title has to name a play. A player's name
      // alone isn't enough, since Shorts titles like "Mike Evans didn't know"
      // are as often a press conference as a catch.
      if (!LOOKS_LIKE_A_PLAY.test(title)) continue;
      kept.push({ raw, title, playerIds, nflTeams });
    }

    const info = await details(budget, kept.map((k) => k.raw.id), MAX_DETAIL_CALLS);
    const clips: EmbedClip[] = [];
    for (const { raw, title, playerIds, nflTeams } of kept) {
      const d = info.get(raw.id);
      // No details means no proof it embeds: leave it out.
      if (!d || !d.embeddable || d.usBlocked) continue;
      if (d.durationSec <= 0 || d.durationSec > MAX_SECONDS) continue;
      const vertical = shortIds.has(raw.id) || (d.tall && d.durationSec <= SHORT_MAX_SECONDS);
      clips.push({
        videoId: raw.id,
        title,
        publishedAt: raw.publishedAt,
        still: raw.still,
        stillTall: tallStill(raw.id),
        playerIds,
        nflTeams,
        vertical,
        durationSec: d.durationSec,
        channel: raw.channel,
      });
    }
    clips.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return { clips, calls: budget.used, complete };
  } catch {
    return { clips: [], calls: budget.used, complete: [] };
  }
}

export async function embedClipsForWeek(week: number): Promise<EmbedClip[]> {
  return (await readEmbedWeek(week)).clips;
}

export async function embedClipsForPlayers(week: number, playerIds: string[]): Promise<EmbedClip[]> {
  const wanted = new Set(playerIds);
  return (await embedClipsForWeek(week)).filter((c) => c.playerIds.some((id) => wanted.has(id)));
}

export type CheckClip = {
  videoId: string;
  title: string;
  channel: string;
  handle: string;
  vertical: boolean;
  /** What the API claims. The NFL's own clips claim true and still fail. */
  apiEmbeddable: boolean | null;
};

/**
 * Each source's latest 3 uploads and latest 3 Shorts, for the playback check.
 * 2 playlist calls per channel and 1 to 2 videos.list calls, cached 30
 * minutes. `control` adds the NFL's own channel, which should fail, to prove
 * the check can tell.
 */
export async function latestPerChannel(control = false): Promise<{ clips: CheckClip[]; calls: number }> {
  const budget: Budget = { left: 40, used: 0 };
  const sources: Source[] = [...SOURCES];
  if (control) sources.push({ name: 'NFL (control, expected to fail)', handle: 'NFL', id: 'UCDVYQ4Zhbm3S2dlz7P1GBDg', rail: false });
  const per = await Promise.all(
    sources.map(async (s) => {
      const tail = s.id.slice(2);
      const [uploads, shorts] = await Promise.all([
        walk(budget, `UU${tail}`, s.name, Infinity, 1, 10),
        walk(budget, `UUSH${tail}`, s.name, Infinity, 1, 3),
      ]);
      const shortIds = new Set(shorts.items.map((r) => r.id));
      const wide = uploads.items.filter((r) => !shortIds.has(r.id)).slice(0, 3);
      const picks = [...wide, ...shorts.items.slice(0, 3)];
      return picks.map((r) => ({ r, s, vertical: shortIds.has(r.id) }));
    })
  );
  const flat = per.flat();
  const info = await details(budget, flat.map((x) => x.r.id), 3);
  return {
    clips: flat.map(({ r, s, vertical }) => ({
      videoId: r.id,
      title: cleanTitle(dropTags(r.title)),
      channel: s.name,
      handle: s.handle,
      vertical,
      apiEmbeddable: info.get(r.id)?.embeddable ?? null,
    })),
    calls: budget.used,
  };
}
