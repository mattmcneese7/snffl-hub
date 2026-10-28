import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wallpaper } from './ui/blocks/Wallpaper';
import { Ms, type MsName } from './icons';
import { Suspense } from 'react';
import { BarTitle, Drop, SWITZER, TabBar, TopBar, type Back } from './Chrome';
import Tracker from './nav/Tracker';

export { Drop, TabBar, TopBar, type Back };
import ScoreBar from './ScoreBar';
import ScorePop from './live/ScorePop';
import PlayerSheet from './PlayerSheet';
import { LiveStart } from './live/Live';
import SquirtLive from './squirt/SquirtLive';
import { teamByRoster } from '@/lib/league';
import type { V4Data } from './data';
import { Avatar } from './ui';
import s from './v4.module.css';
import f from './ui/blocks/Frame.module.css';
import b from './ui/blocks/ScoreBar.module.css';


/** Your avatar, top right on every screen: it opens your account. */
export function Account({ mine }: { mine: number | null }) {
  const t = mine != null ? teamByRoster(mine) : undefined;
  return (
    <Link href="/account" className={f.acct} aria-label="Account and settings">
      {t ? (
        <Avatar src={t.avatarUrl} color={t.colors?.primary} size={34} />
      ) : (
        <span className={f.acctFace}>
          <Ms name="account" />
        </span>
      )}
    </Link>
  );
}

/** Home's top bar: the lowercase lockup centered, your avatar on the right. */
export function HomeHead({ mine }: { week?: number; mine: number | null }) {
  return (
    <TopBar
      center={
        <Link href="/" className={f.lockup} aria-label="splash, home">
          <Drop className={f.lockupMark} />
          splash
        </Link>
      }
      right={<Account mine={mine} />}
    />
  );
}

/**
 * Every other page's top bar: back where there is somewhere to go back to,
 * the page's title centered (its tab's icon and lowercase name in the same
 * Switzer as the lockup, once), your avatar on the right.
 */
export function SectionHead({ icon, word, mine, back, title }: { icon: MsName; word: string; week?: number; mine: number | null; back?: Back; title?: string }) {
  return <TopBar back={back} center={<BarTitle icon={icon} word={(title ?? word).toLowerCase()} />} right={<Account mine={mine} />} />;
}

/**
 * Splash 4.0's frame: paper and wallpaper, the page, and the dock with the
 * score bar over the tab bar. The bar shows whichever matchup the clock says:
 * last week's final, next week's preview, or this week live.
 */
export default function Shell({ data, active, children, barDock }: { data: V4Data; active: string; children: ReactNode; barDock?: string }) {
  const mine = data.mine;
  return (
    <div className={`${s.root} ${f.app}`}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <Wallpaper />
      <main className={f.page}>{children}</main>
      <div className={f.dock}>
        {mine && data.state === 'live' ? <ScorePop week={data.week} sides={[mine.a, mine.b].map((x) => ({ team: x.team, starters: x.starters ?? [] }))} /> : null}
        {mine ? (
          <ScoreBar week={data.week} state={data.state} rows={[mine.a, mine.b]} href="/matchup" dockTo={barDock} />
        ) : (
          <Link href="/account" className={b.bar}>
            <span className={b.barHead}>
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
