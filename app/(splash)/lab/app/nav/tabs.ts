/**
 * Which tab a lab route belongs to, so the bar lights the right one and each
 * tab can remember where you left it. Account and My Team belong to none.
 */
export type TabKey = 'home' | 'scores' | 'rag' | 'league' | 'swami';

export const TAB_ROOTS: Record<TabKey, string> = {
  home: '/',
  scores: '/scores',
  rag: '/rag',
  league: '/league',
  swami: '/swami',
};

const LEAGUE = ['league', 'players', 'managers', 'feed', 'trades', 'trophies', 'chug', 'insights', 'rules', 'pickem'];
const SCORES = ['scores', 'matchup', 'nfl'];

// The browser shows the public path (/scores) once the swap's rewrites are
// on, and /scores before; both read the same.
export function tabOf(path: string): TabKey | null {
  const p = path.split(/[?#]/)[0].replace(/^\/lab\/app/, '').replace(/\/+$/, '');
  if (p === '') return 'home';
  const seg = p.replace(/^\//, '').split('/')[0];
  if (SCORES.includes(seg)) return 'scores';
  if (seg === 'rag') return 'rag';
  if (LEAGUE.includes(seg)) return 'league';
  if (seg === 'swami') return 'swami';
  return null;
}
