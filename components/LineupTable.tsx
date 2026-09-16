import type { GameSide, LineupSlot } from '@/lib/types';

/** Name and meta on one side, the score in its own box, like a fantasy app. */
function PlayerCell({ player, align }: { player?: LineupSlot; align: 'left' | 'right' }) {
  if (!player) return <span />;
  return (
    <div className={`snffl-box-player snffl-box-player-${align}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="snffl-lineup-headshot" src={player.headshot} alt="" loading="lazy" />
      <span className="snffl-box-player-text">
        <span className="snffl-lineup-name">{player.name}</span>
        <span className="snffl-lineup-meta">
          {player.position}
          {player.team ? ` · ${player.team}` : ''}
        </span>
      </span>
    </div>
  );
}

function ScoreBox({ player }: { player?: LineupSlot }) {
  if (!player) return <span className="snffl-box-score snffl-box-score-empty">&ndash;</span>;
  return <span className="snffl-box-score snffl-numeric">{player.points.toFixed(2)}</span>;
}

export default function LineupTable({
  away,
  home,
  winner,
}: {
  away: GameSide;
  home: GameSide;
  winner?: number | null;
}) {
  const rows = Math.max(away.lineup.length, home.lineup.length);
  const benchTotal = (side: GameSide) => (side.bench ?? []).reduce((sum, p) => sum + p.points, 0);
  const awayWon = winner != null && winner === away.rosterId;
  const homeWon = winner != null && winner === home.rosterId;

  return (
    <div className="snffl-card snffl-boxscore">
      <header className="snffl-box-head">
        <span className={`snffl-box-team${awayWon ? ' snffl-box-team-won' : ''}`}>
          {awayWon ? <span className="snffl-box-flag">W</span> : null}
          {away.team}
        </span>
        <span className="snffl-box-head-slot">SLOT</span>
        <span className={`snffl-box-team snffl-box-team-right${homeWon ? ' snffl-box-team-won' : ''}`}>
          {home.team}
          {homeWon ? <span className="snffl-box-flag">W</span> : null}
        </span>
      </header>

      {Array.from({ length: rows }, (_, i) => {
        const a = away.lineup[i];
        const h = home.lineup[i];
        return (
          <div className="snffl-box-row" key={i}>
            <PlayerCell player={a} align="left" />
            <ScoreBox player={a} />
            <span className="snffl-lineup-slot">
              <span>{a?.slot ?? h?.slot ?? ''}</span>
            </span>
            <ScoreBox player={h} />
            <PlayerCell player={h} align="right" />
          </div>
        );
      })}

      <div className="snffl-box-total">
        <span className={`snffl-box-total-score snffl-numeric${awayWon ? ' snffl-box-total-won' : ''}`}>
          {away.points.toFixed(2)}
        </span>
        <span className="snffl-lineup-slot">
          <span>TOTAL</span>
        </span>
        <span className={`snffl-box-total-score snffl-numeric${homeWon ? ' snffl-box-total-won' : ''}`}>
          {home.points.toFixed(2)}
        </span>
      </div>

      {away.bench?.length || home.bench?.length ? (
        <details className="snffl-lineup-bench">
          <summary>
            Bench ({benchTotal(away).toFixed(2)} and {benchTotal(home).toFixed(2)})
          </summary>
          {Array.from(
            { length: Math.max(away.bench?.length ?? 0, home.bench?.length ?? 0) },
            (_, i) => (
              <div className="snffl-box-row" key={`bench-${i}`}>
                <PlayerCell player={away.bench?.[i]} align="left" />
                <ScoreBox player={away.bench?.[i]} />
                <span className="snffl-lineup-slot">
                  <span>BN</span>
                </span>
                <ScoreBox player={home.bench?.[i]} />
                <PlayerCell player={home.bench?.[i]} align="right" />
              </div>
            )
          )}
        </details>
      ) : null}
    </div>
  );
}
