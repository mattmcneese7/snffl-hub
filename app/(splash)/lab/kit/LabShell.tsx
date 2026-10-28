import { ViewTransition, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { MarkDropRefined } from '../../marks';
import { MenuNav, type SectionKey } from '../../menus';
import { anyGameLive, getNflScoreboard } from '@/lib/espn';
import { getWeekGames, scoredWeek, teams } from '@/lib/league';
import { getMatchupContext, markInPlay } from '@/lib/matchup-live';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { firstNameOf } from '@/config/managers';
import Pattern from '../../home/Pattern';
import { BottomLine } from '../../home/Ticker';
import { HANDS, handHref } from '../../home/hands';
import bench from '../../testing.module.css';
import styles from '../../home/home.module.css';
import Search, { type SearchItem } from './Search';
import Island from './Island';
import { buildLabLive } from './liveFeed';
import { Toaster } from './Toasts';
import v4 from './shell.module.css';
import { CSS_GLIDE } from './motion';

/** View Transitions run on the glide spring: morphs settle like the sheet, page swaps cross fade quickly. */
const VT_CSS = `::view-transition-group(*){animation-duration:460ms;animation-timing-function:${CSS_GLIDE}}::view-transition-old(root),::view-transition-new(root){animation-duration:200ms}::view-transition{pointer-events:none}@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}`;

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';

const LAB_PAGES: SearchItem[] = [
  { kind: 'Lab', label: 'Lab index', href: '/lab' },
  { kind: 'Lab', label: 'Home, v4', href: '/lab/home' },
  { kind: 'Lab', label: 'Modules: every v4 piece', href: '/lab/modules' },
  { kind: 'Lab', label: 'Gameday Live', href: '/lab/live' },
  { kind: 'Lab', label: 'The Week in Stories', href: '/lab/story' },
  { kind: 'Lab', label: 'Playoff Race', href: '/lab/race' },
  { kind: 'Lab', label: 'Rivals', href: '/lab/rivals' },
];
const APP_PAGES: SearchItem[] = [
  ['Home', '/'],
  ['The Rag', '/rag'],
  ['Scoreboard', '/scoreboard'],
  ['Standings', '/standings'],
  ['The Swami', '/swami'],
  ['The Feed', '/feed'],
  ['Insights', '/insights'],
  ['Trophy case', '/trophies'],
  ['Managers', '/managers'],
  ['Players', '/players'],
  ['Trades', '/trades'],
  ['Chug Meter', '/chug'],
  ['Rules', '/rules'],
  ['Settings', '/settings'],
].map(([label, href]) => ({ kind: 'Page' as const, label, href }));

/**
 * The v4 shell. Splash's shell, the same paper, wallpaper, lockup, menu and
 * ticker, with what v4 adds:
 *
 *   - the top condenses as you scroll (CSS scroll driven, no JS)
 *   - search everything from the lockup line (players, managers, pages)
 *   - the island: your game, live, floating over the ticker, opening in place
 *   - toasts for scoring news
 *   - pages cross fade and shared elements morph between pages (View Transitions)
 */
export default async function LabShell({ active = 'more', children }: { active?: SectionKey; children: ReactNode }) {
  const week = await scoredWeek();
  const [rawGames, nfl, ctx, jar] = await Promise.all([
    getWeekGames(week).catch(() => []),
    getNflScoreboard().catch(() => []),
    getMatchupContext(week).catch(() => null),
    cookies(),
  ]);
  const games = ctx ? markInPlay(rawGames, ctx.nfl) : rawGames;
  const live = anyGameLive(nfl) || games.some((g) => g.inPlay);
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const initialLive = ctx ? buildLabLive(week, rawGames, ctx) : null;

  const league = games.map((g) => ({ id: g.matchupId, away: g.away.team, awayPts: g.away.points, home: g.home.team, homePts: g.home.points, live: Boolean(g.inPlay) }));
  const nflLines = nfl.map((g) => ({
    id: g.id,
    away: g.away.abbr,
    awayLogo: g.away.logo,
    awayScore: g.state === 'pre' ? null : g.away.score,
    home: g.home.abbr,
    homeLogo: g.home.logo,
    homeScore: g.state === 'pre' ? null : g.home.score,
    status: g.status,
    live: g.state === 'in',
  }));

  // Search: every manager, every rostered player this week, every page.
  const seen = new Set<string>();
  const players: SearchItem[] = [];
  for (const g of games)
    for (const s of [g.home, g.away])
      for (const p of [...s.lineup, ...(s.bench ?? [])]) {
        if (seen.has(p.id) || !p.name || p.name === 'Unknown Player') continue;
        seen.add(p.id);
        players.push({ kind: 'Player', label: p.name, sub: `${p.position}${p.team ? `, ${p.team}` : ''}, ${firstNameOf(s.rosterId) ?? s.manager}`, href: `/players/${p.id}`, image: p.headshot || null });
      }
  const managers: SearchItem[] = teams.map((t) => ({ kind: 'Manager', label: firstNameOf(t.rosterId) ?? t.manager, sub: t.teamName, href: `/managers/${t.rosterId}`, image: t.avatarUrl ?? null }));
  const items = [...LAB_PAGES, ...managers, ...APP_PAGES, ...players];
  const hand = HANDS.sharpie;

  return (
    <div
      className={`${bench.stage} ${styles.pool} ${v4.stage}`}
      data-stage
      style={{ '--hand': hand.css, '--hand-scale': String(hand.scale), '--hand-weight': String(hand.weight) } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={handHref('sharpie')} precedence="default" />
      <style href="lab-vt" precedence="default">{VT_CSS}</style>
      <Pattern mode="wallpaper" />
      <Toaster>
        <div className={`${styles.top} ${styles.topSoft} ${v4.top}`}>
          <span className={styles.edge} aria-hidden />
          <div className={`${styles.topLine} ${v4.topLine}`}>
            <Link href="/lab" className={styles.topBrand} data-brand-lockup aria-label="Splash lab">
              <span className={styles.mastMark} data-brand-mark>
                <MarkDropRefined />
              </span>
              <span className={styles.wordmark}>Splash</span>
              <span className={v4.labTag}>4.0 lab</span>
            </Link>
            <span className={v4.topRight}>
              <span className={styles.topWeek}>
                {live ? <span className={v4.liveDot} aria-label="Games live" /> : null}
                Week {week}
              </span>
              <Search items={items} />
            </span>
          </div>
          <div className={`${styles.menuDock} ${v4.menuDock}`}>
            <MenuNav active={active} />
          </div>
        </div>

        <ViewTransition>
          <main className={`${styles.page} ${styles.clearBottom} ${v4.page}`} data-lab-main>
            {children}
          </main>
        </ViewTransition>

        <Island week={week} mine={mine} initial={initialLive} />
      </Toaster>
      <BottomLine league={league} nfl={nflLines} />
    </div>
  );
}
