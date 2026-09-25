// The week in 90 seconds, Checkpoint 10.
//
// Five slides built from what already happened, in the order the week reads:
// here is the week, here is who won it, here is who paid for it, here is the
// play everyone will mention, and here is what it did to the table.
//
// Every slide is data, not markup, so the same five drive the on screen story
// and the share images without either one restating the other.

import {
  espnClipId,
  getHighlights,
  isEspnClip,
  stillFor,
  type Highlight,
} from './highlights.ts';
import { getSeasonResults, getWeekGames, teamByRoster, teams } from './league.ts';
import { awardsForWeek, type Award } from './trophies.ts';
import { photosForWeek, type GamePhoto } from './game-photos.ts';
import { clipSource } from './espn-playback.ts';

/**
 * The picture behind a slide.
 *
 * A still always, and an ESPN clip id where the backdrop came from a playable
 * one, so the slide can run the footage rather than a frame of it. Black
 * behind a slide about somebody's week is the one background that says
 * nothing about it.
 */
export type Backdrop = { still: string | null; espnId: string | null };

export type StorySlide =
  | {
      kind: 'intro';
      week: number;
      games: number;
      topScore: number;
      topTeam: string;
      art: Backdrop;
    }
  | {
      kind: 'motw';
      week: number;
      rosterId: number;
      team: string;
      manager: string;
      value: number;
      detail: string;
      art: Backdrop;
      avatar: string | null;
      /** The starter who actually did it, for the slide to celebrate. */
      star: { name: string; headshot: string; points: number } | null;
    }
  | {
      kind: 'shart';
      week: number;
      rosterId: number;
      team: string;
      manager: string;
      value: number;
      detail: string;
      art: Backdrop;
      avatar: string | null;
      /** His best starter, which on this slide is the joke rather than the
          boast: this was the most anyone on the roster managed. */
      star: { name: string; headshot: string; points: number } | null;
    }
  | {
      kind: 'play';
      week: number;
      headline: string;
      still: string | null;
      points: number | null;
      manager: string | null;
      clipId: string;
      /** Resolved server side. The slide does not exist without it. */
      video: string;
      art: Backdrop;
    }
  | {
      kind: 'shakeup';
      week: number;
      movers: { rosterId: number; team: string; manager: string; from: number; to: number }[];
      art: Backdrop;
    };

/** Seeds from results alone, sorted the way the standings page sorts. */
function seedsAfter(
  results: { rosterId: number; points: number; won: boolean; week: number }[],
  throughWeek: number
): Map<number, number> {
  const tally = new Map<number, { wins: number; points: number }>();
  for (const team of teams) tally.set(team.rosterId, { wins: 0, points: 0 });
  for (const row of results) {
    if (row.week > throughWeek) continue;
    const t = tally.get(row.rosterId);
    if (!t) continue;
    if (row.won) t.wins += 1;
    t.points += row.points;
  }
  const order = [...tally.entries()].sort(
    (a, b) => b[1].wins - a[1].wins || b[1].points - a[1].points
  );
  return new Map(order.map(([rosterId], i) => [rosterId, i + 1]));
}

const named = (rosterId: number) => {
  const team = teamByRoster(rosterId);
  return { team: team?.teamName ?? `Roster ${rosterId}`, manager: team?.manager ?? '' };
};

/**
 * A slide's picture, in the order of what is actually worth looking at.
 *
 * A wire photograph of this manager's own player first. These are the same
 * ranked, captioned stadium shots the Rag leads with, already collected for
 * the week and tagged with the Sleeper ids named in each caption, so a slide
 * about somebody's week can show a player he actually started.
 *
 * Then a clip still, then the manager's avatar as a last resort. The avatar
 * is a passport photo blown up: it says whose slide this is and nothing about
 * the football, so it is the floor rather than the plan.
 */
const artOf = (
  photo: GamePhoto | null,
  clip: Highlight | null | undefined,
  avatar: string | null = null
): Backdrop => ({
  still: photo?.url ?? (clip ? stillFor(clip) : null) ?? avatar,
  espnId: clip && isEspnClip(clip.id) ? espnClipId(clip.id) : null,
});

const avatarOf = (rosterId: number) => teamByRoster(rosterId)?.avatarUrl ?? null;

