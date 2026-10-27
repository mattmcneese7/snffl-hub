import type { ReactNode } from 'react';
import { CUT_WIDTH, LACE_SPINE, LACE_STITCHES, SEAM_FOOT, SEAM_TOP } from '../../marks';
import BackButton from './nav/BackButton';
import TopTitle from './nav/TopTitle';
import type { MsName } from './icons';
import s from './v4.module.css';

/**
 * The frame's own parts, safe on the server and in the browser alike: the
 * drop, the tab bar and the top bar. Shell, the loading skeletons and the
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

/** The five tabs, on every screen; each remembers where you left it. */
export { default as TabBar } from './nav/TabBar';

/** Where a sub page goes back to when there is no earlier screen this session. */
export type Back = { href: string; label: string };

/**
 * The top bar on every screen below a tab's top page: back to where you
 * were (named), the page's branded wordmark once its large title has
 * scrolled away, and whatever sits on the right (your avatar). Pinned under
 * the status bar.
 */
export function TopBar({ word, icon, back, right }: { word: string; icon?: MsName; back: Back; right?: ReactNode }) {
  return (
    <header className={s.topBar}>
      <BackButton fallbackHref={back.href} fallbackLabel={back.label} />
      <TopTitle icon={icon} word={word} />
      <span className={s.topRight}>{right}</span>
    </header>
  );
}
