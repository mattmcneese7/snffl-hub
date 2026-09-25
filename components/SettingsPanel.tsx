'use client';

import { useEffect, useState } from 'react';
import AlertsToggle from './AlertsToggle';

const TEAM_KEY = 'snffl.myTeam';

export default function SettingsPanel({
  teams,
}: {
  teams: { rosterId: number; teamName: string; manager: string }[];
}) {
  const [rosterId, setRosterId] = useState<string>('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setRosterId(localStorage.getItem(TEAM_KEY) ?? '');
    } catch {
      // Private browsing can refuse storage. Controls still work this visit.
    }
    setReady(true);
  }, []);

  const chooseTeam = (value: string) => {
    setRosterId(value);
    try {
      if (value) localStorage.setItem(TEAM_KEY, value);
      else localStorage.removeItem(TEAM_KEY);
    } catch {}
  };


  if (!ready) return <div className="snffl-placeholder" aria-hidden />;

  return (
    <div className="snffl-settings">
      <div className="snffl-card snffl-settings-group">
        <label className="snffl-settings-row" htmlFor="snffl-my-team">
          <span>
            <span className="snffl-menu-label">My Team</span>
            <span className="snffl-menu-note">Remembered on this device. No account.</span>
          </span>
          <select
            id="snffl-my-team"
            className="snffl-team-picker"
            value={rosterId}
            onChange={(e) => chooseTeam(e.target.value)}
          >
            <option value="">Not set</option>
            {teams.map((team) => (
              <option key={team.rosterId} value={team.rosterId}>
                {team.teamName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="snffl-card snffl-settings-group">
        <AlertsToggle />
      </div>
    </div>
  );
}