/**
 * A clip belonging to this manager, preferring one with a picture.
 *
 * A slide about somebody's week should have that manager's football behind
 * it, not a stock frame. Where he has no clip at all the caller falls back to
 * the week's best, which is at least this league's football.
 */
function clipFor(clips: Highlight[], rosterId: number): Highlight | null {
  const his = clips.filter((clip) => Number(clip.ownerTeamId) === rosterId);
  const withArt = his.filter((clip) => stillFor(clip));
  const pool = withArt.length ? withArt : his;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => (b.fantasyPoints ?? 0) - (a.fantasyPoints ?? 0))[0];
}

/** The pick of the week's clips: the one worth the most points. */
function bestPlay(clips: Highlight[]): Highlight | null {
  const scored = clips.filter((clip) => clip.fantasyPoints != null);
  const pool = scored.length ? scored : clips;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => (b.fantasyPoints ?? 0) - (a.fantasyPoints ?? 0))[0];
}

/**
 * The best play of the week that can actually be played.
 *
 * A slide promising a highlight and showing a photograph of one is worse than
 * no slide. ESPN prunes clips within days, so being in our table is not proof
 * the video still exists: each candidate is resolved, best first, and the
 * first one that hands back a file wins. If none do, the week has no top play
 * slide, which is the honest outcome.
 *
 * Capped at six attempts. A week where the top six are all dead is a week
 * with no playable footage, and the seventh is not going to save it.
 */
async function bestPlayable(
  clips: Highlight[]
): Promise<{ clip: Highlight; video: string } | null> {
  const candidates = clips
    .filter((clip) => isEspnClip(clip.id))
    .sort((a, b) => (b.fantasyPoints ?? 0) - (a.fantasyPoints ?? 0))
    .slice(0, 6);

  for (const clip of candidates) {
    const source = await clipSource(espnClipId(clip.id)).catch(() => null);
    if (source?.mp4) return { clip, video: source.mp4 };
  }
  return null;
}

/**
 * Build the week's story, or an empty list while the week is still being
 * played. A story about a week in progress would be wrong by Sunday night,
 * and awardsForWeek already refuses to hand out trophies before every game is
 * final, so an empty award list is the signal to stay quiet.
 */
