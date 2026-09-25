// Lead art for Rag stories, Brief Section 2 and the sources table.
//
// Two sources, so a story never depends on video to have a picture:
//
//   photo    a real photograph of the week, ranked in lib/game-photos.ts, or
//            failing that a still from a highlight clip: ESPN's own image for
//            ESPN clips, YouTube's thumbnail for the older NFL uploads. Built
//            from the clip's stored still, never by pasting an id into a
//            YouTube URL, which is what broke once ESPN clips (espn:<id>)
//            arrived.
//   player   a card drawn from the week's data: the featured manager's top
//            scorer as an ESPN cutout over his team's color and logo. Needs
//            no clip at all, so every story gets art every week.
//
// Matching stays simple and checkable: a story that names a manager gets his
// clip if he has one, else his top player. Anything unmatched takes the next
// unused clip, then the next unused top player. Each is used once, so the hero
// is never four copies of the same frame.

import { firstNameOf } from '../config/managers.ts';
import type { GamePhoto } from './game-photos.ts';
import { ESPN_CUTOUT, ESPN_TEAM_LOGO } from './espn.ts';
import type { Highlight } from './highlights.ts';
import { getWeekGames } from './league.ts';
import type { Article } from './rag.ts';
import { teamPaint } from '../config/nfl-colors.ts';

export type StoryArt =
  | { kind: 'photo'; src: string; caption?: string }
  | { kind: 'player'; cutout: string; logo: string | null; color: string; name: string; points: number };

export type FeaturedPlayer = {
  rosterId: number;
  id: string;
  name: string;
  team: string | null;
  cutout: string;
  points: number;
};

const mentions = (haystack: string, name: string) =>
  new RegExp(`\\b${name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack);

/** The still a clip really has, or null. */
function stillOf(clip: Highlight): string | null {
  if (clip.thumbnail) return clip.thumbnail;
  if (clip.id.startsWith('espn:')) return null;
  // hqdefault exists for every upload; maxresdefault does not.
  return `https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg`;
}

/** Each manager's top scoring starter for a week, the player card fallback. */
export async function featuredPlayers(week: number): Promise<FeaturedPlayer[]> {
  const games = await getWeekGames(week);
  const out: FeaturedPlayer[] = [];
  for (const game of games) {
    for (const side of [game.home, game.away]) {
      const best = [...side.lineup]
        .filter((p) => p.position !== 'DEF' && p.position !== 'K')
        .sort((a, b) => b.points - a.points)[0];
      if (!best) continue;
      out.push({
        rosterId: side.rosterId,
        id: best.id,
        name: best.name,
        team: best.team ?? null,
        cutout: best.espnId ? ESPN_CUTOUT(best.espnId) : best.headshot,
        points: best.points,
      });
    }
  }
  return out.sort((a, b) => b.points - a.points);
}

function playerArt(player: FeaturedPlayer): StoryArt {
  const paint = teamPaint(player.team ?? undefined);
  return {
    kind: 'player',
    cutout: player.cutout,
    logo: player.team ? ESPN_TEAM_LOGO(player.team) : null,
    color: paint.background.startsWith('#') ? paint.background : '#16539a',
    name: player.name,
    points: player.points,
  };
}

/** Slug to art. Every article gets something when any clip or player exists. */
export function artForArticles(
  articles: Article[],
  highlights: Highlight[],
  managerByRoster: Record<string, string>,
  featured: FeaturedPlayer[] = [],
  photos: GamePhoto[] = []
): Record<string, StoryArt> {
  const out: Record<string, StoryArt> = {};
  if (!articles.length) return out;

  const usedClips = new Set<string>();
  const usedPlayers = new Set<number>();
  const usedPhotos = new Set<string>();
  // Ranked already, so the first unused one is always the best one left.
  const ranked = [...photos].sort((a, b) => b.score - a.score);
  const photoOf = (playerId: string | null) =>
    ranked.find(
      (photo) => !usedPhotos.has(photo.url) && (playerId ? photo.playerIds.includes(playerId) : true)
    );
  const takePhoto = (photo: GamePhoto): StoryArt => {
    usedPhotos.add(photo.url);
    return { kind: 'photo', src: photo.url, caption: photo.caption };
  };
  // Owned clips with a real still first: a story is about somebody here.
  const pool = highlights
    .filter((clip) => stillOf(clip))
    .sort((a, b) => Number(Boolean(b.ownerTeamId)) - Number(Boolean(a.ownerTeamId)));

  const haystackOf = (article: Article) =>
    [article.headline, article.deck, ...article.body].join(' ').toLowerCase();
  const namesOf = (rosterId: string) =>
    [managerByRoster[rosterId], firstNameOf(Number(rosterId))].filter((n): n is string => Boolean(n));

  for (const article of articles) {
    const haystack = haystackOf(article);

    // A real photograph of the manager's own best player beats everything.
    const hisPlayer = featured.find(
      (p) => !usedPlayers.has(p.rosterId) && namesOf(String(p.rosterId)).some((name) => mentions(haystack, name))
    );
    const hisPhoto = hisPlayer ? photoOf(hisPlayer.id) : undefined;
    if (hisPlayer && hisPhoto) {
      out[article.slug] = takePhoto(hisPhoto);
      usedPlayers.add(hisPlayer.rosterId);
      continue;
    }

    const clip = pool.find(
      (c) =>
        !usedClips.has(c.id) &&
        c.ownerTeamId &&
        namesOf(c.ownerTeamId).some((name) => mentions(haystack, name))
    );
    if (clip) {
      out[article.slug] = { kind: 'photo', src: stillOf(clip)! };
      usedClips.add(clip.id);
      continue;
    }
    // Then any photograph left. Every one that survives ranking names a
    // player somebody in this league rosters, so a real picture of the week
    // beats a headshot on a coloured card every time.
    const anyPhoto = photoOf(null);
    if (anyPhoto) {
      out[article.slug] = takePhoto(anyPhoto);
      if (hisPlayer) usedPlayers.add(hisPlayer.rosterId);
      continue;
    }

    const player = hisPlayer;
    if (player) {
      out[article.slug] = playerArt(player);
      usedPlayers.add(player.rosterId);
    }
  }

  for (const article of articles) {
    if (out[article.slug]) continue;
    const photo = photoOf(null);
    if (photo) {
      out[article.slug] = takePhoto(photo);
      continue;
    }
    const clip = pool.find((c) => !usedClips.has(c.id));
    if (clip) {
      out[article.slug] = { kind: 'photo', src: stillOf(clip)! };
      usedClips.add(clip.id);
      continue;
    }
    const player = featured.find((p) => !usedPlayers.has(p.rosterId));
    if (player) {
      out[article.slug] = playerArt(player);
      usedPlayers.add(player.rosterId);
    }
  }
  return out;
}
