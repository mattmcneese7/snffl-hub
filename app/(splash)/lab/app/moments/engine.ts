import { cache } from 'react';
import { league, playerOf } from '@/lib/league';
import type { LiveMatchup, LivePlayer } from '@/lib/matchup-live';
import { sleeperWinProb } from '../data';

/**
 * Matchup moments: the week of one fantasy game, play by play.
 *
 * ESPN's play-by-play gives every NFL play with its wall clock, quarter, game
 * clock, text and the players in it by role. Each play that touches a starter
 * is scored with this league's settings, then each starter's plays are squared
 * with Sleeper's official total (bonuses, fumbles, defense and stat
 * corrections land on his game's last play), so the running score ends where
 * Sleeper does. After every play both sides' win chance is recomputed with
 * the same Sleeper formula the app shows, using each game's clock at that
 * moment. The moments are what changed the game: lead changes, the biggest
 * swings, late drama, and the starters who blew past their projection.
 */

const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events';
const TZ = 'America/Chicago';
const S = league.scoring as Record<string, number>;
const pt = (k: string) => S[k] ?? 0;

type Role = 'passer' | 'receiver' | 'rusher' | 'kicker';
type EspnPlay = {
  id: string;
  type: string;
  text: string;
  at: number;
  period: number;
  clock: string;
  clockSec: number;
  yards: number;
  people: { espnId: string; role: string }[];
};

