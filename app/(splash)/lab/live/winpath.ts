import type { NflGame } from '@/lib/gameday';
import { getWeekGames } from '@/lib/league';
import { buildLiveMatchup, getMatchupContext, markInPlay, type LiveMatchup, type LivePlayer } from '@/lib/matchup-live';
import { buildLabLive, type LabLive } from '../kit/liveFeed';
import { nflNickname } from '../../kit/nflTeams';

/**
 * The gamecast's server side: the week's NFL kickoff windows, the win chance
 * rebuilt after each one, and every NFL team's clock.
 *
 * The win chance is reconstructed, not remembered. Nobody stored what the
 * model said on Sunday at noon, so it is recomputed with the same model
 * lib/matchup-live.ts runs live: at the checkpoint after window k, a starter
 * whose game kicked off in windows up to k counts what he actually scored (his
 * live expectation if his game is still on), and everyone else counts his
 * projection with his full spread. The chart says so on its face.
 */

const TZ = 'America/Chicago';

export type KickWindow = {
  /** "Thu", "Sun 12", "Sun 3", "SNF", "MNF". */
  label: string;
  /** "Thursday night", "Sunday early". */
  long: string;
  start: string;
  state: 'pre' | 'in' | 'post';
};

export type WinPoint = {
  /** Index into windows, or -1 for pregame. */
  window: number;
  /** The away side's win chance after this window, 0 to 1. */
  away: number;
};

export type WinPath = { windows: KickWindow[]; points: WinPoint[] };

export type Clock = {
  state: 'pre' | 'in' | 'post';
  /** "Mon 7:15 PM", "Q3 4:12", "Final". */
  short: string;
  /** "Monday, 7:15 PM CT", "Q3 4:12, 2nd & 7 at DET 34", "Final". */
  long: string;
  /** "Cowboys at Eagles". */
  matchup: string;
  /** "DAL 17, PHI 21" once it has started. */
  score: string | null;
};

export type Extras = { path: WinPath; clocks: Record<string, Clock> };

function local(iso: string) {
  const at = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TZ }).format(at);
  const longDay = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: TZ }).format(at);
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(at);
  return { day, longDay, hour, minute, time };
}

const h12 = (h: number) => String(h % 12 || 12);

/** Which kickoff window a game belongs to, by its kickoff in Central time. */
function windowOf(iso: string): { label: string; long: string } {
  const { day, hour, minute } = local(iso);
  if (day === 'Thu') return { label: 'Thu', long: 'Thursday night' };
  if (day === 'Fri') return { label: 'Fri', long: 'Friday' };
  if (day === 'Sat') return { label: `Sat ${h12(hour)}`, long: 'Saturday' };
  if (day === 'Mon') return { label: 'MNF', long: 'Monday night' };
  if (day === 'Sun') {
    if (hour < 11) return { label: `Sun ${h12(hour)}${minute ? `:${String(minute).padStart(2, '0')}` : ''}`, long: 'Sunday morning' };
    if (hour < 14) return { label: 'Sun 12', long: 'Sunday early' };
    if (hour < 18) return { label: 'Sun 3', long: 'Sunday late' };
    return { label: 'SNF', long: 'Sunday night' };
  }
  return { label: day, long: day };
}

export function kickoffWindows(nfl: NflGame[]): { windows: KickWindow[]; byGame: Map<string, number> } {
  const groups = new Map<string, { label: string; long: string; games: NflGame[] }>();
  for (const g of [...nfl].sort((a, b) => a.kickoff.localeCompare(b.kickoff))) {
    const w = windowOf(g.kickoff);
    const group = groups.get(w.label) ?? { ...w, games: [] };
    group.games.push(g);
    groups.set(w.label, group);
  }
  const windows: KickWindow[] = [];
  const byGame = new Map<string, number>();
  [...groups.values()]
    .sort((a, b) => a.games[0].kickoff.localeCompare(b.games[0].kickoff))
    .forEach((group, i) => {
      const states = group.games.map((g) => g.state);
      const state = states.every((s) => s === 'post') ? 'post' : states.every((s) => s === 'pre') ? 'pre' : 'in';
      windows.push({ label: group.label, long: group.long, start: group.games[0].kickoff, state });
      for (const g of group.games) byGame.set(g.id, i);
    });
  return { windows, byGame };
}

