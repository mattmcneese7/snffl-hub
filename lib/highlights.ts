// Highlights storage, Brief Section 2.
//
// The table already existed in the project, so this maps onto its columns
// rather than inventing a shape: id, week, title, published_at, play_type,
// player_ids, owner_team_id, started, fantasy_points, is_cmon_man, created_at.
//
// id is the YouTube video id, which makes it the natural dedupe key: a clip
// can only be stored once, and knowing which ids are already stored is what
// keeps the tagger from re-classifying the same 50 uploads every half hour.
// That matters. Classifying a full page costs about two cents, so a run that
// re-read everything would cost roughly a dollar fifty across a weekend, while
// classifying only what is new costs a fraction of that.

import { readClient, writeClient } from './supabase.ts';

export type Highlight = {
  id: string;
  week: number;
  title: string;
  publishedAt: string;
  playType: string | null;
  playerIds: string[];
  /** Roster id as text, which is how the column was defined. */
  ownerTeamId: string | null;
  started: boolean | null;
  fantasyPoints: number | null;
  isCmonMan: boolean;
  /** offense, defense or special_teams, from the tagger. Null on older rows. */
  side: string | null;
  /** Stored still for ESPN clips; YouTube stills are derived from the id. */
  thumbnail: string | null;
};

/** ESPN clips are stored as espn:<id>; everything else is a YouTube id. */
export const isEspnClip = (id: string) => id.startsWith('espn:');
export const espnClipId = (id: string) => id.slice('espn:'.length);
export const stillFor = (clip: Pick<Highlight, 'id' | 'thumbnail'>) =>
  clip.thumbnail ?? (isEspnClip(clip.id) ? null : `https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg`);

type Row = {
  id: string;
  week: number;
  title: string;
  published_at: string;
  play_type: string | null;
  player_ids: string[] | null;
  owner_team_id: string | null;
  started: boolean | null;
  fantasy_points: number | null;
  is_cmon_man: boolean | null;
  side?: string | null;
  thumbnail?: string | null;
};

const toHighlight = (row: Row): Highlight => ({
  id: row.id,
  week: row.week,
  title: row.title,
  publishedAt: row.published_at,
  playType: row.play_type,
  playerIds: row.player_ids ?? [],
  ownerTeamId: row.owner_team_id,
  started: row.started,
  fantasyPoints: row.fantasy_points,
  isCmonMan: row.is_cmon_man ?? false,
  side: row.side ?? null,
  thumbnail: row.thumbnail ?? null,
});

/**
 * Clips for a week, newest first.
 *
 * Empty on any failure: the Feed links from every screen, so an outage has to
 * read as an empty tab rather than a 500.
 */
export async function getHighlights(week?: number, limit = 60): Promise<Highlight[]> {
  const client = readClient();
  if (!client) return [];

  try {
    // week 0 marks an upload the tagger has already judged and rejected, so it
    // is never read back as a highlight.
    let query = client
      .from('highlights')
      .select('*')
      .gt('week', 0)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (week != null) query = query.eq('week', week);

    const { data, error } = await query;
    if (error || !data) return [];
    return rankClips(await withStills((data as Row[]).map(toHighlight)));
  } catch {
    return [];
  }
}

/**
 * ESPN clips carry their still on ESPN, not in our table, so a clip without a
 * stored thumbnail gets it from ESPN's clip record, cached for a day. That
 * keeps stills working whether or not the thumbnail column exists.
 */
async function withStills(clips: Highlight[]): Promise<Highlight[]> {
  return Promise.all(
    clips.map(async (clip) => {
      if (clip.thumbnail || !isEspnClip(clip.id)) return clip;
      try {
        const res = await fetch(`https://content.core.api.espn.com/v1/video/clips/${espnClipId(clip.id)}`, {
          next: { revalidate: 86400 },
        } as RequestInit);
        if (!res.ok) return clip;
        const json = await res.json();
        const raw = (json?.videos ?? [json])[0];
        const thumbnail: string | null = raw?.thumbnail ?? raw?.posterImages?.default?.href ?? null;
        return thumbnail ? { ...clip, thumbnail } : clip;
      } catch {
        return clip;
      }
    })
  );
}

/** Plays made by a defense or special teams, from the play type. */
const DEFENSIVE = /interception|pick|sack|fumble|safety|block|punt|kick(off)? return|return|defens|tackle|strip/i;
const TOUCHDOWN = /touchdown|\btd\b/i;

