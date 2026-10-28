'use client';

import { useEffect, useState, type ReactNode } from 'react';

/** Hides a paid chug once this phone has watched it (the chug pop's seen mark). */
export default function ChugSeenGate({ week, children }: { week: number; children: ReactNode }) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const check = () => {
      try {
        setSeen(localStorage.getItem(`splash4.chug.seen.w${week}`) === '1');
      } catch {
        setSeen(false);
      }
    };
    check();
    window.addEventListener('popstate', check);
    window.addEventListener('focus', check);
    return () => {
      window.removeEventListener('popstate', check);
      window.removeEventListener('focus', check);
    };
  }, [week]);
  return seen ? null : <>{children}</>;
}