/** One NFL game's plays, oldest first. Empty on any failure. */
const gamePlays = cache(async (gameId: string, final: boolean): Promise<EspnPlay[]> => {
  try {
    const res = await fetch(`${CORE}/${gameId}/competitions/${gameId}/plays?limit=500`, { next: { revalidate: final ? 86400 : 30 } } as RequestInit);
    if (!res.ok) return [];
    const json = await res.json();
    const items: Record<string, any>[] = Array.isArray(json?.items) ? json.items : [];
    return items
      .map((p) => ({
        id: String(p.id),
        type: String(p.type?.text ?? ''),
        text: String(p.text ?? ''),
        at: Date.parse(p.wallclock ?? '') || 0,
        period: Number(p.period?.number ?? 0),
        clock: String(p.clock?.displayValue ?? ''),
        clockSec: Number(p.clock?.value ?? 0),
        yards: Number(p.statYardage ?? 0),
        people: (Array.isArray(p.participants) ? p.participants : []).map((x: Record<string, any>) => ({
          espnId: String(x.athlete?.$ref ?? '').match(/athletes\/(\d+)/)?.[1] ?? '',
          role: String(x.type ?? ''),
        })),
      }))
      .filter((p) => p.at > 0)
      .sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
});

/** Field goal points by distance, from the league's bands. */
function fgPoints(yards: number): number {
  if (yards >= 60) return pt('fgm_60p') || pt('fgm_50p');
  if (yards >= 50) return pt('fgm_50_59') || pt('fgm_50p');
  if (yards >= 40) return pt('fgm_40_49');
  if (yards >= 30) return pt('fgm_30_39');
  if (yards >= 20) return pt('fgm_20_29');
  return pt('fgm_0_19');
}

/** A starter's points from one play, in this league's scoring. */
function playPoints(play: EspnPlay, role: Role): number {
  const t = play.type;
  const y = play.yards;
  const td = /touchdown/i.test(t);
  const twoPt = /two-point/i.test(play.text) && /succeeds/i.test(play.text);
  switch (role) {
    case 'passer':
      if (/interception/i.test(t)) return pt('pass_int');
      if (/pass reception|passing touchdown/i.test(t)) return y * pt('pass_yd') + (td ? pt('pass_td') : 0) + (twoPt ? pt('pass_2pt') : 0);
      return 0;
    case 'receiver':
      if (/pass reception|passing touchdown/i.test(t)) return pt('rec') + y * pt('rec_yd') + (td ? pt('rec_td') : 0) + (twoPt ? pt('rec_2pt') : 0);
      return 0;
    case 'rusher':
      if (/^rush|rushing touchdown/i.test(t)) return y * pt('rush_yd') + (td ? pt('rush_td') : 0) + (twoPt ? pt('rush_2pt') : 0);
      return 0;
    case 'kicker':
      if (/field goal good/i.test(t)) return fgPoints(y);
      if (/field goal missed|blocked field goal/i.test(t)) return pt('fgmiss');
      if (td && /extra point is good/i.test(play.text)) return pt('xpm');
      if (td && /extra point is (no good|blocked)/i.test(play.text)) return pt('xpmiss');
      return 0;
  }
}

/** Share of a game left after a play, 0 to 1 (overtime counts as nearly done). */
const leftAfter = (p: EspnPlay) => (p.period > 4 ? 0.04 : Math.max(0, Math.min(1, ((4 - p.period) * 900 + p.clockSec) / 3600)));

export type Side = 'a' | 'b';

/** One scoring event in the matchup: a play (or a game's settle-up) that moved a starter. */
export type Beat = {
  at: number;
  side: Side | 'both';
  /** Points each side gained on it. */
  gain: { a: number; b: number };
  scoreA: number;
  scoreB: number;
  /** Side a's win chance after it, 0 to 1. */
  winA: number;
  /** Who and what: "K. Cousins 12 yd TD pass to T. McLaurin". */
  what: string;
  /** Where: "WAS at SEA". */
  where: string;
  /** When: "Sun 3:42 PM" and the game clock "Q3 4:12". */
  when: string;
  clock: string;
  /** ESPN play text, for anyone who wants the full call. */
  call: string;
  playerIds: string[];
  settle: boolean;
};

export type MomentKind = 'lead' | 'swing' | 'late' | 'decider';
export type Moment = Beat & { kinds: MomentKind[]; swing: number };
export type Outdid = { playerId: string; side: Side; points: number; projected: number };
export type Timeline = {
  /** Win chance before the first kickoff, then after every beat. */
  start: { at: number; winA: number };
  beats: Beat[];
  moments: Moment[];
  outdid: Outdid[];
  leadChanges: number;
};

const day = (ms: number) => new Date(ms).toLocaleString('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(',', '');
const quarter = (p: EspnPlay) => `${p.period > 4 ? 'OT' : `Q${p.period}`} ${p.clock}`;
const short = (id: string) => playerOf(id).short || playerOf(id).name;

/** "12 yd TD catch", "4 yd run", "43 yd FG", in the box score's words. */
function describe(play: EspnPlay, mine: { id: string; role: Role }[], byEspn: Map<string, string>): string {
  const t = play.type;
  const td = /touchdown/i.test(t);
  const y = Math.abs(play.yards);
  const lead = mine[0];
  const name = short(lead.id);
  if (lead.role === 'kicker') return /field goal good/i.test(t) ? `${name} ${y} yd FG` : /missed|blocked/i.test(t) ? `${name} misses from ${y}` : `${name} extra point`;
  if (lead.role === 'passer') {
    if (/interception/i.test(t)) return `${name} intercepted`;
    const rec = play.people.find((p) => p.role === 'receiver');
    const recName = rec ? byEspn.get(rec.espnId) : undefined;
    const to = mine.find((m) => m.role === 'receiver') ? short(mine.find((m) => m.role === 'receiver')!.id) : recName ? short(recName) : (play.text.match(/ to ([A-Z]\.[A-Za-z'-]+)/)?.[1]?.replace('.', '. ') ?? 'a receiver');
    return `${name} ${y} yd ${td ? 'TD ' : ''}pass to ${to}`;
  }
  if (lead.role === 'receiver') return `${name} ${y} yd ${td ? 'TD ' : ''}catch`;
  return `${name} ${y} yd ${td ? 'TD ' : ''}run`;
}

/**
 * The matchup's week as beats and moments. `a` is the side the reader cares
 * about (your team, or the away side when it is someone else's game).
 */
export async function matchupTimeline(live: LiveMatchup, aRoster: number): Promise<Timeline> {
  const A = live.away.rosterId === aRoster ? live.away : live.home;
  const B = A === live.away ? live.home : live.away;
  const starters: { p: LivePlayer; side: Side }[] = [...A.lineup.map((p) => ({ p, side: 'a' as Side })), ...B.lineup.map((p) => ({ p, side: 'b' as Side }))];

  const byEspn = new Map<string, string>();
  const starterByEspn = new Map<string, { p: LivePlayer; side: Side }>();
  for (const s of starters) {
    const e = playerOf(s.p.id).espnId;
    if (e) starterByEspn.set(e, s);
  }
  // Any rostered or listed player, so a pass to a non-starter still names him.
  for (const s of [...A.lineup, ...A.bench, ...B.lineup, ...B.bench]) {
    const e = playerOf(s.id).espnId;
    if (e) byEspn.set(e, s.id);
  }

  const games = new Map<string, { final: boolean; teams: string }>();
  for (const { p } of starters) {
    if (!p.nfl || p.gameState === 'pre') continue;
    const g = p.nfl.game;
    games.set(g.id, { final: g.state === 'post', teams: `${g.away.abbr} at ${g.home.abbr}` });
  }
  const plays = new Map<string, EspnPlay[]>();
  await Promise.all([...games].map(async ([id, g]) => plays.set(id, await gamePlays(id, g.final))));

  // Raw beats, one per play that moved a starter.
  type Raw = { at: number; gameId: string; play: EspnPlay | null; gains: { id: string; side: Side; pts: number; role: Role | null }[] };
  const raws: Raw[] = [];
  const scored = new Map<string, number>();
  for (const [gameId, list] of plays) {
    for (const play of list) {
      const gains: Raw['gains'] = [];
      for (const person of play.people) {
        const s = starterByEspn.get(person.espnId);
        if (!s || !['passer', 'receiver', 'rusher', 'kicker'].includes(person.role)) continue;
        const pts = playPoints(play, person.role as Role);
        if (Math.abs(pts) < 0.005) continue;
        gains.push({ id: s.p.id, side: s.side, pts, role: person.role as Role });
        scored.set(s.p.id, (scored.get(s.p.id) ?? 0) + pts);
      }
      if (gains.length) raws.push({ at: play.at, gameId, play, gains });
    }
  }
  // Square each starter with Sleeper. Whatever the plays did not score (a
  // defense, bonuses, fumbles, stat corrections) accrues evenly over his game
  // clock, so it never lands as one fake swing at the final whistle; a beat at
  // each game's end makes the totals finish exactly where Sleeper does.
  const rest = new Map<string, number>();
  for (const { p } of starters) {
    if (!p.nfl || p.gameState === 'pre') continue;
    const r = p.points - (scored.get(p.id) ?? 0);
    if (Math.abs(r) >= 0.01) rest.set(p.id, r);
  }
  for (const [gameId, g] of games) {
    const list = plays.get(gameId) ?? [];
    if (g.final && list.length) raws.push({ at: list[list.length - 1].at + 1, gameId, play: null, gains: [] });
  }
  raws.sort((x, y) => x.at - y.at);

  // Each NFL game's clock over time, for the expected finals at any moment.
  const leftAt = (gameId: string, at: number): number => {
    const list = plays.get(gameId);
    if (!list?.length || at < list[0].at) return 1;
    let lo = 0;
    for (let i = 0; i < list.length && list[i].at <= at; i++) lo = i;
    const g = games.get(gameId);
    if (g?.final && at >= list[list.length - 1].at) return 0;
    return leftAfter(list[lo]);
  };
  const running = new Map<string, number>();
  const got = (p: LivePlayer, at: number) => {
    const r = rest.get(p.id);
    return (running.get(p.id) ?? 0) + (r && p.nfl ? r * (1 - leftAt(p.nfl.game.id, at)) : 0);
  };
  const totals = (at: number) => {
    let a = 0, b = 0;
    for (const { p, side } of starters) if (side === 'a') a += got(p, at); else b += got(p, at);
    return { a, b };
  };
  const win = (at: number): number => {
    let sa = 0, ea = 0, sb = 0, eb = 0;
    for (const { p, side } of starters) {
      const got_ = got(p, at);
      const base = p.projected ?? p.ds?.projection ?? 0;
      const left = p.nfl && p.gameState !== 'pre' ? leftAt(p.nfl.game.id, at) : p.gameState === 'bye' ? 0 : 1;
      if (side === 'a') { sa += got_; ea += got_ + base * left; } else { sb += got_; eb += got_ + base * left; }
    }
    return sleeperWinProb(sa, ea, sb, eb);
  };

  const firstAt = raws[0]?.at ?? Date.now();
  const start = { at: firstAt - 1, winA: win(firstAt - 1) };
  const beats: Beat[] = [];
  for (const r of raws) {
    const gain = { a: 0, b: 0 };
    for (const g of r.gains) {
      running.set(g.id, (running.get(g.id) ?? 0) + g.pts);
      gain[g.side] += g.pts;
    }
    const { a: scoreA, b: scoreB } = totals(r.at);
    const sides = new Set(r.gains.map((g) => g.side));
    const side: Beat['side'] = sides.size > 1 ? 'both' : sides.size ? [...sides][0] : 'both';
    const g = games.get(r.gameId);
    const mine = r.gains.filter((x) => x.role).map((x) => ({ id: x.id, role: x.role as Role }));
    beats.push({
      at: r.at,
      side,
      gain: { a: Number(gain.a.toFixed(2)), b: Number(gain.b.toFixed(2)) },
      scoreA: Number(scoreA.toFixed(2)),
      scoreB: Number(scoreB.toFixed(2)),
      winA: win(r.at),
      what: r.play && mine.length ? describe(r.play, mine, byEspn) : `${g?.teams ?? 'Game'} goes final`,
      where: g?.teams ?? '',
      when: day(r.at),
      clock: r.play ? quarter(r.play) : 'Final',
      call: r.play?.text ?? '',
      playerIds: r.gains.map((x) => x.id),
      settle: !r.play,
    });
  }

  // The moments. A lead change is the score's sign flipping; a swing is a big
  // move in win chance; late is the last game window; the decider is the last
  // lead change in a finished game.
  const moments = new Map<number, Moment>();
  const add = (i: number, kind: MomentKind) => {
    const b = beats[i];
    const swing = b.winA - (i ? beats[i - 1].winA : start.winA);
    const m = moments.get(i) ?? { ...b, kinds: [], swing };
    if (!m.kinds.includes(kind)) m.kinds.push(kind);
    moments.set(i, m);
  };
  let leadChanges = 0;
  let lastLead = -1;
  let sign = 0;
  beats.forEach((b, i) => {
    const s = Math.sign(Number((b.scoreA - b.scoreB).toFixed(2)));
    if (s !== 0 && sign !== 0 && s !== sign && !b.settle) {
      leadChanges++;
      lastLead = i;
      add(i, 'lead');
    }
    if (s !== 0) sign = s;
  });
  const swings = beats.map((b, i) => ({ i, d: b.settle ? 0 : Math.abs(b.winA - (i ? beats[i - 1].winA : start.winA)) })).filter((x) => x.d >= 0.08).sort((x, y) => y.d - x.d).slice(0, 3);
  for (const s of swings) add(s.i, 'swing');
  const lastAt = beats.length ? beats[beats.length - 1].at : 0;
  const lateFrom = lastAt - 4 * 3600 * 1000;
  for (const [i, m] of moments) if (m.at >= lateFrom && beats.length > 3) add(i, 'late');
  const done = [...A.lineup, ...B.lineup].every((p) => p.gameState === 'post' || p.gameState === 'bye');
  if (done && lastLead >= 0) add(lastLead, 'decider');

  const outdid: Outdid[] = starters
    .filter(({ p }) => p.projected != null && p.gameState !== 'pre' && p.gameState !== 'bye')
    .map(({ p, side }) => ({ playerId: p.id, side, points: p.points, projected: p.projected as number }))
    .filter((o) => o.points - o.projected >= 8 || (o.projected >= 5 && o.points >= o.projected * 1.75))
    .sort((x, y) => y.points - y.projected - (x.points - x.projected));

  return {
    start,
    beats,
    moments: [...moments.values()].filter((m) => !m.settle).sort((x, y) => x.at - y.at),
    outdid,
    leadChanges,
  };
}

/**
 * The latest play that scored for one player, described the way moments are
 * ("K. Cousins 37 yd TD pass to T. Tucker") with its game, clock and points.
 * For the score bar's pop-up; null when ESPN has nothing for him yet.
 */
export async function latestPlayFor(playerId: string, gameId: string): Promise<{ what: string; clock: string; points: number } | null> {
  const espnId = playerOf(playerId).espnId;
  if (!espnId) return null;
  const list = await gamePlays(gameId, false);
  for (let i = list.length - 1; i >= 0; i--) {
    const play = list[i];
    const me = play.people.find((p) => p.espnId === espnId && ['passer', 'receiver', 'rusher', 'kicker'].includes(p.role));
    if (!me) continue;
    const points = playPoints(play, me.role as Role);
    if (Math.abs(points) < 0.005) continue;
    const byEspn = new Map<string, string>([[espnId, playerId]]);
    return { what: describe(play, [{ id: playerId, role: me.role as Role }], byEspn), clock: quarter(play), points: Number(points.toFixed(2)) };
  }
  return null;
}
