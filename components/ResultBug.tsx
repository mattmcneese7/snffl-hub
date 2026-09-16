import Link from 'next/link';
import { teamByRoster } from '@/lib/league';
import type { Game, GameSide } from '@/lib/types';
import TeamAvatar from './TeamAvatar';

/**
 * Status column.
 *
 * A finished head to head has a winner and a loser, so it gets a stacked W and
 * L lined up with the two team rows rather than one letter spanning both.
 * Live and pending are genuinely per matchup states, so those keep a single
 * dot or clock.
 */
function StatusColumn({ game }: { game: Game }) {
  if (game.status === 'pending') {
    return (
      <div className="snffl-bug-flag snffl-bug-flag-pending" title="Not started">
        <span aria-hidden>&#9200;</span>
      </div>
    );
  }

  if (game.status === 'live') {
    return (
      <div className="snffl-bug-flag snffl-bug-flag-live" title="In progress">
        <span className="snffl-live-dot" aria-hidden />
      </div>
    );
  }

  const awayWon = game.winner === game.away.rosterId;
  return (
    <div className="snffl-bug-wl-stack">
      <span className={`snffl-bug-wl ${awayWon ? 'snffl-bug-wl-win' : 'snffl-bug-wl-loss'}`}>
        {awayWon ? 'W' : 'L'}
      </span>
      <span className={`snffl-bug-wl ${awayWon ? 'snffl-bug-wl-loss' : 'snffl-bug-wl-win'}`}>
        {awayWon ? 'L' : 'W'}
      </span>
    </div>
  );
}

function Side({ side, game }: { side: GameSide; game: Game }) {
  const team = teamByRoster(side.rosterId);
  const decided = game.winner != null;
  const lost = decided && game.winner !== side.rosterId;

  return (
    <div className={`snffl-bug-side${lost ? ' snffl-bug-side-loser' : ''}`}>
      <TeamAvatar rosterId={side.rosterId} className="snffl-bug-avatar" />
      <span className="snffl-bug-team">{team?.teamName ?? side.team}</span>
      <span className="snffl-bug-score snffl-numeric">{side.points.toFixed(2)}</span>
    </div>
  );
}

export default function ResultBug({ game }: { game: Game }) {
  const close = game.status !== 'pending' && game.margin < 10;

  return (
    <Link className="snffl-bug-link" href={`/matchups/${game.week}/${game.matchupId}`}>
      <div className="snffl-bug">
        <StatusColumn game={game} />
        <div className="snffl-bug-body">
          <Side side={game.away} game={game} />
          <Side side={game.home} game={game} />
          <div className="snffl-bug-meta">
            {game.status === 'pending' ? (
              <span>Not started</span>
            ) : (
              <>
                {/* Color never works alone, so a close game says so in words. */}
                <span className="snffl-margin-chip">
                  <span>
                    &#9650; {game.margin.toFixed(2)}
                    {close ? ' · CLOSE' : ''}
                  </span>
                </span>
                <span>{game.status === 'live' ? 'Live' : 'Final'}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
