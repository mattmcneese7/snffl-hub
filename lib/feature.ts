// Turns a Game into the plain data the scoreboard card renders from.
//
// Lives here rather than in a page file: App Router pages should export a
// default plus Next's own known names, not general utilities, and the matchup
// detail page needs this too.

import type { FeatureData, FeatureSide } from '@/components/FeatureMatchup';
import { firstNameOf } from '../config/managers.ts';
import { teamByRoster } from './league.ts';
import type { LiveMatchup, LiveSide } from './matchup-live.ts';
import type { Game, GameSide } from './types.ts';

function toSide(side: GameSide, status: Game['status'], live?: LiveSide): FeatureSide {
  const team = teamByRoster(side.rosterId);
  const record = team ? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}` : '';
  return {
    rosterId: side.rosterId,
    teamName: team?.teamName ?? side.team,
    manager: firstNameOf(side.rosterId) ?? team?.manager ?? side.manager,
    avatarUrl: team?.avatarUrl ?? null,
    primary: team?.colors?.primary ?? '#72809f',
    record,
    points: side.points,
    projected: live ? live.projectedTotal : null,
    expected: live ? live.expected : null,
    winProb: live ? live.winProb : null,
    // Without the live model, a live game counts starters still on zero. With
    // it, each starter's own NFL game decides.
    yetToPlay: live
      ? live.yetToPlay
      : status === 'live'
        ? side.lineup.filter((p) => p.points === 0).length
        : status === 'pending'
          ? side.lineup.length
          : 0,
    inPlay: live ? live.inPlay : 0,
    done: live ? live.done : 0,
  };
}

export function toFeature(game: Game, label: string, live?: LiveMatchup): FeatureData {
  return {
    label,
    week: game.week,
    matchupId: game.matchupId,
    status: game.status,
    margin: game.margin,
    away: toSide(game.away, game.status, live?.away),
    home: toSide(game.home, game.status, live?.home),
  };
}
