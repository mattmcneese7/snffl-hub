// Turns a Game into the plain data the split card renders from.
//
// Lives here rather than in a page file: App Router pages should export a
// default plus Next's own known names, not general utilities, and the matchup
// detail page needs this too.

import type { FeatureData, FeatureSide } from '@/components/FeatureMatchup';
import { teamByRoster } from './league.ts';
import type { Game, GameSide } from './types.ts';

function toSide(side: GameSide, status: Game['status']): FeatureSide {
  const team = teamByRoster(side.rosterId);
  return {
    rosterId: side.rosterId,
    teamName: team?.teamName ?? side.team,
    manager: team?.manager ?? side.manager,
    avatarUrl: team?.avatarUrl ?? null,
    primary: team?.colors?.primary ?? '#72809f',
    points: side.points,
    // Approximate until per player game status arrives with the live layer in
    // Checkpoint 7: a live game counts starters still on zero.
    toPlay: status === 'live' ? side.lineup.filter((p) => p.points === 0).length : 0,
  };
}

export function toFeature(game: Game, label: string): FeatureData {
  return {
    label,
    week: game.week,
    matchupId: game.matchupId,
    status: game.status,
    margin: game.margin,
    away: toSide(game.away, game.status),
    home: toSide(game.home, game.status),
  };
}
