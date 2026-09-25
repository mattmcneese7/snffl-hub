// Lineup alerts, Checkpoint 12b.
//
// The costly fantasy mistake is a starter who will not play: ruled out,
// inactive, on bye, or an empty slot. This finds those in every lineup before
// the player's game locks and pushes to that manager alone, with a link to the
// matchup page, where the Set Lineup button goes straight to Sleeper.
//
// Two moments per problem:
//   when it appears   the first run that sees a starter Out, Doubtful and so on
//   the final call    within 100 minutes of his kickoff, if he is still there,
//                     which is when inactives come out and people check phones
//
// Each alert is recorded in lineup_alerts under a key of week, player and
// moment, so a player alerts once per status however often the watcher runs,
// and two overlapping runs cannot both send it. Questionable is left alone:
// half the league is Questionable on a Friday and most of them play.

import { firstNameOf } from '../config/managers.ts';
import { getNflGames, gamesByTeam, type TeamGame } from './gameday.ts';
import { getWeekGames, league } from './league.ts';
import { pushConfigured, sendAlert } from './push.ts';
import { getState } from './sleeper.ts';
import { getWeekProjectionLines } from './sleeper-live.ts';
import { writeClient } from './supabase.ts';
import type { LineupSlot } from './types.ts';

const ALERT_STATUSES = new Set(['Out', 'Doubtful', 'IR', 'Sus', 'PUP', 'NA', 'DNR']);
const STATUS_WORDS: Record<string, string> = {
  Out: 'is OUT',
  Doubtful: 'is DOUBTFUL',
  IR: 'is on IR',
  Sus: 'is SUSPENDED',
  PUP: 'is on the PUP list',
  NA: 'is not active',
  DNR: 'is not on a roster',
};
/** How far ahead of kickoff the final call goes out. */
const FINAL_CALL_MS = 100 * 60 * 1000;
/** Nothing is checked unless a game kicks off within this window. */
const HORIZON_MS = 36 * 60 * 60 * 1000;

export type LineupProblem = {
  rosterId: number;
  matchupId: number;
  player: LineupSlot;
  /** A Sleeper status, or Bye or Empty. */
  status: string;
  kickoff: string | null;
};

function kickoffLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  })
    .format(new Date(iso))
    .replace(':00', '');
}

/** Every starter across the league who will not play and can still be moved. */
export async function findLineupProblems(week: number): Promise<LineupProblem[]> {
  const [games, nfl, lines] = await Promise.all([
    getWeekGames(week),
    getNflGames(week, league.season),
    getWeekProjectionLines(league.season, week),
  ]);
  const byTeam = gamesByTeam(nfl);
  const out: LineupProblem[] = [];

  for (const game of games) {
    for (const side of [game.home, game.away]) {
      for (const slot of side.lineup) {
        // Sleeper marks an unfilled slot with the id "0".
        if (!slot.id || slot.id === '0') {
          out.push({ rosterId: side.rosterId, matchupId: game.matchupId, player: slot, status: 'Empty', kickoff: null });
          continue;
        }
        const nflGame: TeamGame | undefined = slot.team ? byTeam.get(slot.team) : undefined;
        // Once his game has started the slot is locked, so there is nothing
        // left to tell anyone.
        if (nflGame && nflGame.game.state !== 'pre') continue;
        if (!nflGame) {
          if (slot.team && nfl.length) {
            out.push({ rosterId: side.rosterId, matchupId: game.matchupId, player: slot, status: 'Bye', kickoff: null });
          }
          continue;
        }
        const status = lines[slot.id]?.injury ?? null;
        if (status && ALERT_STATUSES.has(status)) {
          out.push({
            rosterId: side.rosterId,
            matchupId: game.matchupId,
            player: slot,
            status,
            kickoff: nflGame.game.kickoff,
          });
        }
      }
    }
  }
  return out;
}

function message(problem: LineupProblem) {
  const first = firstNameOf(problem.rosterId);
  const who = problem.player.name;
  const slot = problem.player.slot;
  const title = `Fix your lineup${first ? `, ${first}` : ''}`;
  if (problem.status === 'Empty') {
    return { title, body: `Your ${slot} slot is empty. Nobody scores from an empty slot.` };
  }
  if (problem.status === 'Bye') {
    return { title, body: `${who} is on bye and still in your ${slot} slot.` };
  }
  const when = problem.kickoff ? ` Kickoff ${kickoffLabel(problem.kickoff)}.` : '';
  return {
    title,
    body: `${who} ${STATUS_WORDS[problem.status] ?? `is ${problem.status}`} and still in your ${slot} slot.${when}`,
  };
}

export async function runLineupAlerts(log: (line: string) => void = () => {}) {
  const supabase = writeClient();
  if (!supabase) return { sent: 0, note: 'no Supabase service credentials' };
  if (!pushConfigured()) return { sent: 0, note: 'no VAPID keys' };

  let week: number;
  try {
    const state = await getState();
    week = Math.max(1, state.week || state.display_week || 1);
  } catch {
    return { sent: 0, note: 'Sleeper state unavailable' };
  }

  // Cheap exit on the days nothing is close: one cached ESPN call.
  const nfl = await getNflGames(week, league.season);
  const now = Date.now();
  const soon = nfl.some(
    (game) => game.state === 'in' || (game.state === 'pre' && new Date(game.kickoff).getTime() - now < HORIZON_MS)
  );
  if (!soon) return { sent: 0, note: 'no kickoff within 36 hours' };

  const problems = await findLineupProblems(week);
  if (!problems.length) return { sent: 0, note: 'every lineup is clean' };

  // Each problem can alert when first seen, and once more as a final call.
  const candidates = problems.flatMap((problem) => {
    const keys = [`${week}:${problem.rosterId}:${problem.player.id}:${problem.player.slot}:${problem.status}`];
    const kickoffAt = problem.kickoff ? new Date(problem.kickoff).getTime() : null;
    if (kickoffAt && kickoffAt - now < FINAL_CALL_MS) keys.push(`${keys[0]}:final`);
    return keys.map((key) => ({ key, problem, final: key.endsWith(':final') }));
  });

  // Claim keys first and send only for the ones this run actually claimed.
  const { data, error } = await supabase
    .from('lineup_alerts')
    .upsert(
      candidates.map((c) => ({
        key: c.key,
        week,
        roster_id: c.problem.rosterId,
        player_id: c.problem.player.id,
        status: c.problem.status,
      })),
      { onConflict: 'key', ignoreDuplicates: true }
    )
    .select('key');
  if (error) {
    // Without the table there is no way to avoid repeating an alert every
    // minute, so nothing is sent until the one time SQL has run.
    return { sent: 0, note: `lineup_alerts unavailable: ${error.message}` };
  }

  const claimed = new Set((data ?? []).map((row) => (row as { key: string }).key));
  let sent = 0;
  for (const candidate of candidates) {
    if (!claimed.has(candidate.key)) continue;
    const { title, body } = message(candidate.problem);
    const delivered = await sendAlert(
      { alert: 'lineup', teamIds: [String(candidate.problem.rosterId)] },
      {
        title: candidate.final ? `Last call. ${title}` : title,
        body,
        url: `/matchups/${week}/${candidate.problem.matchupId}`,
        tag: `lineup-${candidate.problem.player.id}`,
      }
    );
    sent += delivered;
    log(`  ${candidate.final ? 'final call' : 'alert'}: ${body} (${delivered} devices)`);
  }
  return { sent, note: `${claimed.size} new of ${candidates.length} problems, ${sent} deliveries` };
}
