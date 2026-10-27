import Link from 'next/link';
import type { ReactNode } from 'react';
import Pattern from '../../home/Pattern';
import { Ms, type MsName } from './icons';
import { Suspense } from 'react';
import { Drop, SWITZER, TabBar, TopBar, type Back } from './Chrome';
import Tracker from './nav/Tracker';

export { Drop, TabBar, TopBar, type Back };
import ScoreBar from './ScoreBar';
import PlayerSheet from './PlayerSheet';
import { LiveStart } from './live/Live';
import SquirtLive from './squirt/SquirtLive';
import { teamByRoster } from '@/lib/league';
import type { V4Data } from './data';
import s from './v4.module.css';


/** Your avatar, top right on every screen: it opens your account. */
export function Account({ mine }: { mine: number | null }) {
  const t = mine != null ? teamByRoster(mine) : undefined;
  return (
    <Link href="/lab/app/account" className={s.acct} aria-label="Account and settings" style={t ? { ['--mgr' as string]: t.colors?.primary } : undefined}>
      {t?.avatarUrl ? <img src={t.avatarUrl} alt="" /> : <Ms name="account" />}
    </Link>
  );
}

/** Home's top line: the lowercase lockup, drop sized like a letter. */
export function HomeHead({ week, mine }: { week: number; mine: number | null }) {
  return (
    <div className={s.head}>
      <Link href="/lab/app" className={s.lockup} aria-label="splash, home">
        <Drop className={s.lockupMark} />
        splash
      </Link>
      <span className={s.headR}>
        <span className={s.wk}>Week {week}</span>
        <Account mine={mine} />
      </span>
    </div>
  );
}

/**
 * Every other tab's top page: its own icon and name, in the same Switzer as
 * the lockup. Screens below a tab's top page pass `back` and get the top bar
 * instead: back to where you were, the page's title, your avatar.
 */
export function SectionHead({ icon, word, week, mine, back, title }: { icon: MsName; word: string; week: number; mine: number | null; back?: Back; title?: string }) {
  // Sub pages keep the branded large title under the top bar; it collapses
  // into the bar as the page scrolls.
  if (back) {
    const brand = (title ?? word).toLowerCase();
    return (
      <>
        <TopBar word={brand} icon={icon} back={back} right={<Account mine={mine} />} />
        <div className={s.head}>
          <h1 id="pageTitle" className={s.secHead}>
            <Ms name={icon} />
            {brand}
          </h1>
          <span className={s.headR}>
            <span className={s.wk}>Week {week}</span>
          </span>
        </div>
      </>
    );
  }
  return (
    <div className={s.head}>
      <h1 className={s.secHead}>
        <Ms name={icon} />
        {word}
      </h1>
      <span className={s.headR}>
        <span className={s.wk}>Week {week}</span>
        <Account mine={mine} />
      </span>
    </div>
  );
}


/**
 * Splash 4.0's frame: paper and wallpaper, the page, and the dock with the
 * score bar over the tab bar. The bar shows whichever matchup the clock says:
 * last week's final, next week's preview, or this week live.
 */
export default function Shell({ data, active, children, barDock }: { data: V4Data; active: string; children: ReactNode; barDock?: string }) {
  const mine = data.mine;
  return (
    <div className={s.root}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <Pattern mode="wallpaper" />
      <main className={s.page}>{children}</main>
      <div className={s.dock}>
        {mine ? (
          <ScoreBar week={data.week} state={data.state} rows={[mine.a, mine.b]} href="/lab/app/matchup" dockTo={barDock} />
        ) : (
          <Link href="/lab/app/account" className={s.bar} style={{ textDecoration: 'none' }}>
            <span className={s.barHead}>
              <b>Week {data.week} Matchup</b>
              <span>Pick your team</span>
            </span>
          </Link>
        )}
        <TabBar active={active} />
      </div>
      <PlayerSheet />
      <Suspense fallback={null}>
        <Tracker />
      </Suspense>
      <LiveStart live={data.state === 'live' && data.games.some((g) => g.inPlay)} week={data.week} />
      {mine ? <SquirtLive week={data.week} state={data.state} me={mine.a.rosterId} them={mine.b.rosterId} base={[mine.a.score, mine.b.score]} /> : null}
    </div>
  );
}
