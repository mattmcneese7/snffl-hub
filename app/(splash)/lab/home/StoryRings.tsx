'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import h from './home.module.css';

export type Ring = { week: number; cover: string | null; label: string };

const KEY = 'lab.storiesSeen';

/**
 * Story rings across the top of Home, the way every social app opens: one
 * per finished week, its cover the week's star. A ring is drawn in deep blue
 * until this device has watched it, then it goes quiet.
 */
export default function StoryRings({ rings }: { rings: Ring[] }) {
  const [seen, setSeen] = useState<number[]>([]);
  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
    } catch {}
  }, []);
  if (!rings.length) return null;
  const mark = (week: number) => {
    try {
      const next = Array.from(new Set([...seen, week]));
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };
  return (
    <nav className={h.rings} aria-label="Week stories">
      {rings.map((r) => (
        <Link key={r.week} href={`/lab/story/${r.week}`} className={`${h.ring} ${seen.includes(r.week) ? h.ringSeen : ''}`} onClick={() => mark(r.week)}>
          <span className={h.ringArt}>
            {r.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.cover} alt="" />
            ) : null}
          </span>
          <span className={h.ringLabel}>{r.label}</span>
        </Link>
      ))}
    </nav>
  );
}