/** Standard normal CDF, the same approximation the live model uses. */
function phi(x: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** A starter's projection and his full week spread, exactly as lib/matchup-live.ts reads them. */
function prior(p: LivePlayer) {
  const base = p.projected ?? p.ds?.projection ?? 0;
  const spread =
    p.ds?.floor != null && p.ds?.ceiling != null && p.ds.ceiling > p.ds.floor ? (p.ds.ceiling - p.ds.floor) / 1.68 : Math.max(2.5, base * 0.45);
  return { base, spread };
}

function chanceAfter(live: LiveMatchup, k: number, byGame: Map<string, number>): number {
  const total = (lineup: LivePlayer[]) => {
    let mean = 0;
    let variance = 0;
    for (const p of lineup) {
      const w = p.nfl ? byGame.get(p.nfl.game.id) : undefined;
      // No game this week (a bye or an empty slot) is known from the start.
      const known = w == null || (w <= k && p.gameState !== 'pre');
      if (known) {
        mean += p.expected;
        variance += p.sd ** 2;
      } else {
        const { base, spread } = prior(p);
        mean += base;
        variance += spread ** 2;
      }
    }
    return { mean, variance };
  };
  const a = total(live.away.lineup);
  const h = total(live.home.lineup);
  const spread = Math.sqrt(a.variance + h.variance);
  if (spread < 0.01) return a.mean === h.mean ? 0.5 : a.mean > h.mean ? 1 : 0;
  return Math.min(0.995, Math.max(0.005, phi((a.mean - h.mean) / spread)));
}

export function winPath(live: LiveMatchup, nfl: NflGame[]): WinPath {
  const { windows, byGame } = kickoffWindows(nfl);
  const points: WinPoint[] = [{ window: -1, away: chanceAfter(live, -1, byGame) }];
  windows.forEach((w, i) => {
    if (w.state !== 'pre') points.push({ window: i, away: chanceAfter(live, i, byGame) });
  });
  return { windows, points: points.map((p) => ({ ...p, away: Number(p.away.toFixed(4)) })) };
}

function quarter(period: number | null, clock: string | null) {
  return `${period && period > 4 ? 'OT' : `Q${period ?? 1}`} ${clock ?? ''}`.trim();
}

export function clocksOf(nfl: NflGame[]): Record<string, Clock> {
  const out: Record<string, Clock> = {};
  for (const g of nfl) {
    const when = local(g.kickoff);
    const live = quarter(g.period, g.clock);
    const clock: Clock = {
      state: g.state,
      short: g.state === 'pre' ? `${when.day} ${when.time}` : g.state === 'in' ? live : 'Final',
      long: g.state === 'pre' ? `${when.longDay}, ${when.time} CT` : g.state === 'in' ? `${live}${g.situation ? `, ${g.situation}` : ''}` : 'Final',
      matchup: `${nflNickname(g.away.abbr)} at ${nflNickname(g.home.abbr)}`,
      score: g.state === 'pre' ? null : `${g.away.abbr} ${g.away.score ?? 0}, ${g.home.abbr} ${g.home.score ?? 0}`,
    };
    out[g.home.abbr] = clock;
    out[g.away.abbr] = clock;
  }
  return out;
}

/** One read of the week: Sleeper's matchups and everything the model measures them against. */
async function readWeek(week: number) {
  const [raw, ctx] = await Promise.all([getWeekGames(week).catch(() => []), getMatchupContext(week).catch(() => null)]);
  return { raw, ctx };
}

function extrasOf(raw: Awaited<ReturnType<typeof getWeekGames>>, ctx: Awaited<ReturnType<typeof getMatchupContext>>, matchupId: number): Extras | null {
  const game = markInPlay(raw, ctx.nfl).find((g) => g.matchupId === matchupId);
  if (!game) return null;
  return { path: winPath(buildLiveMatchup(game, ctx), ctx.nfl), clocks: clocksOf(ctx.nfl) };
}

/** The win chance path and the clocks for one matchup this week, or null if Sleeper has no such game. */
export async function gamecastExtras(week: number, matchupId: number): Promise<Extras | null> {
  const { raw, ctx } = await readWeek(week);
  return ctx ? extrasOf(raw, ctx, matchupId) : null;
}

/** The lab live feed, built in process so a page's first paint matches what the client then polls. */
export async function labLive(week: number): Promise<LabLive | null> {
  const { raw, ctx } = await readWeek(week);
  return ctx && raw.length ? buildLabLive(week, raw, ctx) : null;
}

/** Both at once for the gamecast, from one read. */
export async function gamecastData(week: number, matchupId: number): Promise<{ live: LabLive; extras: Extras } | null> {
  const { raw, ctx } = await readWeek(week);
  if (!ctx || !raw.length) return null;
  const extras = extrasOf(raw, ctx, matchupId);
  return extras ? { live: buildLabLive(week, raw, ctx), extras } : null;
}
