'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { readMyTeam, setMyTeam } from '@/lib/my-team';

/**
 * Pick your team, once.
 *
 * Writes the cookie and then refreshes, which is the point: the page behind it
 * is a server component that reads the cookie, so the refresh is what turns a
 * generic page into a personal one. Without it the choice would be saved and
 * nothing on screen would change, which reads as a broken control.
 */
export default function TeamPicker({
  teams,
}: {
  teams: { rosterId: number; teamName: string; manager: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState('');

  useEffect(() => {
    const saved = readMyTeam();
    if (saved) setValue(String(saved));
  }, []);

  return (
    <select
      id="snffl-my-team"
      className="snffl-team-picker"
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        setMyTeam(next ? Number(next) : null);
        router.refresh();
      }}
    >
      <option value="">Choose a team</option>
      {teams.map((team) => (
        <option key={team.rosterId} value={team.rosterId}>
          {team.teamName} ({team.manager})
        </option>
      ))}
    </select>
  );
}
