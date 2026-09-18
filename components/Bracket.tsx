'use client';

import { useState } from 'react';
import type { BracketRound } from '@/lib/postseason';

/**
 * The bracket with round tabs, Brief Section 2.
 *
 * Tabs rather than a scrolling tree: a 14 team bracket does not fit a phone
 * sideways, and a round at a time is how anybody reads one anyway.
 */
export default function Bracket({
  rounds,
  byeRosterIds = [],
  emptyNote,
}: {
  rounds: BracketRound[];
  byeRosterIds?: number[];
  emptyNote: string;
}) {
  const liveRound = rounds.findIndex((round) => round.games.some((game) => game.status === 'live'));
  const lastPlayed = rounds.map((r) => r.games.some((g) => g.status === 'final')).lastIndexOf(true);
  const [active, setActive] = useState(Math.max(0, liveRound >= 0 ? liveRound : lastPlayed));

  if (!rounds.length) {
    return (
      <div className="snffl-placeholder">
        <span className="snffl-placeholder-label">No bracket yet</span>
        <span className="snffl-placeholder-note">{emptyNote}</span>
      </div>
    );
  }

  const round = rounds[Math.min(active, rounds.length - 1)];

  return (
    <div>
      <div className="snffl-bracket-tabs">
        {rounds.map((entry, index) => (
          <button
            key={entry.round}
            type="button"
            className={`snffl-bracket-tab${index === active ? ' snffl-bracket-tab-active' : ''}`}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
          >
            {entry.name}
          </button>
        ))}
      </div>

      <div className="snffl-card">
        {round.games.map((game) => (
          <div className="snffl-bracket-game" key={game.matchId}>
            <div className="snffl-bracket-head">
              <span className="snffl-bracket-label">
                {game.placement === 1
                  ? 'Championship'
                  : game.placement
                    ? `${game.placement}th place`
                    : round.name}
              </span>
              {game.status === 'live' ? (
                <span className="snffl-bracket-live">
                  <span className="snffl-bracket-live-dot" aria-hidden />
                  LIVE
                </span>
              ) : game.status === 'final' ? (
                <span className="snffl-bracket-status">Final</span>
              ) : null}
            </div>

            {[game.home, game.away].map((side, index) => (
              <div
                className={`snffl-bracket-side${side.won ? ' snffl-bracket-side-won' : ''}`}
                key={index}
              >
                <span className="snffl-bracket-seed snffl-numeric">
                  {side.seed ?? '–'}
                </span>
                <span className="snffl-bracket-team">
                  {side.rosterId != null ? side.team : (side.from ?? 'To be decided')}
                  {side.rosterId != null && byeRosterIds.includes(side.rosterId) ? (
                    <span className="snffl-bracket-bye">BYE</span>
                  ) : null}
                </span>
                {side.manager ? (
                  <span className="snffl-bracket-manager">{side.manager}</span>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
