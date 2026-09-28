// Movement, as the app reads it. Checkpoint 16.
//
// The poller writes what changed; this turns it back into sentences. Every
// line is a thing that actually happened at a time it actually happened, so
// there is no wording here that could be wrong, only wording that could be
// dull.
//
// Reads with the anon key. An outage returns an empty list rather than
// throwing, the same as every other optional source in this app: a feed with
// nothing in it is a quiet week, and a page that fails to render is a bug.

import { firstNameOf } from '../config/managers.ts';
import { playerOf, teamByRoster } from './league.ts';
import { readClient, feedConfigured } from './supabase.ts';

export type MovementKind = 'start' | 'bench' | 'add' | 'drop';

export type MovementEvent = {
  id: number;
  week: number;
  rosterId: number;
  kind: MovementKind;
  playerId: string;
  otherId: string | null;
  at: string;
  /** The manager's first name, for the copy. */
  manager: string;
  /** Already resolved, so a caller never has to look a player up. */
  player: string;
  other: string | null;
  /** One sentence, always true. */
  saying: string;
};

type Row = {
  id: number;
  week: number;
  roster_id: number;
  kind: MovementKind;
  player_id: string;
  other_id: string | null;
  at: string;
};

/** playerOf never returns null: an unknown id still renders, per the brief. */
const nameOf = (id: string | null): string | null => {
  if (!id) return null;
  const player = playerOf(id);
  return player.short || player.name;
};

/**
 * What happened, in a sentence.
 *
 * A paired swap reads as one decision because that is what it was. Two
 * separate lines for "benched Puka" and "started Rice" describe the same
 * moment twice and lose the thing that made it interesting.
 */
function sayingFor(row: Row, manager: string, player: string, other: string | null): string {
  switch (row.kind) {
    case 'start':
      return other ? `${manager} started ${player} over ${other}.` : `${manager} started ${player}.`;
    case 'bench':
      // The start side of a pair already says it. This only speaks when it is
      // a benching on its own, which usually means an injury.
      return other ? '' : `${manager} benched ${player}.`;
    case 'add':
      return `${manager} added ${player}.`;
    case 'drop':
      return `${manager} dropped ${player}.`;
  }
}

function hydrate(rows: Row[]): MovementEvent[] {
  return rows
    .map((row) => {
      const team = teamByRoster(row.roster_id);
      const manager = firstNameOf(row.roster_id) ?? team?.manager ?? 'Somebody';
      const player = nameOf(row.player_id) ?? 'a player';
      const other = nameOf(row.other_id);
      return {
        id: row.id,
        week: row.week,
        rosterId: row.roster_id,
        kind: row.kind,
        playerId: row.player_id,
        otherId: row.other_id,
        at: row.at,
        manager,
        player,
        other,
        saying: sayingFor(row, manager, player, other),
      };
    })
    // The muted half of a pair carries no sentence, so it is not a line.
    .filter((event) => event.saying);
}

/** The week's movement, newest first. */
export async function recentMovement(week: number, limit = 30): Promise<MovementEvent[]> {
  if (!feedConfigured) return [];
  const db = readClient();
  if (!db) return [];
  const { data, error } = await db
    .from('movement')
    .select('id, week, roster_id, kind, player_id, other_id, at')
    .eq('week', week)
    .order('at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return hydrate(data as Row[]);
}

/**
 * One manager's history, for his own page.
 *
 * Not filtered to a week: the point of a manager's movement is the pattern
 * across the season, which is the thing a single week cannot show.
 */
export async function movementFor(rosterId: number, limit = 40): Promise<MovementEvent[]> {
  if (!feedConfigured) return [];
  const db = readClient();
  if (!db) return [];
  const { data, error } = await db
    .from('movement')
    .select('id, week, roster_id, kind, player_id, other_id, at')
    .eq('roster_id', rosterId)
    .order('at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return hydrate(data as Row[]);
}

/**
 * How long before kickoff a decision was made, as words.
 *
 * The interesting part of a lineup change is almost never what it was, it is
 * when: a swap made on Sunday morning is a read on an injury report, and the
 * same swap made twelve minutes before kickoff is a panic.
 */
export function timing(at: string, kickoff?: string | null): string {
  const made = new Date(at).getTime();
  if (kickoff) {
    const mins = Math.round((new Date(kickoff).getTime() - made) / 60000);
    if (mins >= 0 && mins < 60) return `${mins} min before kickoff`;
    if (mins >= 60 && mins < 360) return `${Math.round(mins / 60)}h before kickoff`;
  }
  const ago = Math.round((Date.now() - made) / 60000);
  if (ago < 60) return `${Math.max(1, ago)} min ago`;
  if (ago < 1440) return `${Math.round(ago / 60)}h ago`;
  return `${Math.round(ago / 1440)}d ago`;
}
