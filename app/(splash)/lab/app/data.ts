import { cache } from 'react';
import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { getWeekGames, lastFantasyWeek, scoredWeek, teamByRoster } from '@/lib/league';
import { buildLiveMatchup, getMatchupContext, markInPlay, type LiveMatchup, type LiveSide } from '@/lib/matchup-live';
import type { Game } from '@/lib/types';

/**
 * Sleeper's own matchup odds, ported from its web app so the number matches
 * the app the league already checks. Each side is a normal around its live
 * projected total; the spread shrinks as the team's points come in:
 * n = 1 + 10 * (1 - scored / projected), variance = (projected - scored)^2 / n.
 */
export function sleeperWinProb(scoredA: number, projA: number, scoredB: number, projB: number): number {
  const done = (e: number, t: number) => e.toFixed(2) === t.toFixed(2);
  if (done(scoredA, projA) && done(scoredB, projB)) return scoredA === scoredB ? 0.5 : scoredA > scoredB ? 1 : 0;
  const variance = (e: number, t: number) => {
    const n = t ? 1 + 10 * (1 - e / t) : 1;
    return (t - e) ** 2 / n || 0.1;
  };
  const sd = Math.sqrt(variance(scoredA, projA) + variance(scoredB, projB));
  const z = (projA - projB) / sd;
  return Math.min(0.99, Math.max(0.01, phi(z)));
}

function phi(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export type BarState = 'final' | 'preview' | 'live';

export type SideView = {
  rosterId: number;
  team: string;
  manager: string;
  avatar: string | null;
  color: string;
  score: number;
  /** Win chance as a percent, or W / L once final. */
  mark: string;
  lost: boolean;
  /** Labeled detail lines for the open bar. */
  lines: string[];
};

export type GameView = { id: number; a: SideView; b: SideView; foot: string };

/** Which matchup the app shows right now, by the clock and the NFL slate (Central time). */
const pickWeek = cache(async (): Promise<{ week: number; state: BarState }> => {
  const week = await scoredWeek();
  // Development only: a `splash_dev_state` cookie forces the state, so live
  // scoring can be tested when no game is on. Production ignores it.
  if (process.env.NODE_ENV !== 'production') {
    const forced = (await cookies()).get('splash_dev_state')?.value;
    if (forced === 'live' || forced === 'preview' || forced === 'final') return { week, state: forced };
  }
  const ctx = await getMatchupContext(week).catch(() => null);
  const nfl = ctx?.nfl ?? [];
  const started = nfl.some((g) => g.state !== 'pre');
  const allDone = nfl.length > 0 && nfl.every((g) => g.state === 'post');
  const central = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const day = central.getDay();
  if (allDone) {
    // Final from the end of Monday night until Wednesday 12:00 AM, then next week's preview.
    if ((day === 3 || day === 4) && week < lastFantasyWeek()) return { week: week + 1, state: 'preview' };
    return { week, state: 'final' };
  }
  return { week, state: started ? 'live' : 'preview' };
});

const shortName = (name: string) => {
  const [first, ...rest] = name.split(' ');
  if (!rest.length || first.includes('.')) return name;
  return `${first[0]}. ${rest.join(' ')}`;
};

function side(s: LiveSide, other: LiveSide, state: BarState): SideView {
  const t = teamByRoster(s.rosterId);
  const final = state === 'final';
  const p = sleeperWinProb(s.points, s.expected, other.points, other.expected);
  const yet = s.lineup.filter((x) => x.gameState === 'pre');
  const top = [...s.lineup].sort((x, y) => y.points - x.points)[0];
  const kickoff = yet.map((x) => x.nfl?.game).filter(Boolean).sort((x, y) => (x!.kickoff < y!.kickoff ? -1 : 1))[0];
  const lines =
    state === 'preview'
      ? [`Proj ${s.expected.toFixed(2)}`, kickoff ? `Kickoff ${kickoff.status}` : '']
      : final
        ? [`${s.points > other.points ? 'Won' : 'Lost'} by ${Math.abs(s.points - other.points).toFixed(2)}`, top ? `Top scorer ${shortName(top.name)} ${top.points.toFixed(2)}` : '']
        : [`Yet to play (${yet.length})${yet.length ? ` ${yet.map((x) => x.position).join(', ')}` : ''}`, top ? `Top scorer ${shortName(top.name)} ${top.points.toFixed(2)}` : ''];
  return {
    rosterId: s.rosterId,
    team: s.team,
    manager: firstNameOf(s.rosterId) ?? s.manager,
    avatar: t?.avatarUrl ?? null,
    color: t?.colors?.primary ?? '#2d4c9c',
    score: state === 'preview' ? s.expected : s.points,
    mark: final ? (s.points > other.points ? 'W' : s.points < other.points ? 'L' : 'T') : `${Math.round(p * 100)}%`,
    lost: final && s.points < other.points,
    lines: lines.filter(Boolean),
  };
}

function view(m: LiveMatchup, state: BarState): GameView {
  const a = side(m.away, m.home, state);
  const b = side(m.home, m.away, state);
  const yet = m.away.lineup.concat(m.home.lineup).filter((x) => x.gameState === 'pre').length;
  const foot = state === 'final' || m.game.status === 'final' ? 'Final' : state === 'preview' ? 'Proj' : `Yet to play (${yet})`;
  if (m.game.status === 'final' && state === 'live') {
    a.mark = a.score > b.score ? 'W' : 'L';
    b.mark = b.score > a.score ? 'W' : 'L';
    a.lost = a.score < b.score;
    b.lost = b.score < a.score;
  }
  return { id: m.game.matchupId, a, b, foot };
}

export type V4Data = {
  week: number;
  myRoster: number | null;
  state: BarState;
  mine: GameView | null;
  /** Mine first among the two sides. */
  others: GameView[];
  games: Game[];
  live: Map<number, LiveMatchup>;
};

/** Once per request, however many parts of the page ask (Shell, the page, its modules). */
export const getV4Data = cache(async (myRoster: number | null): Promise<V4Data> => {
  const { week, state } = await pickWeek();
  const [raw, ctx] = await Promise.all([getWeekGames(week).catch(() => [] as Game[]), getMatchupContext(week).catch(() => null)]);
  const games = ctx ? markInPlay(raw, ctx.nfl) : raw;
  const live = new Map<number, LiveMatchup>();
  if (ctx) for (const g of games) live.set(g.matchupId, buildLiveMatchup(g, ctx));
  let mine: GameView | null = null;
  const others: GameView[] = [];
  for (const g of games) {
    const m = live.get(g.matchupId);
    if (!m) continue;
    const v = view(m, state);
    if (myRoster != null && (g.home.rosterId === myRoster || g.away.rosterId === myRoster)) {
      mine = v.a.rosterId === myRoster ? v : { ...v, a: v.b, b: v.a };
    } else others.push(v);
  }
  return { week, myRoster, state, mine, others, games, live };
});
