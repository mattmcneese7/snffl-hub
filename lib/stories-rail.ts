// The manager stories rail, as data.
//
// This lived inline on Home, which was fine while Home was the only place it
// appeared. It belongs at the top of the Feed instead, and a rail assembled
// in two pages is a rail that drifts: two copies of which week to show, two
// copies of which card closes a manager's story, two chances to fix one and
// forget the other. So the assembly happens once, here, and a page just
// renders what it gets.

import { firstNameOf } from '../config/managers.ts';
import { getHighlights, isEspnClip, isRelevantClip } from './highlights.ts';
import { allPlayers, getWeekGames, scoredWeek, teamByRoster, teams } from './league.ts';
import { toReelClip, weekCardClip, type ReelClip } from './reel-clips.ts';
import type { Game, GameSide } from './types.ts';

export type StoryManager = {
  rosterId: number;
  firstName: string;
  avatarUrl: string | null;
  color: string;
  clips: ReelClip[];
};

type CardSide = { side: GameSide; opponent: GameSide; status: Game['status']; week: number };

/**
 * Every manager's story for the week worth showing.
 *
 * Only ESPN's clips, because they play inside the site: the NFL's YouTube
 * ones can only link out, so they stay in the Feed's list. The week in
 * progress leads as soon as it has playable clips, which makes the rail live
 * game highlights on a Sunday, and otherwise it is the week before.
 */
export async function storiesRail(
  currentWeek?: number
): Promise<{ week: number; managers: StoryManager[] }> {
  const week = currentWeek ?? (await scoredWeek());
  const name = (rosterId: number) =>
    firstNameOf(rosterId) ?? teamByRoster(rosterId)?.manager ?? '';

  const fantasyIds = new Set(
    allPlayers()
      .filter((player) => ['QB', 'RB', 'WR', 'TE', 'K'].includes(player.position))
      .map((player) => player.id)
  );
  const playableIn = async (w: number) =>
    (await getHighlights(w, 200)).filter(
      (clip) => isEspnClip(clip.id) && isRelevantClip(clip, (id) => fantasyIds.has(id))
    );

  const thisWeekClips = await playableIn(week);
  const storyWeek = thisWeekClips.length || week === 1 ? week : week - 1;
  const clips = storyWeek === week ? thisWeekClips : await playableIn(storyWeek);

  // The card that closes a story prefers his last finished matchup. A week in
  // progress is not a result: a card reading "beat Adam 35.30 to 18.48" off
  // one running back is a scoreboard mid quarter dressed up as a verdict.
  const storyGames = await getWeekGames(storyWeek).catch((): Game[] => []);
  const priorGames = storyWeek > 1 ? await getWeekGames(storyWeek - 1).catch((): Game[] => []) : [];
  const sidesOf = (list: Game[], atWeek: number) => {
    const out = new Map<number, CardSide>();
    for (const game of list) {
      out.set(game.home.rosterId, {
        side: game.home,
        opponent: game.away,
        status: game.status,
        week: atWeek,
      });
      out.set(game.away.rosterId, {
        side: game.away,
        opponent: game.home,
        status: game.status,
        week: atWeek,
      });
    }
    return out;
  };
  const current = sidesOf(storyGames, storyWeek);
  const prior = sidesOf(priorGames, storyWeek - 1);
  const cardFor = (rosterId: number): CardSide | null => {
    const now = current.get(rosterId) ?? null;
    const before = prior.get(rosterId) ?? null;
    if (now?.status === 'final') return now;
    if (before?.status === 'final') return before;
    // Nothing finished yet, so his game in progress is the honest card.
    if (now && (now.side.points > 0 || now.opponent.points > 0)) return now;
    return before ?? now;
  };

  const managers = teams.map((team) => {
    const first = name(team.rosterId);
    const reels = clips
      .filter((clip) => clip.ownerTeamId === String(team.rosterId))
      .map((clip) => toReelClip(clip, first));
    const own = cardFor(team.rosterId);
    return {
      rosterId: team.rosterId,
      firstName: first,
      avatarUrl: team.avatarUrl,
      color: team.colors?.primary ?? '#5d6a86',
      // His week closes the story, and is the whole of it when ESPN has no
      // clip of anybody he started.
      clips: own
        ? [
            ...reels,
            weekCardClip(
              own.side,
              own.opponent,
              first,
              name(own.opponent.rosterId),
              own.week,
              own.status
            ),
          ]
        : reels,
    };
  });

  return { week: storyWeek, managers };
}
