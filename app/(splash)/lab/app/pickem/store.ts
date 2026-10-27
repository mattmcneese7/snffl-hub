import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { getNflGames } from '@/lib/gameday';
import { getWeekGames, league, scoredWeek, teams } from '@/lib/league';
import { writeClient } from '@/lib/supabase';

/**
 * Pick'em's server side. Every manager picks the winner of each league
 * matchup in a week; picks lock at the week's first NFL kickoff (Thursday
 * night) and stay hidden until then. No sign-in: a team sets a 4-digit PIN
 * with its first pick, and a device that proves it gets a token tied to that
 * PIN. Only these server functions touch the tables (service role; row level
 * security keeps the public key out), so the lock and the secrecy hold.
 * Table setup: docs/sql/v4-pickem.sql.
 */

const SEASON = league.season;
const SECRET = process.env.PICKEM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TRIES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type PickGame = { matchupId: number; a: number; b: number; winner: number | null };
export type PickRow = { roster_id: number; matchup_id: number; pick: number };
export type WeekPicks = {
  configured: boolean;
  week: number;
  lockAt: string | null;
  locked: boolean;
  decided: boolean;
  games: PickGame[];
  /** Teams with at least one pick in, so the page can say who is still out. */
  inRosters: number[];
  /** Everyone's picks, only once locked. */
  all: PickRow[] | null;
};
export type Standing = { rosterId: number; correct: number; decided: number; weeksWon: number };

const hash = (pin: string, salt: string) => scryptSync(pin, salt, 32).toString('hex');
const sign = (rosterId: number, pinHash: string) => createHmac('sha256', SECRET).update(`${rosterId}:${pinHash}`).digest('hex').slice(0, 32);

/** The week to pick: next week once this one is final, this week otherwise. */
export async function pickWeek(state: 'final' | 'preview' | 'live', week: number): Promise<number> {
  return state === 'final' ? week + 1 : week;
}

/** The week's first NFL kickoff, when its picks lock. */
const lockOf = cache(async (week: number): Promise<{ lockAt: string | null; done: boolean }> => {
  const nfl = await getNflGames(week, SEASON).catch(() => []);
  const first = nfl.map((g) => g.kickoff).filter(Boolean).sort()[0] ?? null;
  return { lockAt: first, done: nfl.length > 0 && nfl.every((g) => g.state === 'post') };
});

const gamesOf = cache(async (week: number): Promise<PickGame[]> =>
  (await getWeekGames(week)).map((g) => ({ matchupId: g.matchupId, a: g.away.rosterId, b: g.home.rosterId, winner: g.winner })),
);

/** A week's games, lock and picks, with everyone's picks only after the lock. */
export async function weekPicks(week: number): Promise<WeekPicks> {
  const db = writeClient();
  const [{ lockAt, done }, games, current] = await Promise.all([lockOf(week), gamesOf(week), scoredWeek().catch(() => week)]);
  const locked = lockAt ? Date.now() >= Date.parse(lockAt) : false;
  const decided = week < current || done;
  const base = { week, lockAt, locked, decided, games: decided ? games : games.map((g) => ({ ...g, winner: null })) };
  if (!db) return { ...base, configured: false, inRosters: [], all: null };
  const { data, error } = await db.from('pickem_picks').select('roster_id, matchup_id, pick').eq('season', SEASON).eq('week', week);
  if (error) return { ...base, configured: false, inRosters: [], all: null };
  const rows = (data ?? []) as PickRow[];
  return { ...base, configured: true, inRosters: [...new Set(rows.map((r) => r.roster_id))], all: locked ? rows : null };
}

/** One team's own picks for a week, for its device (token checked by the caller). */
export async function ownPicks(week: number, rosterId: number): Promise<PickRow[]> {
  const db = writeClient();
  if (!db) return [];
  const { data } = await db.from('pickem_picks').select('roster_id, matchup_id, pick').eq('season', SEASON).eq('week', week).eq('roster_id', rosterId);
  return (data ?? []) as PickRow[];
}

