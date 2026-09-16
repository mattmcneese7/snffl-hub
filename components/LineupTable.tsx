import type { GameSide, LineupSlot } from '@/lib/types';

function PlayerCell({ player, align }: { player?: LineupSlot; align: 'left' | 'right' }) {
  if (!player) return <span />;
  return (
    <div className={`snffl-lineup-player${align === 'right' ? ' snffl-lineup-player-right' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="snffl-lineup-headshot" src={player.headshot} alt="" loading="lazy" />
      <span>
        <span className="snffl-lineup-name">{player.name}</span>
        <span className="snffl-lineup-meta">
          {player.position}
          {player.team ? ` · ${player.team}` : ''} &middot;{' '}
          <span className="snffl-lineup-points">{player.points.toFixed(2)}</span>
        </span>
      </span>
    </div>
  );
}

/** Side by side lineups with the position tag in the centre, per Section 2. */
export default function LineupTable({ away, home }: { away: GameSide; home: GameSide }) {
  const rows = Math.max(away.lineup.length, home.lineup.length);
  const benchTotal = (side: GameSide) =>
    (side.bench ?? []).reduce((sum, p) => sum + p.points, 0);

  return (
    <div className="snffl-card">
      {Array.from({ length: rows }, (_, i) => {
        const a = away.lineup[i];
        const h = home.lineup[i];
        return (
          <div className="snffl-lineup-row" key={i}>
            <PlayerCell player={a} align="left" />
            <span className="snffl-lineup-slot">
              <span>{a?.slot ?? h?.slot ?? ''}</span>
            </span>
            <PlayerCell player={h} align="right" />
          </div>
        );
      })}

      <div className="snffl-lineup-totals snffl-numeric">
        <span>{away.points.toFixed(2)}</span>
        <span className="snffl-lineup-slot">
          <span>TOTAL</span>
        </span>
        <span style={{ textAlign: 'right' }}>{home.points.toFixed(2)}</span>
      </div>

      {(away.bench?.length || home.bench?.length) ? (
        <details className="snffl-lineup-bench">
          <summary>
            Bench ({benchTotal(away).toFixed(2)} and {benchTotal(home).toFixed(2)})
          </summary>
          {Array.from(
            { length: Math.max(away.bench?.length ?? 0, home.bench?.length ?? 0) },
            (_, i) => (
              <div className="snffl-lineup-row" key={`bench-${i}`}>
                <PlayerCell player={away.bench?.[i]} align="left" />
                <span className="snffl-lineup-slot">
                  <span>BN</span>
                </span>
                <PlayerCell player={home.bench?.[i]} align="right" />
              </div>
            )
          )}
        </details>
      ) : null}
    </div>
  );
}
