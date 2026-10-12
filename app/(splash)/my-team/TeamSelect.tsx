'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readMyTeam, setMyTeam } from '@/lib/my-team';
import m from './mine.module.css';

/**
 * Pick your team, in Pool. The same write as v2's TeamPicker: the cookie
 * (and the old storage key, through setMyTeam), then a refresh, because the
 * page behind it is a server component that reads the cookie, and the
 * refresh is what turns a generic page into a personal one.
 *
 * On mount it reads the device's choice the way v2 did, which also moves a
 * team saved in the old localStorage home across into the cookie. When that
 * finds a team the server didn't see, it refreshes once so the page catches up.
 */
export default function TeamSelect({
  teams,
  current,
  empty = 'Choose a team',
  id = 'splash-my-team',
}: {
  teams: { rosterId: number; teamName: string; manager: string }[];
  /** What the server read from the cookie. */
  current: number | null;
  /** The label for no team. */
  empty?: string;
  id?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ? String(current) : '');

  useEffect(() => {
    const saved = readMyTeam();
    if (saved && saved !== current) {
      setValue(String(saved));
      router.refresh();
    }
    // Once, on arrival. Later changes come through onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <select
      id={id}
      className={m.select}
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        setMyTeam(next ? Number(next) : null);
        router.refresh();
      }}
    >
      <option value="">{empty}</option>
      {teams.map((team) => (
        <option key={team.rosterId} value={team.rosterId}>
          {team.teamName} ({team.manager})
        </option>
      ))}
    </select>
  );
}
