// Real photographs of the week's games, for Rag lead art.
//
// The Rag's art was a still from a video clip or, failing that, a card drawn
// around a player's headshot. ESPN prunes clips within days and a headshot is
// a passport photo, so most issues led with a passport photo.
//
// ESPN publishes wire photographs against each game, mostly through the
// fantasy pieces attached to it: 1296 pixels wide, captioned, and shot in the
// stadium. This collects them for the week's games, works out who is in each
// one from the caption, and ranks them so the exciting ones go first.
//
// What counts as exciting, in order of weight:
//   a player this league actually rosters, weighted by what he scored
//   a caption describing a play rather than a situation: a touchdown, a catch,
//     a run, a celebration
//   a big photograph rather than a video still
// And what counts against it: injuries, suspensions and advice columns. A
// photo captioned "should managers consider him" is not a highlight, and a
// picture of somebody being helped off the field is not a lead image.

import fs from 'node:fs';
import path from 'node:path';
import { normaliseName } from './live.ts';

const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';

export type RawPhoto = {
  url: string;
  width: number;
  height: number;
  caption: string;
  gameId: string;
};

export type GamePhoto = RawPhoto & {
  week: number;
  /** Sleeper ids of players named in the caption. */
  playerIds: string[];
  score: number;
};

type Json = Record<string, any>;

/** Every distinct photograph ESPN attaches to these games. */
export async function collectPhotos(eventIds: string[]): Promise<RawPhoto[]> {
  const byUrl = new Map<string, RawPhoto>();
  await Promise.all(
    eventIds.map(async (gameId) => {
      try {
        const res = await fetch(`${SUMMARY}?event=${gameId}`, { next: { revalidate: 1800 } } as RequestInit);
        if (!res.ok) return;
        const json = (await res.json()) as Json;
        const articles: Json[] = [...(json?.news?.articles ?? []), ...(json?.article ? [json.article] : [])];
        for (const article of articles) {
          for (const image of article?.images ?? []) {
            const url = String(image?.url ?? '');
            if (!url || byUrl.has(url)) continue;
            byUrl.set(url, {
              url,
              width: Number(image?.width ?? 0),
              height: Number(image?.height ?? 0),
              caption: String(image?.caption ?? image?.alt ?? ''),
              gameId,
            });
          }
        }
      } catch {
        // One game's photos failing leaves the rest of the slate.
      }
    })
  );
  return [...byUrl.values()];
}

/** A play happening, rather than a player existing. */
const ACTION =
  /touchdown|end zone|scored?|scoring|celebrat|catch|caught|reception|hurdle|dive|dives|stiff.?arm|run for|rushed|sack|interception|pick|return|leap|juke|breaks? (a )?tackle/i;

/** Nothing anybody wants as the lead image of a story about a fantasy week. */
const AVOID =
  /injur|hurt|carted|concussion|protocol|questionable|doubtful|out for|IR\b|suspend|arrest|surgery|retire/i;

/** Advice columns and studio segments, which are stock pictures with opinions. */
const ADVICE =
  /should (fantasy )?managers|consider|available in|start\/sit|waiver|q&a|ranks?\b|projection|buy low|sell high|sleeper pick|uncertainty|pivot/i;

export type PhotoContext = {
  /** Sleeper player id to the points he scored this week. */
  pointsOf: Map<string, number>;
  /** Sleeper player id to his full name, for the ones worth matching. */
  nameOf: Map<string, string>;
  /** The season being played, so last year's file photos rank below this
      week's. ESPN keeps serving older pictures of the same player. */
  season?: string;
};

/** The year in an ESPN image path, /photo/2026/0920/ and the like. */
function yearOf(url: string): number | null {
  const match = url.match(/\/(20\d{2})\/\d{4}\//);
  return match ? Number(match[1]) : null;
}

/**
 * Who a caption is about. Full name only: a surname alone matches the wrong
 * Johnson often enough that a story would end up illustrated by somebody who
 * was not in it.
 */
function playersIn(caption: string, context: PhotoContext): string[] {
  const text = normaliseName(caption);
  const out: string[] = [];
  for (const [id, name] of context.nameOf) {
    if (text.includes(normaliseName(name))) out.push(id);
  }
  return out;
}

export function scorePhoto(photo: RawPhoto, context: PhotoContext): GamePhoto['score'] {
  let score = 0;

  // A photograph, not a 576 wide video still.
  if (photo.width >= 1200) score += 3;
  else if (photo.width >= 900) score += 2;
  else if (photo.width >= 600) score += 1;
  // Square is a portrait or a logo, never an action shot.
  if (photo.width && photo.height && Math.abs(photo.width / photo.height - 1) < 0.1) score -= 3;

  // This week's football, not a file picture from last season.
  const year = yearOf(photo.url);
  const season = Number(context.season ?? 0);
  if (year && season && year < season) score -= 4;

  const caption = photo.caption;
  if (!caption) score -= 1;
  if (ACTION.test(caption)) score += 3;
  if (AVOID.test(caption)) score -= 6;
  if (ADVICE.test(caption)) score -= 3;

  // The people in it, weighted by what they did. A 30 point game is the story.
  const players = playersIn(caption, context);
  if (players.length) {
    score += 4;
    const best = Math.max(...players.map((id) => context.pointsOf.get(id) ?? 0));
    score += Math.min(best / 8, 4);
  }

  return Math.round(score * 100) / 100;
}

/** The week's photographs, best first. */
export function rankPhotos(raw: RawPhoto[], week: number, context: PhotoContext): GamePhoto[] {
  return raw
    .map((photo) => ({
      ...photo,
      week,
      playerIds: playersIn(photo.caption, context),
      score: scorePhoto(photo, context),
    }))
    .filter((photo) => photo.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * The photographs already collected for a week, newest pull wins. Reads the
 * file rather than ESPN, so a page render never waits on sixteen summaries.
 */
export function photosForWeek(week: number): GamePhoto[] {
  try {
    const file = path.join('data', 'photos.json');
    if (!fs.existsSync(file)) return [];
    const all = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, GamePhoto[]>;
    return all[String(week)] ?? [];
  } catch {
    return [];
  }
}
