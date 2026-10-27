import { firstNameOf } from '@/config/managers';
import { getWeekGames, teamByRoster } from '@/lib/league';
import { buildLiveMatchup, getMatchupContext, markInPlay, type LiveMatchup, type LiveSide, type MatchupContext } from '@/lib/matchup-live';
import type { Game } from '@/lib/types';
import { sleeperWinProb, type BarState, type GameView, type SideView, type V4Data } from '../data';

/**
 * Any week's matchups in the shape the v4 screens read, for the Scores tab and
 * the matchup page. The week the clock is on keeps the dock's state (final,
 * preview or live); an earlier week is final and a later one is a preview.
 */
export type WeekView = {
  week: number;
  state: BarState;
  games: Game[];
  live: Map<number, LiveMatchup>;
  ctx: MatchupContext;
  mine: GameView | null;
  /** Every matchup but yours. */
  others: GameView[];
  /** Every matchup, yours first. */
  all: GameView[];
};

const EMPTY: MatchupContext = { nfl: [], lines: {}, stats: {}, projections: {} };

export const shortName = (name: string, position?: string, team?: string) => {
  if (position === 'DEF') return team ?? name;
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
  const lines =
    state === 'preview'
      ? [`Proj ${s.expected.toFixed(2)}`]
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

export async function weekView(week: number, myRoster: number | null, current: V4Data): Promise<WeekView> {
  const state: BarState = week === current.week ? current.state : week < current.week ? 'final' : 'preview';
  const [raw, ctx] = await Promise.all([getWeekGames(week).catch(() => [] as Game[]), getMatchupContext(week).catch(() => EMPTY)]);
  const games = markInPlay(raw, ctx.nfl);
  const live = new Map<number, LiveMatchup>();
  let mine: GameView | null = null;
  const others: GameView[] = [];
  for (const g of games) {
    const m = buildLiveMatchup(g, ctx);
    live.set(g.matchupId, m);
    const v = view(m, state);
    if (myRoster != null && (g.home.rosterId === myRoster || g.away.rosterId === myRoster)) {
      mine = v.a.rosterId === myRoster ? v : { ...v, a: v.b, b: v.a };
    } else others.push(v);
  }
  return { week, state, games, live, ctx, mine, others, all: mine ? [mine, ...others] : others };
}

/** Which side of a live matchup a view's first row is. */
export function sidesOf(g: GameView, m: LiveMatchup): [LiveSide, LiveSide] {
  return m.away.rosterId === g.a.rosterId ? [m.away, m.home] : [m.home, m.away];
}
