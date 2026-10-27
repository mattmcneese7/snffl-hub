/**
 * Which tab a lab route belongs to, so the bar lights the right one and each
 * tab can remember where you left it. Account and My Team belong to none.
 */
export type TabKey = 'home' | 'scores' | 'rag' | 'league' | 'swami';

export const TAB_ROOTS: Record<TabKey, string> = {
  home: '/lab/app',
  scores: '/lab/app/scores',
  rag: '/lab/app/rag',
  league: '/lab/app/league',
  swami: '/lab/app/swami',
};

const LEAGUE = ['league', 'players', 'managers', 'feed', 'trades', 'trophies', 'chug', 'insights', 'rules'];
const SCORES = ['scores', 'matchup', 'nfl'];

export function tabOf(path: string): TabKey | null {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, '');
  if (p === '/lab/app') return 'home';
  const seg = p.replace(/^\/lab\/app\/?/, '').split('/')[0];
  if (SCORES.includes(seg)) return 'scores';
  if (seg === 'rag') return 'rag';
  if (LEAGUE.includes(seg)) return 'league';
  if (seg === 'swami') return 'swami';
  return null;
}
