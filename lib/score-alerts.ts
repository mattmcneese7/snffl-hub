// Close finishes and final scores, Checkpoint 12b.
//
// These are the two alerts a manager actually wants on a Sunday evening and
// neither existed: the watcher only ever announced touchdowns and lead
// changes, which is why notifications read as random score updates.
//
//   close finish   your matchup is inside eight points with barely any
//                  football left to play, so it is worth watching
//   final          how your week ended, once every game in it is over
//
// Both are addressed to the two managers in the matchup and nobody else, and
// both are worded from that manager's side: you are up, you won, you lost.
//
// The watcher runs every minute, so each alert is claimed in alert_claims
// before it is sent. Without the claim a close finish would arrive sixty times
// an hour. A database without the table sends nothing rather than spamming.

import { claimAlerts, type Claim } from './alert-claims.ts';
import { fractionRemaining, gamesByTeam, toSleeperTeam, type NflGame } from './gameday.ts';
import { sendAlert } from './push.ts';
import type { Game, GameSide } from './types.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Inside this many points counts as close. */
const CLOSE_MARGIN = 8;
/** And this much football left, counted in whole player games. */
const CLOSE_REMAINING = 2.5;

const fmt = (n: number) => n.toFixed(2);

/** How many player games are left in one lineup, 1 per starter yet to kick off. */
function remainingFor(side: GameSide, left: Map<string, number>): number {
  return side.lineup.reduce((sum, player) => sum + (left.get(player.team ?? '') ?? 0), 0);
}

export type ScoreAlertResult = { sent: number; note: string };

export async function scoreAlerts(input: {
  client: SupabaseClient;
  games: Game[];
  nfl: NflGame[];
  week: number;
  managerOf: Map<number, string>;
  log?: (line: string) => void;
}): Promise<ScoreAlertResult> {
  const { client, games, nfl, week, managerOf } = input;
  const log = input.log ?? (() => {});

  // Share of each NFL team's game still to play, keyed the way rosters spell
  // team names rather than the way ESPN does.
  const left = new Map<string, number>();
  for (const [abbr, entry] of gamesByTeam(nfl)) {
    left.set(toSleeperTeam(abbr), fractionRemaining(entry.game));
  }

  const nameOf = (rosterId: number) => managerOf.get(rosterId) ?? 'your opponent';
  const candidates: { claim: Claim; rosterId: number; alert: 'close_finish' | 'final'; title: string; body: string; tag: string }[] = [];

  for (const game of games) {
    const sides: [GameSide, GameSide][] = [
      [game.home, game.away],
      [game.away, game.home],
    ];

    if (game.status === 'final') {
      for (const [side, other] of sides) {
        const won = side.points > other.points;
        const tied = side.points === other.points;
        candidates.push({
          claim: { key: `final:${week}:${game.matchupId}:${side.rosterId}`, week, kind: 'final' },
          rosterId: side.rosterId,
          alert: 'final',
          title: tied ? `Week ${week} ended in a tie` : won ? `You won Week ${week}` : `You lost Week ${week}`,
          body: `${fmt(side.points)} to ${fmt(other.points)} against ${nameOf(other.rosterId)}.`,
          tag: `final-${week}`,
        });
      }
      continue;
    }

    if (game.status !== 'live') continue;
    const remaining = remainingFor(game.home, left) + remainingFor(game.away, left);
    const margin = Math.abs(game.home.points - game.away.points);
    if (margin > CLOSE_MARGIN || remaining > CLOSE_REMAINING) continue;

    for (const [side, other] of sides) {
      const ahead = side.points > other.points;
      candidates.push({
        claim: { key: `close:${week}:${game.matchupId}:${side.rosterId}`, week, kind: 'close_finish' },
        rosterId: side.rosterId,
        alert: 'close_finish',
        title: ahead ? `You are up ${fmt(margin)}` : `You are down ${fmt(margin)}`,
        body: `${fmt(side.points)} to ${fmt(other.points)} against ${nameOf(other.rosterId)}, and almost everybody is done.`,
        tag: `close-${week}-${game.matchupId}`,
      });
    }
  }

  if (!candidates.length) return { sent: 0, note: 'no close finishes or finals' };

  const won = await claimAlerts(
    candidates.map((candidate) => candidate.claim),
    client
  );
  if (!won.size) return { sent: 0, note: `${candidates.length} candidates, all already sent` };

  let sent = 0;
  for (const candidate of candidates) {
    if (!won.has(candidate.claim.key)) continue;
    const delivered = await sendAlert(
      { alert: candidate.alert, teamIds: [String(candidate.rosterId)] },
      { title: candidate.title, body: candidate.body, url: `/matchups/${week}`, tag: candidate.tag }
    );
    sent += delivered;
    log(`  ${candidate.alert}: ${candidate.title} for ${nameOf(candidate.rosterId)} (${delivered} devices)`);
  }
  return { sent, note: `${won.size} new of ${candidates.length}, ${sent} deliveries` };
}
