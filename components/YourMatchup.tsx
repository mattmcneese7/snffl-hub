'use client';

import { useEffect, useState } from 'react';
import FeatureMatchup, { type FeatureData } from './FeatureMatchup';
import { SleeperActions } from './SleeperAction';

const STORAGE_KEY = 'snffl.myTeam';

/**
 * The brief's Your Matchup: a team picked once and remembered on the device,
 * with no login. Options arrive as plain data from the server, so nothing here
 * pulls the player file into the browser.
 */
export default function YourMatchup({
  options,
  teams,
}: {
  options: FeatureData[];
  teams: { rosterId: number; teamName: string; manager: string }[];
}) {
  const [rosterId, setRosterId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRosterId(Number(saved));
    } catch {
      // Private browsing can refuse storage. The picker still works this visit.
    }
    setReady(true);
  }, []);

  const choose = (value: number | null) => {
    setRosterId(value);
    try {
      if (value == null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignored for the same reason.
    }
  };

  // Nothing is rendered until the device has been read, so the wrong team never
  // flashes on screen first.
  if (!ready) return <div className="snffl-placeholder" aria-hidden />;

  const mine = rosterId == null ? null : options.find(
    (game) => game.home.rosterId === rosterId || game.away.rosterId === rosterId
  );

  if (!mine) {
    return (
      <div className="snffl-placeholder">
        <span className="snffl-placeholder-label">Pick your team</span>
        <span className="snffl-placeholder-note">
          Remembered on this device. No account, no login.
        </span>
        <select
          className="snffl-team-picker"
          value={rosterId ?? ''}
          onChange={(e) => choose(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Choose a team</option>
          {teams.map((team) => (
            <option key={team.rosterId} value={team.rosterId}>
              {team.teamName} ({team.manager})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <>
      <FeatureMatchup data={mine} />
      {mine.status !== 'final' ? <SleeperActions actions={['lineup', 'players']} /> : null}
      <button className="snffl-change-team" type="button" onClick={() => choose(null)}>
        Change team
      </button>
    </>
  );
}
