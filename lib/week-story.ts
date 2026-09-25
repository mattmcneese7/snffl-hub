// The week in 90 seconds, Checkpoint 10.
//
// Five slides built from what already happened, in the order the week reads:
// here is the week, here is who won it, here is who paid for it, here is the
// play everyone will mention, and here is what it did to the table.
//
// Every slide is data, not markup, so the same five drive the on screen story
// and the share images without either one restating the other.

import { getHighlights, stillFor, type Highlight } from './highlights.ts';
import { getSeasonResults, teamByRoster, teams } from './league.ts';
import { awardsForWeek, type Award } from './trophies.ts';

export type StorySlide =
  | { kind: 'intro'; week: number; games: number; topScore: number; topTeam: string }
  | {
      kind: 'motw';
      week: number;
      rosterId: number;
      team: string;
      manager: string;
      value: number;
      detail: string;
    }
  | {
      kind: 'shart';
      week: number;
      rosterId: number;
      team: string;
      manager: string;
      value: number;
      detail: string;
    }
  | {
      kind: 'play';
      week: number;
      headline: string;
      still: string | null;
      points: number | null;
      manager: string | null;
      clipId: string;
    }
  | {
      kind: 'shakeup';
      week: number;
      movers: { rosterId: number; team: string; manager: string; from: number; to: number }[];
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

/** The pick of the week's clips: the one worth the most points. */
function bestPlay(clips: Highlight[]): Highlight | null {
  const scored = clips.filter((clip) => clip.fantasyPoints != null);
  const pool = scored.length ? scored : clips;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => (b.fantasyPoints ?? 0) - (a.fantasyPoints ?? 0))[0];
}

/**
 * Build the week's story, or an empty list while the week is still being
 * played. A story about a week in progress would be wrong by Sunday night,
 * and awardsForWeek already refuses to hand out trophies before every game is
 * final, so an empty award list is the signal to stay quiet.
 */
export async function weekStory(week: number): Promise<StorySlide[]> {
  if (week < 1) return [];

  const [awards, results, clips] = await Promise.all([
    awardsForWeek(week).catch((): Award[] => []),
    getSeasonResults(week).catch(() => []),
    getHighlights(week).catch((): Highlight[] => []),
  ]);
  if (!awards.length) return [];

  const slides: StorySlide[] = [];
  const thisWeek = results.filter((row) => row.week === week);
  const top = [...thisWeek].sort((a, b) => b.points - a.points)[0];

  slides.push({
    kind: 'intro',
    week,
    games: thisWeek.length / 2,
    topScore: top?.points ?? 0,
    topTeam: top ? named(top.rosterId).team : '',
  });

  for (const kind of ['motw', 'shart'] as const) {
    const award = awards.find((a) => a.kind === kind);
    if (!award) continue;
    slides.push({
      kind,
      week,
      rosterId: award.rosterId,
      ...named(award.rosterId),
      value: award.value,
      detail: award.detail,
    });
  }

  const play = bestPlay(clips);
  if (play) {
    slides.push({
      kind: 'play',
      week,
      headline: play.title,
      still: stillFor(play),
      points: play.fantasyPoints ?? null,
      manager: play.ownerTeamId ? (named(Number(play.ownerTeamId)).manager ?? null) : null,
      clipId: play.id,
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
  if (movers.length) slides.push({ kind: 'shakeup', week, movers });

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
