import Link from 'next/link';
import type { ReactNode } from 'react';
import { CUT_WIDTH, LACE_SPINE, LACE_STITCHES, SEAM_FOOT, SEAM_TOP } from '../../marks';
import Pattern from '../../home/Pattern';
import { Ms, type MsName } from './icons';
import ScoreBar from './ScoreBar';
import PlayerSheet from './PlayerSheet';
import { teamByRoster } from '@/lib/league';
import type { V4Data } from './data';
import s from './v4.module.css';

const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@900,901&display=swap';
const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

/** The drop: solid blue with paper laces on light, white with blue laces on dark. */
export function Drop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d={DROP} fill="currentColor" />
      <g fill="none" strokeLinecap="round" stroke="var(--lace, #fff)">
        <path d={SEAM_TOP} strokeWidth={CUT_WIDTH.seam} />
        <path d={SEAM_FOOT} strokeWidth={CUT_WIDTH.seam} />
        <path d={LACE_SPINE} strokeWidth={CUT_WIDTH.spine} />
        <path d={LACE_STITCHES} strokeWidth={CUT_WIDTH.stitch} />
      </g>
    </svg>
  );
}

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

/** Every other tab: its own icon and name, in the same Switzer as the lockup. */
export function SectionHead({ icon, word, week, mine }: { icon: MsName; word: string; week: number; mine: number | null }) {
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

const TABS: { key: string; label: string; icon: MsName; href: string }[] = [
  { key: 'home', label: 'Home', icon: 'home', href: '/lab/app' },
  { key: 'scores', label: 'Scores', icon: 'football', href: '/lab/app/scores' },
  { key: 'rag', label: 'The Rag', icon: 'rag', href: '/lab/app/rag' },
  { key: 'league', label: 'League', icon: 'league', href: '/lab/app/league' },
  { key: 'swami', label: 'Swami', icon: 'swami', href: '/lab/app/swami' },
];

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
        <nav className={s.tabs} aria-label="Sections">
          {TABS.map((t) => (
            <Link key={t.key} href={t.href} className={`${s.tab} ${t.key === active ? s.tabOn : ''}`} aria-current={t.key === active ? 'page' : undefined}>
              <Ms name={t.icon} />
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <PlayerSheet />
    </div>
  );
}
