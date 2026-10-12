import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { MarkDropRefined } from '../marks';
import { MenuNav, type SectionKey } from '../menus';
import { anyGameLive, getNflScoreboard } from '@/lib/espn';
import { getWeekGames, scoredWeek } from '@/lib/league';
import { getMatchupContext, markInPlay } from '@/lib/matchup-live';
import Pattern from '../home/Pattern';
import { BottomLine } from '../home/Ticker';
import { HANDS, handHref } from '../home/hands';
import bench from '../testing.module.css';
import styles from '../home/home.module.css';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap';
const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

/**
 * Splash's shell, the same on every page: the paper and its wallpaper, the
 * lockup and the week floating over the soft edge, the menu with the current
 * section marked, the page's content as widgets, and the two tickers along
 * the foot. Pages hand it their section and their content, nothing else.
 */
export default async function Shell({ active, children }: { active: SectionKey; children: ReactNode }) {
  const week = await scoredWeek();
  const [rawGames, nfl, ctx] = await Promise.all([
    getWeekGames(week).catch(() => []),
    getNflScoreboard().catch(() => []),
    getMatchupContext(week).catch(() => null),
  ]);
  const games = ctx ? markInPlay(rawGames, ctx.nfl) : rawGames;
  const live = anyGameLive(nfl) || games.some((g) => g.inPlay);

  const league = games.map((g) => ({
    id: g.matchupId,
    away: g.away.team,
    awayPts: g.away.points,
    home: g.home.team,
    homePts: g.home.points,
    live: Boolean(g.inPlay),
  }));
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
  const hand = HANDS.sharpie;

  return (
    <div
      className={`${bench.stage} ${styles.pool}`}
      data-stage
      style={{ '--hand': hand.css, '--hand-scale': String(hand.scale), '--hand-weight': String(hand.weight) } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={handHref('sharpie')} precedence="default" />
      <Pattern mode="wallpaper" />

      <div className={`${styles.top} ${styles.topSoft}`}>
        <span className={styles.edge} aria-hidden />
        <div className={styles.topLine}>
          <Link href="/" className={styles.topBrand} data-brand-lockup aria-label="Splash, home">
            <span className={styles.mastMark} data-brand-mark>
              <MarkDropRefined />
            </span>
            <span className={styles.wordmark}>Splash</span>
          </Link>
          <span className={styles.topWeek}>
            {live ? (
              <svg viewBox="0 0 64 64" className={styles.topDrop} aria-hidden>
                <path d={DROP} />
              </svg>
            ) : null}
            Week {week}
          </span>
        </div>
        <div className={styles.menuDock}>
          <MenuNav active={active} />
        </div>
      </div>

      <main className={`${styles.page} ${styles.clearBottom}`}>{children}</main>

      <BottomLine league={league} nfl={nflLines} />
    </div>
  );
}
