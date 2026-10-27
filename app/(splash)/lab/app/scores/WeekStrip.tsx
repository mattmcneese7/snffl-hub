'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import x from './scores.module.css';

/**
 * Weeks 1 to the last fantasy week as one row of chips, the week on screen
 * filled and scrolled to the middle on arrival.
 */
export default function WeekStrip({ week, last, base, query = false }: { week: number; last: number; base: string; query?: boolean }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = row.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (on && row.current) row.current.scrollLeft = on.offsetLeft - row.current.clientWidth / 2 + on.clientWidth / 2;
  }, [week]);
  return (
    <nav ref={row} className={x.weeks} aria-label="Weeks">
      {Array.from({ length: last }, (_, i) => i + 1).map((w) => (
        <Link key={w} href={query ? `${base}?week=${w}` : `${base}/${w}`} className={`${x.wkChip} ${w === week ? x.wkOn : ''}`} aria-current={w === week ? 'page' : undefined}>
          Week {w}
        </Link>
      ))}
    </nav>
  );
}
