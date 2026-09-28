import type { SwamiRead } from '@/lib/swami';
import { swamiLine } from '@/lib/swami';

/**
 * The Swami's read on one game.
 *
 * Renders nothing at all when there is nothing true to say, which is most of
 * Tuesday and all of a finished game. A panel that fills itself with "this
 * should be a good one" the moment it has no numbers is the thing this is
 * built not to be.
 */
export default function Swami({ read }: { read: SwamiRead }) {
  const line = swamiLine(read);
  if (read.settled || !line) return null;

  const max = Math.max(...read.swing.map((s) => s.leverage), 1);

  return (
    <div className="snffl-card snffl-swami">
      <p className="snffl-swami-line">{line}</p>

      {read.path ? (
        <p className="snffl-swami-path">
          <span className="snffl-label">The gap</span>
          {read.path.need} to find, {read.path.upside} available from{' '}
          {read.path.players.length} {read.path.players.length === 1 ? 'man' : 'men'} still playing.
        </p>
      ) : null}

      {read.swing.length ? (
        <div className="snffl-swami-swing">
          <span className="snffl-label">Still deciding it</span>
          {read.swing.map((s) => (
            <div key={s.player.id} className="snffl-swami-row">
              <span className="snffl-swami-who">
                {s.player.short || s.player.name}
                <em>{s.manager}</em>
              </span>
              {/* The bar is the number, not decoration: its width is his
                  leverage against the most anybody in this game has. */}
              <span className="snffl-swami-bar" aria-hidden>
                <span style={{ width: `${Math.round((s.leverage / max) * 100)}%` }} />
              </span>
              <span className="snffl-swami-lev">{s.leverage.toFixed(1)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {read.edges.length ? (
        <div className="snffl-swami-edges">
          <span className="snffl-label">Matchups</span>
          {read.edges.map((e) => (
            <span
              key={e.player.id}
              className={`snffl-swami-edge snffl-outlook-${e.matchup!.label}`}
            >
              {e.player.short || e.player.name} {e.matchup!.label} vs {e.matchup!.opponent}
            </span>
          ))}
        </div>
      ) : null}

      {read.confidence === 'thin' && read.edges.length ? (
        <p className="snffl-swami-caveat">
          Matchup reads are built on {read.confidence === 'thin' ? 'two' : 'a few'} games of
          defensive data. Treat them as a nudge, not a verdict.
        </p>
      ) : null}
    </div>
  );
}
