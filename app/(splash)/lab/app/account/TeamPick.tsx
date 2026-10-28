'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readMyTeam, setMyTeam } from '@/lib/my-team';
import { Ms } from '../icons';
import { Avatar, ui } from '../ui';
import a from './account.module.css';

/**
 * Pick your team: one row per team, yours checked. The same write as every
 * version of the app (the cookie, through setMyTeam), then a refresh, since
 * every page behind it is a server component reading that cookie. On arrival
 * it reads the device's choice, which also moves a team saved in the old
 * storage key into the cookie, and refreshes once if the server missed it.
 */
export default function TeamPick({ teams, current, className = '' }: { className?: string; teams: { rosterId: number; teamName: string; manager: string; avatar: string | null; color: string | null }[]; current: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState<number | null>(current);

  useEffect(() => {
    const saved = readMyTeam();
    if (saved && saved !== current) {
      setValue(saved);
      router.refresh();
    }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (next: number | null) => {
    setValue(next);
    setMyTeam(next);
    router.refresh();
  };

  return (
    <div className={`${ui.list} ${className}`} role="radiogroup" aria-label="Your team">
      {teams.map((t) => {
        const on = t.rosterId === value;
        return (
          <button key={t.rosterId} type="button" role="radio" aria-checked={on} className={`${ui.row} ${a.reset}`} onClick={() => pick(on ? null : t.rosterId)}>
            <Avatar src={t.avatar} color={t.color} size={34} />
            <span className={ui.body}>
              <span className={`${ui.title} ${on ? ui.strong : ''}`}>{t.teamName}</span>
              <span className={ui.sub}>{t.manager}</span>
            </span>
            <span className={`${a.check} ${ui.labelBrand}`} aria-hidden>
              {on ? <Ms name="check" size={20} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
