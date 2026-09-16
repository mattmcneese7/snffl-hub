import type { NflGame } from '@/lib/types';

/**
 * NFL scores as a column, for Home's game day layout, Brief Section 40.
 *
 * The scoreboard already feeds the ticker, but a ticker scrolls past and this
 * has to be readable at a glance while somebody watches their lineup.
 *
 * In progress games come first: during a live window they are the only ones
 * anybody is looking at.
 */
const order = (game: NflGame) => (game.state === 'in' ? 0 : game.state === 'pre' ? 1 : 2);

export default function NflScores({ games }: { games: NflGame[] }) {
  if (!games.length) {
    return (
      <div className="snffl-placeholder">
        <span className="snffl-placeholder-label">No games listed</span>
        <span className="snffl-placeholder-note">
          ESPN has nothing on the slate right now. Scores appear on game day.
        </span>
      </div>
    );
  }

  const sorted = [...games].sort((a, b) => order(a) - order(b));

  return (
    <div className="snffl-card">
      {sorted.map((game) => (
        <div
          className={`snffl-nfl-row${game.state === 'in' ? ' snffl-nfl-row-live' : ''}`}
          key={game.id}
        >
          <span className="snffl-nfl-teams">
            <span className="snffl-nfl-team">
              <span className="snffl-nfl-abbr">{game.away.abbr}</span>
              <span className="snffl-nfl-score snffl-numeric">
                {game.away.score ?? ''}
              </span>
            </span>
            <span className="snffl-nfl-team">
              <span className="snffl-nfl-abbr">{game.home.abbr}</span>
              <span className="snffl-nfl-score snffl-numeric">
                {game.home.score ?? ''}
              </span>
            </span>
          </span>
          <span className="snffl-nfl-status">
            {game.state === 'in' ? (
              <span className="snffl-nfl-live">
                <span className="snffl-nfl-live-dot" aria-hidden />
                {game.clock ? `${game.clock} Q${game.period ?? ''}` : 'LIVE'}
              </span>
            ) : (
              game.status
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
