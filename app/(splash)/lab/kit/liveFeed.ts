import { firstNameOf } from '@/config/managers';
import { teamByRoster } from '@/lib/league';
import { markInPlay, winProbabilities, type LiveSide, type MatchupContext } from '@/lib/matchup-live';
import type { Game } from '@/lib/types';

/**
 * The v4 lab's live feed (served by /api/lab/live, and built on render by the shell): every matchup this week, compact, for clients that
 * poll it (the island, the gamecast, scoring toasts). Real Sleeper scores and
 * the app's own win model; nothing invented. Clients diff successive reads to
 * find who just scored.
 */

export type LabStarter = {
  id: string;
  name: string;
  slot: string;
  position: string;
  team: string | null;
  headshot: string | null;
  points: number;
  projected: number | null;
  gameState: 'pre' | 'in' | 'post' | 'bye';
  statLine: string;
  remaining: number;
};
export type LabSide = {
  rosterId: number;
  team: string;
  manager: string;
  firstName: string;
  avatarUrl: string | null;
  color: string | null;
  points: number;
  projected: number;
  expected: number;
  winProb: number;
  yetToPlay: number;
  inPlay: number;
  done: number;
  starters: LabStarter[];
};
export type LabGame = { matchupId: number; status: 'pending' | 'live' | 'final'; inPlay: boolean; away: LabSide; home: LabSide };
export type LabLive = { week: number; at: string; anyLive: boolean; games: LabGame[] };

function side(s: LiveSide): LabSide {
  const team = teamByRoster(s.rosterId);
  return {
    rosterId: s.rosterId,
    team: s.team,
    manager: s.manager,
    firstName: firstNameOf(s.rosterId) ?? s.manager,
    avatarUrl: team?.avatarUrl ?? null,
    color: team?.colors?.primary ?? null,
    points: s.points,
    projected: s.projectedTotal,
    expected: s.expected,
    winProb: s.winProb,
    yetToPlay: s.yetToPlay,
    inPlay: s.inPlay,
    done: s.done,
    starters: s.lineup.map((p) => ({
      id: p.id,
      name: p.name,
      slot: p.slot,
      position: p.position,
      team: p.team ?? null,
      headshot: p.headshot || null,
      points: p.points,
      projected: p.projected,
      gameState: p.gameState,
      statLine: p.statLine,
      remaining: Number(p.remaining.toFixed(3)),
    })),
  };
}

/** Build the feed from games and context already in hand (the shell does this on render). */
export function buildLabLive(week: number, raw: Game[], ctx: MatchupContext): LabLive {
  const games = markInPlay(raw, ctx.nfl);
  const probs = winProbabilities(games, ctx);
  return {
    week,
    at: new Date().toISOString(),
    anyLive: ctx.nfl.some((g) => g.state === 'in'),
    games: games.map((g) => {
      const live = probs.get(g.matchupId)!;
      return { matchupId: g.matchupId, status: g.status, inPlay: Boolean(g.inPlay), away: side(live.away), home: side(live.home) };
    }),
  };
}