export async function weekStory(week: number, taken: Iterable<string> = []): Promise<StorySlide[]> {
  if (week < 1) return [];

  const [awards, results, clips, games] = await Promise.all([
    awardsForWeek(week).catch((): Award[] => []),
    getSeasonResults(week).catch(() => []),
    getHighlights(week).catch((): Highlight[] => []),
    getWeekGames(week).catch(() => []),
  ]);
  if (!awards.length) return [];

  const slides: StorySlide[] = [];
  const thisWeek = results.filter((row) => row.week === week);
  const top = [...thisWeek].sort((a, b) => b.points - a.points)[0];
  // The week's best clip, used wherever a slide has no manager of its own.
  const house = bestPlay(clips);

  // The week's wire photographs, ranked, and a way to find the best one
  // showing somebody this manager actually started. A photo of his own player
  // beats the league's best photo, which beats nothing.
  const photos = photosForWeek(week);
  const startersOf = (rosterId: number): Set<string> => {
    for (const game of games) {
      for (const side of [game.away, game.home]) {
        if (side.rosterId === rosterId) return new Set(side.lineup.map((slot) => slot.id));
      }
    }
    return new Set();
  };

  /**
   * One photograph, once, anywhere on the site.
   *
   * The pool for a week is a dozen or so pictures and several things want
   * one, so a photo handed out twice is not a near miss, it is the same
   * picture appearing twice on one screen. Whatever the Rag has already
   * claimed arrives in `taken`, every slide adds its own pick to it, and a
   * picture is never reused.
   *
   * Preference in order: a photograph naming somebody this manager actually
   * started, then the best unclaimed one left, then nothing, which is a
   * clean fall through to a clip still rather than a repeat.
   */
  const used = new Set<string>(taken);
  const photoFor = (rosterId: number): GamePhoto | null => {
    const mine = startersOf(rosterId);
    const free = photos.filter((photo) => !used.has(photo.url));
    // Ranked already, so the first match is the best one left.
    const pick = free.find((photo) => photo.playerIds.some((id) => mine.has(id))) ?? free[0] ?? null;
    if (pick) used.add(pick.url);
    return pick;
  };
  const anyPhoto = (): GamePhoto | null => {
    const pick = photos.find((photo) => !used.has(photo.url)) ?? null;
    if (pick) used.add(pick.url);
    return pick;
  };

  slides.push({
    kind: 'intro',
    week,
    games: thisWeek.length / 2,
    topScore: top?.points ?? 0,
    topTeam: top ? named(top.rosterId).team : '',
    art: artOf(
      top ? photoFor(top.rosterId) : anyPhoto(),
      top ? (clipFor(clips, top.rosterId) ?? house) : house,
      top ? avatarOf(top.rosterId) : null
    ),
  });

  // The top starter on a roster this week, which is who a celebration is
  // actually about.
  const starFor = (rosterId: number) => {
    for (const game of games) {
      for (const side of [game.away, game.home]) {
        if (side.rosterId !== rosterId) continue;
        const best = [...side.lineup].sort((a, b) => b.points - a.points)[0];
        if (!best) return null;
        return { name: best.name, headshot: best.headshot, points: best.points };
      }
    }
    return null;
  };

  for (const award of awards) {
    if (award.kind === 'motw') {
      slides.push({
        kind: 'motw',
        week,
        rosterId: award.rosterId,
        ...named(award.rosterId),
        value: award.value,
        detail: award.detail,
        art: artOf(
          photoFor(award.rosterId),
          clipFor(clips, award.rosterId) ?? house,
          avatarOf(award.rosterId)
        ),
        avatar: avatarOf(award.rosterId),
        star: starFor(award.rosterId),
      });
    }
    if (award.kind === 'shart') {
      slides.push({
        kind: 'shart',
        week,
        rosterId: award.rosterId,
        ...named(award.rosterId),
        value: award.value,
        detail: award.detail,
        art: artOf(
          photoFor(award.rosterId),
          clipFor(clips, award.rosterId) ?? house,
          avatarOf(award.rosterId)
        ),
        avatar: avatarOf(award.rosterId),
        star: starFor(award.rosterId),
      });
    }
  }

  const playable = await bestPlayable(clips);
  if (playable) {
    const play = playable.clip;
    slides.push({
      kind: 'play',
      week,
      headline: play.title,
      video: playable.video,
      still: stillFor(play),
      points: play.fantasyPoints ?? null,
      manager: play.ownerTeamId ? (named(Number(play.ownerTeamId)).manager ?? null) : null,
      clipId: play.id,
      // The owner's face as the floor, same as every other slide. Without it
      // an ESPN clip with no stored thumbnail left this one slide black.
      art: artOf(
        play.ownerTeamId ? photoFor(Number(play.ownerTeamId)) : anyPhoto(),
        play,
        play.ownerTeamId ? avatarOf(Number(play.ownerTeamId)) : null
      ),
    });
  }

  // Seed movement across this week only, biggest first. Ties and no movement
  // are dropped: a slide saying nobody moved is a slide nobody needs.
  const before = seedsAfter(results, week - 1);
  const after = seedsAfter(results, week);
  const movers = teams
    .map((team) => ({
      rosterId: team.rosterId,
      ...named(team.rosterId),
      from: before.get(team.rosterId) ?? 0,
      to: after.get(team.rosterId) ?? 0,
    }))
    .filter((m) => m.from && m.to && m.from !== m.to)
    .sort((a, b) => Math.abs(b.from - b.to) - Math.abs(a.from - a.to))
    .slice(0, 4);
  if (movers.length) {
    slides.push({
      kind: 'shakeup',
      week,
      movers,
      art: artOf(
        photoFor(movers[0].rosterId),
        clipFor(clips, movers[0].rosterId) ?? house,
        avatarOf(movers[0].rosterId)
      ),
    });
  }

  return slides;
}

/**
 * The most recent week that actually has a story.
 *
 * Callers know the week the league is in, which during play is a week with no
 * trophies handed out yet and so no story. Rather than make every caller
 * guess how far back to look, this walks back until it finds a finished week,
 * which is at most a couple of hops and is exactly what a reader means by
 * "the week".
 */
export async function latestWeekStory(
  currentWeek: number,
  lookBack = 2
): Promise<StorySlide[]> {
  for (let week = currentWeek; week > currentWeek - lookBack - 1 && week >= 1; week--) {
    const slides = await weekStory(week).catch((): StorySlide[] => []);
    if (slides.length) return slides;
  }
  return [];
}
