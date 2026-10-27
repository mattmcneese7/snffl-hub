import Link from 'next/link';
import type { ReactNode } from 'react';
import Pattern from '../../home/Pattern';
import { Ms, type MsName } from './icons';
import { BackLink, Drop, SWITZER, TabBar, type Back } from './Chrome';

export { BackLink, Drop, TabBar, type Back };
import ScoreBar from './ScoreBar';
import PlayerSheet from './PlayerSheet';
import { LiveStart } from './live/Live';
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

/** Every other tab: its own icon and name, in the same Switzer as the lockup. Sub pages pass `back`. */
export function SectionHead({ icon, word, week, mine, back }: { icon: MsName; word: string; week: number; mine: number | null; back?: Back }) {
  return (
    <>
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
      <BackLink back={back} />
    </>
  );
}


/**
 * Splash 4.0's frame: paper and wallpaper, the page, and the dock with the
 * score bar over the tab bar. The bar shows whichever matchup the clock says:
 * last week's final, next week's preview, or this week live.
 */
export default function Shell({ data, active, children }: { data: V4Data; active: string; children: ReactNode }) {
  const mine = data.mine;
  return (
    <div className={s.root}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={SWITZER} precedence="default" />
      <Pattern mode="wallpaper" />
      <main className={s.page}>{children}</main>
      <div className={s.dock}>
        {mine ? (
          <ScoreBar week={data.week} state={data.state} rows={[mine.a, mine.b]} href="/lab/app/matchup" />
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
      <LiveStart live={data.state === 'live' && data.games.some((g) => g.inPlay)} week={data.week} />
    </div>
  );
}
