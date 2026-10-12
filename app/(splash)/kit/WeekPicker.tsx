'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import k from './kit.module.css';

/**
 * Weeks 1 to 17 as a rail of pills, the chosen one in powder, scrolled so it
 * sits in view. Each pill links to `${base}/${week}`. `base` is a plain
 * string so a server page can pass it (a function cannot cross into a
 * client component).
 */
export default function WeekPicker({
  week,
  base,
  href,
  max = 17,
}: {
  week: number;
  base?: string;
  /** Only from another client component; a server page passes `base`. */
  href?: (w: number) => string;
  max?: number;
}) {
  const to = (w: number) => (href ? href(w) : `${base ?? ''}/${w}`);
  const rail = useRef<HTMLDivElement>(null);
  const on = useRef<HTMLAnchorElement>(null);
  useLayoutEffect(() => {
    const r = rail.current;
    const el = on.current;
    if (r && el) r.scrollLeft = el.offsetLeft - (r.clientWidth - el.offsetWidth) / 2;
  }, [week]);
  return (
    <nav className={k.weeks} ref={rail} aria-label="Week">
      {Array.from({ length: max }, (_, i) => i + 1).map((w) => (
        <Link key={w} ref={w === week ? on : undefined} href={to(w)} className={`${k.week} ${w === week ? k.weekOn : ''}`} aria-current={w === week ? 'page' : undefined}>
          Week {w}
        </Link>
      ))}
    </nav>
  );
}