/** Set the team's PIN if it has none, or check it. A right PIN returns the device token. */
export async function claim(rosterId: number, pin: string): Promise<{ token: string } | { error: string }> {
  const db = writeClient();
  if (!db || !SECRET) return { error: "Pick'em isn't set up yet." };
  if (!/^\d{4}$/.test(pin)) return { error: 'Four digits.' };
  if (!teams.some((t) => t.rosterId === rosterId)) return { error: 'No such team.' };
  const { data, error } = await db.from('pickem_pins').select('salt, pin_hash, failed, locked_until').eq('roster_id', rosterId).maybeSingle();
  if (error) return { error: "Pick'em isn't set up yet." };
  if (!data) {
    const salt = randomBytes(16).toString('hex');
    const pinHash = hash(pin, salt);
    const { error: e2 } = await db.from('pickem_pins').insert({ roster_id: rosterId, salt, pin_hash: pinHash });
    if (e2) return { error: 'Could not save the PIN. Try again.' };
    return { token: `${rosterId}.${sign(rosterId, pinHash)}` };
  }
  if (data.locked_until && Date.parse(data.locked_until) > Date.now()) return { error: 'Too many tries. Wait 15 minutes.' };
  const ok = timingSafeEqual(Buffer.from(hash(pin, data.salt), 'hex'), Buffer.from(data.pin_hash, 'hex'));
  if (!ok) {
    const failed = (data.failed ?? 0) + 1;
    await db.from('pickem_pins').update({ failed: failed >= TRIES ? 0 : failed, locked_until: failed >= TRIES ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null }).eq('roster_id', rosterId);
    return { error: failed >= TRIES ? 'Too many tries. Wait 15 minutes.' : 'Wrong PIN.' };
  }
  if (data.failed) await db.from('pickem_pins').update({ failed: 0, locked_until: null }).eq('roster_id', rosterId);
  return { token: `${rosterId}.${sign(rosterId, data.pin_hash)}` };
}

/** The team a token proves, or null. A changed PIN retires old tokens. */
export async function verify(token: string | null): Promise<number | null> {
  const db = writeClient();
  if (!db || !SECRET || !token) return null;
  const [id, sig] = token.split('.');
  const rosterId = Number(id);
  if (!Number.isInteger(rosterId) || !sig) return null;
  const { data } = await db.from('pickem_pins').select('pin_hash').eq('roster_id', rosterId).maybeSingle();
  if (!data) return null;
  const want = sign(rosterId, data.pin_hash);
  return want.length === sig.length && timingSafeEqual(Buffer.from(want), Buffer.from(sig)) ? rosterId : null;
}

/** Save one pick, refused once the week has locked or for a team not in that game. */
export async function savePick(week: number, rosterId: number, matchupId: number, pick: number): Promise<{ ok: true } | { error: string }> {
  const db = writeClient();
  if (!db) return { error: "Pick'em isn't set up yet." };
  const { lockAt } = await lockOf(week);
  if (lockAt && Date.now() >= Date.parse(lockAt)) return { error: 'Picks are locked.' };
  const game = (await gamesOf(week)).find((g) => g.matchupId === matchupId);
  if (!game || (pick !== game.a && pick !== game.b)) return { error: 'No such game.' };
  const { error } = await db.from('pickem_picks').upsert({ season: SEASON, week, roster_id: rosterId, matchup_id: matchupId, pick, updated_at: new Date().toISOString() });
  return error ? { error: 'Could not save. Try again.' } : { ok: true };
}

/** One week's results: each team's correct picks, once the week is decided. */
export function scoreWeek(w: WeekPicks): Map<number, { correct: number; decided: number }> {
  const out = new Map<number, { correct: number; decided: number }>();
  if (!w.decided || !w.all) return out;
  const winner = new Map(w.games.map((g) => [g.matchupId, g.winner]));
  for (const r of w.all) {
    const win = winner.get(r.matchup_id);
    if (win == null) continue;
    const s = out.get(r.roster_id) ?? { correct: 0, decided: 0 };
    s.decided += 1;
    if (r.pick === win) s.correct += 1;
    out.set(r.roster_id, s);
  }
  return out;
}

/** The week's winner or winners: the most correct picks, ties share it. */
export function weekWinners(scores: Map<number, { correct: number }>): { rosterIds: number[]; correct: number } | null {
  const best = Math.max(0, ...[...scores.values()].map((s) => s.correct));
  if (!best) return null;
  return { rosterIds: [...scores].filter(([, s]) => s.correct === best).map(([id]) => id), correct: best };
}

/** The season so far: correct picks, games decided and weeks won, best first. */
export const seasonStandings = cache(async (throughWeek: number): Promise<{ table: Standing[]; lastWinner: { week: number; rosterIds: number[]; correct: number; of: number } | null }> => {
  const weeks = await Promise.all(Array.from({ length: Math.max(0, throughWeek) }, (_, i) => weekPicks(i + 1)));
  const table = new Map<number, Standing>();
  let lastWinner: { week: number; rosterIds: number[]; correct: number; of: number } | null = null;
  for (const w of weeks) {
    if (!w.configured || !w.decided) continue;
    const scores = scoreWeek(w);
    for (const [id, s] of scores) {
      const row = table.get(id) ?? { rosterId: id, correct: 0, decided: 0, weeksWon: 0 };
      row.correct += s.correct;
      row.decided += s.decided;
      table.set(id, row);
    }
    const won = weekWinners(scores);
    if (won) {
      for (const id of won.rosterIds) table.get(id)!.weeksWon += 1;
      lastWinner = { week: w.week, ...won, of: w.games.length };
    }
  }
  return { table: [...table.values()].sort((x, y) => y.correct - x.correct || y.weeksWon - x.weeksWon), lastWinner };
});
