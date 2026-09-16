import Link from 'next/link';
import { teamByRoster } from '@/lib/league';
import type { Game, GameSide } from '@/lib/types';
import TeamAvatar from './TeamAvatar';

/** W, L, live dot or pending clock, per Brief Section 2. */
function flag(game: Game) {
  if (game.status === 'pending') {
    return { className: 'snffl-bug-flag-pending', label: <span aria-hidden>&#9200;</span>, title: 'Not started' };
  }
  if (game.status === 'live') {
    return { className: 'snffl-bug-flag-live', label: <span className="snffl-live-dot" aria-hidden />, title: 'In progress' };
  }
  return { className: 'snffl-bug-flag-win', label: 'W', title: 'Final' };
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
  const { className, label, title } = flag(game);
  const close = game.status !== 'pending' && game.margin < 10;

  return (
    <Link className="snffl-bug-link" href={`/matchups/${game.week}/${game.matchupId}`}>
      <div className="snffl-bug">
        <div className={`snffl-bug-flag ${className}`} title={title}>
          {label}
        </div>
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
