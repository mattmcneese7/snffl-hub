// Per player season lines, built from the same weekly games the rest of the
// site reads, so a player page never disagrees with a matchup page.

import { allPlayers, getWeekGames, playerOf, scoredWeek, teams } from './league.ts';
import { getRosters } from './sleeper.ts';
import type { PlayerLite } from './types.ts';

export type PlayerWeek = {
  week: number;
  points: number;
  started: boolean;
  won: boolean;
};

export type PlayerSeason = {
  player: PlayerLite;
  ownerRosterId: number | null;
  totalPoints: number;
  startedPoints: number;
  weeks: PlayerWeek[];
};

/** playerId to the roster that currently holds them. */
export async function getOwnership(): Promise<Map<string, number>> {
  const owned = new Map<string, number>();
  try {
    const rosters = await getRosters();
    for (const roster of rosters) {
      for (const playerId of roster.players ?? []) owned.set(playerId, roster.roster_id);
    }
  } catch {
    // Fall back to the nightly starters if the live call fails.
    for (const team of teams) {
      for (const playerId of team.starters) owned.set(playerId, team.rosterId);
    }
  }
  return owned;
}

async function seasonLines(): Promise<Map<string, PlayerWeek[]>> {
  const week = await scoredWeek();
  const weeks = Array.from({ length: week }, (_, i) => i + 1);
  const perWeek = await Promise.all(weeks.map((w) => getWeekGames(w)));

  const lines = new Map<string, PlayerWeek[]>();
  for (const games of perWeek) {
    for (const game of games) {
      if (game.status === 'pending') continue;
      for (const side of [game.home, game.away]) {
        const won = game.winner === side.rosterId;
        for (const entry of side.lineup) {
          const list = lines.get(entry.id) ?? [];
          list.push({ week: game.week, points: entry.points, started: true, won });
          lines.set(entry.id, list);
        }
        for (const entry of side.bench ?? []) {
          const list = lines.get(entry.id) ?? [];
          list.push({ week: game.week, points: entry.points, started: false, won });
          lines.set(entry.id, list);
        }
      }
    }
  }
  return lines;
}

export async function getPlayerSeason(playerId: string): Promise<PlayerSeason> {
  const [lines, owned] = await Promise.all([seasonLines(), getOwnership()]);
  const weeks = (lines.get(playerId) ?? []).sort((a, b) => a.week - b.week);

  return {
    player: playerOf(playerId),
    ownerRosterId: owned.get(playerId) ?? null,
    totalPoints: Number(weeks.reduce((sum, w) => sum + w.points, 0).toFixed(2)),
    startedPoints: Number(
      weeks.filter((w) => w.started).reduce((sum, w) => sum + w.points, 0).toFixed(2)
    ),
    weeks,
  };
}

/**
 * Every player we carry, owned and free agent alike, for the Players browser.
 *
 * Ownership comes from the live Sleeper rosters. When that call fails,
 * getOwnership falls back to the nightly starters, which is 126 players rather
 * than the full rosters, so bench players would read as free agents. The
 * fallback is reported rather than hidden: the browser says when ownership is
 * degraded instead of stating it as fact.
 */
export async function getPlayerDirectory(): Promise<{
  players: PlayerSeason[];
  ownershipComplete: boolean;
}> {
  const [lines, owned] = await Promise.all([seasonLines(), getOwnership()]);

  // A full roster is about 15 per team. Anything near the starter count means
  // the live call did not answer and the nightly starters are standing in.
  const ownershipComplete = owned.size > teams.length * 10;

  const out: PlayerSeason[] = allPlayers().map((player) => {
    const weeks = (lines.get(player.id) ?? []).sort((a, b) => a.week - b.week);
    return {
      player,
      ownerRosterId: owned.get(player.id) ?? null,
      totalPoints: Number(weeks.reduce((sum, w) => sum + w.points, 0).toFixed(2)),
      startedPoints: Number(
        weeks.filter((w) => w.started).reduce((sum, w) => sum + w.points, 0).toFixed(2)
      ),
      weeks,
    };
  });

  out.sort((a, b) => b.totalPoints - a.totalPoints);
  return { players: out, ownershipComplete };
}

/** Rostered players only, best season first. All 876 would be a phone book. */
export async function getRosteredPlayers(): Promise<PlayerSeason[]> {
  const [lines, owned] = await Promise.all([seasonLines(), getOwnership()]);

  const out: PlayerSeason[] = [];
  for (const [playerId, rosterId] of owned) {
    const weeks = (lines.get(playerId) ?? []).sort((a, b) => a.week - b.week);
    out.push({
      player: playerOf(playerId),
      ownerRosterId: rosterId,
      totalPoints: Number(weeks.reduce((sum, w) => sum + w.points, 0).toFixed(2)),
      startedPoints: Number(
        weeks.filter((w) => w.started).reduce((sum, w) => sum + w.points, 0).toFixed(2)
      ),
      weeks,
    });
  }

  return out.sort((a, b) => b.totalPoints - a.totalPoints);
}
