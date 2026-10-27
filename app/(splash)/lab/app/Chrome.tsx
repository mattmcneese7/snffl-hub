import Link from 'next/link';
import { CUT_WIDTH, LACE_SPINE, LACE_STITCHES, SEAM_FOOT, SEAM_TOP } from '../../marks';
import { Ms, type MsName } from './icons';
import s from './v4.module.css';

/**
 * The frame's own parts, safe on the server and in the browser alike: the
 * drop, the tab bar and the back link. Shell, the loading skeletons and the
 * error page all draw from here, so they cannot drift apart.
 */
export const SWITZER = 'https://api.fontshare.com/v2/css?f[]=switzer@900,901&display=swap';
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

export const TABS: { key: string; label: string; icon: MsName; href: string }[] = [
  { key: 'home', label: 'Home', icon: 'home', href: '/lab/app' },
  { key: 'scores', label: 'Scores', icon: 'football', href: '/lab/app/scores' },
  { key: 'rag', label: 'The Rag', icon: 'rag', href: '/lab/app/rag' },
  { key: 'league', label: 'League', icon: 'league', href: '/lab/app/league' },
  { key: 'swami', label: 'Swami', icon: 'swami', href: '/lab/app/swami' },
];

/** The five tabs, on every screen, the current one lit. */
export function TabBar({ active }: { active: string }) {
  return (
    <nav className={s.tabs} aria-label="Sections">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} className={`${s.tab} ${t.key === active ? s.tabOn : ''}`} aria-current={t.key === active ? 'page' : undefined}>
          <Ms name={t.icon} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Where a sub page goes back to, under its head: "‹ League". */
export type Back = { href: string; label: string };

export function BackLink({ back }: { back?: Back }) {
  return back ? (
    <Link href={back.href} className={s.back}>
      &lsaquo; {back.label}
    </Link>
  ) : null;
}

