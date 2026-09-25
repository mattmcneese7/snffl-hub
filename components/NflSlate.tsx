import { formatMoneyline, impliedTeamTotal, type GameLines, type NflGame, type NflSide } from '@/lib/gameday';
import Link from 'next/link';
import SourceMark from './SourceMark';
import WinBar from './WinBar';

/**
 * The NFL week as a board of games: logos, records, score or kickoff, the
 * DraftKings line, and a win probability bar. Before kickoff the bar is the
 * moneyline with the book's margin removed; once a game is on it is ESPN's
 * live model.
 *
 * `starters` counts this league's starters in each game, which is the number a
 * manager actually cares about when deciding which window to watch.
 */

const ORDER = { in: 0, pre: 1, post: 2 } as const;

function kickoff(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  })
    .format(new Date(iso))
    .replace(':00', '');
}

function TeamRow({
  side,
  game,
  lines,
  home,
  winning,
}: {
  side: NflSide;
  game: NflGame;
  lines?: GameLines;
  home: boolean;
  winning: boolean;
}) {
  const book = lines ? (home ? lines.home : lines.away) : null;
  const total = impliedTeamTotal(lines, home);
  return (
    <div className={`snffl-slate-team${game.state === 'post' && !winning ? ' snffl-slate-team-lost' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="snffl-slate-logo" src={side.logo} alt="" loading="lazy" />
      <span className="snffl-slate-name">
        <strong>{side.abbr}</strong>
        <span className="snffl-slate-record">{side.record ?? ''}</span>
        {game.possession === side.abbr ? <span className="snffl-slate-ball" aria-label="Has the ball" /> : null}
      </span>
      {game.state === 'pre' ? (
        <span className="snffl-slate-book">
          {book?.moneyline != null ? <span>{formatMoneyline(book.moneyline)}</span> : null}
          {total != null ? <span className="snffl-slate-tt">TT {total}</span> : null}
        </span>
      ) : (
        <span className={`snffl-numeric snffl-slate-score${winning ? ' snffl-slate-score-win' : ''}`}>
          {side.score ?? 0}
        </span>
      )}
    </div>
  );
}

function GameCard({
  game,
  lines,
  starters,
}: {
  game: NflGame;
  lines?: GameLines;
  starters?: number;
}) {
  const awayWin = lines?.liveHomeWin != null && game.state === 'in'
    ? 1 - lines.liveHomeWin
    : (lines?.away.implied ?? null);
  const awayScore = game.away.score ?? 0;
  const homeScore = game.home.score ?? 0;

  return (
    <article className={`snffl-slate-game snffl-slate-${game.state} snffl-card-link`}>
      {/* The cards went nowhere, which made the whole slate a read only block
          of numbers. Each one opens the game from this league's side. */}
      <Link
        className="snffl-card-link-cover"
        href={`/nfl/${game.id}`}
        aria-label={`Open ${game.away.name} at ${game.home.name}`}
      />
      <header className="snffl-slate-head">
        {game.state === 'in' ? (
          <span className="snffl-live-pill snffl-live-pill-sm">
            <span className="snffl-live-pill-dot" aria-hidden />
            {game.period && game.period > 4 ? 'OT' : `Q${game.period ?? 1}`} {game.clock}
          </span>
        ) : (
          <span className="snffl-label">{game.state === 'pre' ? kickoff(game.kickoff) : 'Final'}</span>
        )}
        <span className="snffl-label">{game.broadcast ?? ''}</span>
      </header>

      <TeamRow side={game.away} game={game} lines={lines} home={false} winning={awayScore > homeScore} />
      <TeamRow side={game.home} game={game} lines={lines} home winning={homeScore > awayScore} />

      {awayWin != null && game.state !== 'post' ? (
        <div className="snffl-slate-prob">
          {/* ESPN gives each club its primary colour, so an NFL game gets the
              same treatment a fantasy one does instead of a grey bar against a
              blue one. */}
          <WinBar
            compact
            away={{
              pct: awayWin,
              primary: game.away.color ?? 'var(--muted)',
              name: game.away.abbr,
            }}
            home={{
              pct: 1 - awayWin,
              primary: game.home.color ?? 'var(--ink-secondary)',
              name: game.home.abbr,
            }}
          />
          <span className="snffl-slate-prob-caption snffl-label">
            {game.state === 'in' ? 'Live win prob' : 'Implied'}
          </span>
        </div>
      ) : null}

      <footer className="snffl-slate-foot">
        {game.state === 'in' && game.situation ? (
          <span className="snffl-slate-situation">{game.situation}</span>
        ) : lines && (lines.details || lines.overUnder != null) ? (
          <span className="snffl-slate-line">
            {lines.details ? <span>{lines.details}</span> : null}
            {lines.overUnder != null ? <span>O/U {lines.overUnder}</span> : null}
          </span>
        ) : (
          <span />
        )}
        {starters ? (
          <span className="snffl-slate-starters">
            {starters} SNFFL {starters === 1 ? 'starter' : 'starters'}
          </span>
        ) : null}
      </footer>
    </article>
  );
}

export default function NflSlate({
  games,
  lines,
  startersByTeam,
  compact = false,
}: {
  games: NflGame[];
  lines: Record<string, GameLines>;
  /** League starters per NFL team code this week. */
  startersByTeam?: Record<string, number>;
  compact?: boolean;
}) {
  if (!games.length) {
    return (
      <div className="snffl-placeholder">
        <span className="snffl-placeholder-label">No games listed</span>
        <span className="snffl-placeholder-note">
          ESPN has nothing on the slate right now. Games appear once the week is set.
        </span>
      </div>
    );
  }

  const sorted = [...games].sort(
    (a, b) => ORDER[a.state] - ORDER[b.state] || a.kickoff.localeCompare(b.kickoff)
  );
  const shown = compact ? sorted.filter((g) => g.state !== 'post').slice(0, 6) : sorted;
  const list = shown.length ? shown : sorted.slice(0, 6);

  return (
    <div className="snffl-slate-wrap">
      <div className={`snffl-slate${compact ? ' snffl-slate-compact' : ''}`}>
        {list.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            lines={lines[game.id]}
            starters={
              startersByTeam
                ? (startersByTeam[game.home.abbr] ?? 0) + (startersByTeam[game.away.abbr] ?? 0)
                : undefined
            }
          />
        ))}
      </div>
      <div className="snffl-source-strip">
        <SourceMark source="espn" label="Scores" />
        <SourceMark source="draftkings" label="Odds" />
      </div>
    </div>
  );
}