export const isDefensivePlay = (clip: Highlight) =>
  clip.side ? clip.side !== 'offense' : Boolean(clip.playType && DEFENSIVE.test(clip.playType) && !/receiving|rushing|passing/i.test(clip.playType));

/**
 * How much a clip matters to this league, for ordering.
 *
 * An offensive touchdown by a rostered player is the clip people want; a
 * cornerback's interception belongs to a D/ST and counts for less, since
 * nobody rosters the cornerback. Unrostered players come after rostered ones.
 * Fantasy points break ties within a tier, then recency.
 */
export function clipWeight(clip: Highlight): number {
  // A clip that plays inside the site beats one that has to open YouTube.
  const playable = isEspnClip(clip.id) ? 20 : 0;
  const owned = clip.ownerTeamId ? 10 : 0;
  const defensive = isDefensivePlay(clip);
  const tier = defensive ? 2 : clip.playType && TOUCHDOWN.test(clip.playType) ? 6 : 4;
  return playable + owned + tier + Math.min(clip.fantasyPoints ?? 0, 40) / 40;
}

/**
 * Whether a clip is worth showing to this league.
 *
 * Owned clips always are, including an owned D/ST's plays. An unowned clip
 * only when it features a player someone could actually pick up: a QB, RB,
 * WR, TE or kicker. A cornerback's interception is not that, and neither is
 * a defense nobody wants, so those drop out rather than offering a waiver
 * button for a player the league does not roster.
 */
export function isRelevantClip(clip: Highlight, fantasyPlayer: (id: string) => boolean): boolean {
  if (clip.ownerTeamId) return true;
  if (isDefensivePlay(clip)) return false;
  return clip.playerIds.some((id) => /^\d+$/.test(id) && fantasyPlayer(id));
}

export const rankClips = (clips: Highlight[]) =>
  [...clips].sort(
    (a, b) => clipWeight(b) - clipWeight(a) || b.publishedAt.localeCompare(a.publishedAt)
  );

/** Clips naming a player, for the player page's real highlight clips. */
export async function getHighlightsForPlayer(playerId: string, limit = 6): Promise<Highlight[]> {
  const client = readClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('highlights')
      .select('*')
      .gt('week', 0)
      .contains('player_ids', [playerId])
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return rankClips(await withStills((data as Row[]).map(toHighlight)));
  } catch {
    return [];
  }
}

/**
 * Video ids already stored, so the tagger only ever sees new uploads.
 *
 * This is the whole cost control. Without it every run re-classifies the same
 * page of uploads at about two cents a time.
 */
export async function storedIds(limit = 500): Promise<Set<string>> {
  const client = writeClient() ?? readClient();
  if (!client) return new Set();

  try {
    const { data } = await client
      .from('highlights')
      .select('id')
      .order('published_at', { ascending: false })
      .limit(limit);
    return new Set((data ?? []).map((row) => String((row as { id: string }).id)));
  } catch {
    return new Set();
  }
}

/** The newest published_at we hold, which bounds how far back to page. */
export async function newestPublishedAt(): Promise<string | undefined> {
  const client = writeClient() ?? readClient();
  if (!client) return undefined;

  try {
    const { data } = await client
      .from('highlights')
      .select('published_at')
      .order('published_at', { ascending: false })
      .limit(1);
    return (data?.[0] as { published_at?: string } | undefined)?.published_at;
  } catch {
    return undefined;
  }
}

export type NewHighlight = {
  id: string;
  week: number;
  title: string;
  published_at: string;
  play_type: string | null;
  player_ids: string[] | null;
  owner_team_id: string | null;
  started: boolean | null;
  fantasy_points: number | null;
  is_cmon_man: boolean;
  /** Needs the columns from docs/sql/12b-watcher.sql; dropped on write without them. */
  side?: string | null;
  thumbnail?: string | null;
};

/** Upsert on the video id, so a re-run cannot duplicate a clip. */
export async function saveHighlights(rows: NewHighlight[]): Promise<number> {
  if (!rows.length) return 0;
  const client = writeClient();
  if (!client) return 0;

  let { error, data } = await client
    .from('highlights')
    .upsert(rows, { onConflict: 'id' })
    .select('id');

  // Before the new columns exist, write everything else rather than nothing.
  if (error && /side|thumbnail/.test(error.message)) {
    ({ error, data } = await client
      .from('highlights')
      .upsert(rows.map(({ side: _side, thumbnail: _thumbnail, ...rest }) => rest), { onConflict: 'id' })
      .select('id'));
  }

  if (error) {
    console.warn(`  highlights write failed: ${error.message}`);
    return 0;
  }
  return data?.length ?? 0;
}
