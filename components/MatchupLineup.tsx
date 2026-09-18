import Link from 'next/link';
import { formatMoneyline } from '@/lib/gameday';
import type { LiveMatchup, LivePlayer, LiveSide } from '@/lib/matchup-live';
import { LivePlayerPoints, LiveTeamPoints } from './LiveScores';
import ManagerLink from './ManagerLink';

/**
 * Starters head to head, the way a fantasy app's matchup screen reads.
 *
 * Each player carries his face, his NFL team's logo, where his game stands,
 * what he has done or is projected to do, and a bar from DraftSharks' floor to
 * ceiling with a dot for the points he has so far. The slot sits between the
 * two scores, so a row compares like for like.
 */

const INJURY_SHORT: Record<string, string> = {
  Questionable: 'Q',
  Doubtful: 'D',
  Out: 'OUT',
  IR: 'IR',
  PUP: 'PUP',
  Sus: 'SUS',
  NA: 'NA',
};

function kickoffLabel(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  })
    .format(date)
    .replace(':00', '')
    .replace(' PM', 'p')
    .replace(' AM', 'a');
}

/** "vs DET, Final 41-31 W" or "at NO, Sun 12 PM" or "at NO, Q3 4:12". */
function gameLine(player: LivePlayer): string {
  if (!player.nfl) return player.position === 'DEF' || player.team ? 'Bye week' : 'Free agent';
  const { game, opponent, home, team } = player.nfl;
  const where = `${home ? 'vs' : 'at'} ${opponent.abbr}`;
  if (game.state === 'pre') return `${where}, ${kickoffLabel(game.kickoff)}`;
  if (game.state === 'in') {
    const quarter = game.period && game.period > 4 ? 'OT' : `Q${game.period ?? 1}`;
    return `${where}, ${quarter} ${game.clock ?? ''}`.trim();
  }
  const mine = team.score ?? 0;
  const theirs = opponent.score ?? 0;
  return `${where}, ${mine > theirs ? 'W' : mine < theirs ? 'L' : 'T'} ${mine}-${theirs}`;
}

/** The line that matters for this player's game: his side's spread and total. */
function lineText(player: LivePlayer): string | null {
  const lines = player.lines;
  if (!player.nfl || !lines || player.nfl.game.state === 'post') return null;
  const parts: string[] = [];
  if (lines.details) parts.push(lines.details);
  if (lines.overUnder != null) parts.push(`O/U ${lines.overUnder}`);
  if (player.teamTotal != null) parts.push(`TT ${player.teamTotal}`);
  const side = player.nfl.home ? lines.home : lines.away;
  if (side.moneyline != null) parts.push(`ML ${formatMoneyline(side.moneyline)}`);
  return parts.join(', ');
}

function RangeBar({ player }: { player: LivePlayer }) {
  const ds = player.ds;
  if (!ds || ds.floor == null || ds.ceiling == null) return <span className="snffl-range snffl-range-empty" />;
  // One scale for every row, so bars compare across the table: zero to the
  // larger of 40 points and this player's ceiling or score.
  const max = Math.max(40, ds.ceiling * 1.1, player.points * 1.05);
  const at = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const hit = player.points >= ds.floor;
  return (
    <span
      className="snffl-range"
      role="img"
      aria-label={`DraftSharks range ${ds.floor} to ${ds.ceiling}, ${player.points.toFixed(1)} so far`}
    >
      <span className="snffl-range-band" style={{ left: at(ds.floor), width: `calc(${at(ds.ceiling)} - ${at(ds.floor)})` }} />
      {player.gameState !== 'pre' ? (
        <span className={`snffl-range-dot${hit ? ' snffl-range-dot-hit' : ''}`} style={{ left: at(player.points) }} />
      ) : null}
    </span>
  );
}

/** Face, name and position: the top line of a row. */
function PlayerId({ player, align }: { player?: LivePlayer; align: 'left' | 'right' }) {
  if (!player) return <div className={`snffl-mu-id snffl-mu-id-${align} snffl-mu-empty`} />;
  const injury = player.injury ? (INJURY_SHORT[player.injury] ?? player.injury) : null;
  const isDef = player.position === 'DEF';
  return (
    <div className={`snffl-mu-id snffl-mu-id-${align}`}>
      <Link className="snffl-mu-face" href={`/players/${player.id}`} tabIndex={-1} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={isDef ? 'snffl-mu-face-logo' : ''} src={player.headshot} alt="" loading="lazy" />
        {player.nfl && !isDef ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="snffl-mu-badge" src={player.nfl.team.logo} alt="" loading="lazy" />
        ) : null}
      </Link>
      <span className="snffl-mu-name">
        {/* "Buccaneers", not "Tampa Bay Buccaneers": the logo already says
            which team, and the full name does not fit a phone column. */}
        <Link href={`/players/${player.id}`}>
          {isDef
            ? player.name.split(' ').slice(-1)[0]
            : // The initial stays with the surname: "M." alone on a line
              // above "Stafford" is exactly the hanging fragment to avoid.
              (player.short || player.name).replace(/\. /, '.\u00a0')}
        </Link>
        {injury ? <span className="snffl-mu-injury">{injury}</span> : null}
      </span>
      <span className="snffl-mu-meta">
        {player.gameState === 'in' ? <span className="snffl-mu-live-dot" aria-hidden /> : null}
        {player.position} · {shortGame(player)}
      </span>
    </div>
  );
}

/** The one line a row can afford: "W 41-23", "Sun 12p", "Q3 4:12", "Bye". */
function shortGame(player: LivePlayer): string {
  if (!player.nfl) return player.team ? 'Bye' : 'FA';
  const { game, opponent, team, home } = player.nfl;
  if (game.state === 'pre') return `${home ? 'v' : '@'} ${opponent.abbr}, ${kickoffLabel(game.kickoff)}`;
  if (game.state === 'in') {
    const quarter = game.period && game.period > 4 ? 'OT' : `Q${game.period ?? 1}`;
    return `${quarter} ${game.clock ?? ''}`.trim();
  }
  const mine = team.score ?? 0;
  const theirs = opponent.score ?? 0;
  return `${mine > theirs ? 'W' : mine < theirs ? 'L' : 'T'} ${mine}-${theirs}`;
}

/** Game, stat line, book line and range: the full width second line. */
function PlayerInfo({ player, align }: { player?: LivePlayer; align: 'left' | 'right' }) {
  if (!player) return <div className={`snffl-mu-info snffl-mu-info-${align}`} />;
  const line = player.gameState === 'pre' || !player.statLine ? player.projectedLine : player.statLine;
  const odds = lineText(player);
  return (
    <div className={`snffl-mu-info snffl-mu-info-${align} snffl-mu-state-${player.gameState}`}>
      <span className="snffl-mu-game">
        {player.gameState === 'in' ? <span className="snffl-mu-live-dot" aria-hidden /> : null}
        {player.position} · {gameLine(player)}
      </span>
      {line ? (
        <span className={`snffl-mu-stats${player.gameState === 'pre' ? ' snffl-mu-stats-proj' : ''}`}>
          {player.gameState === 'pre' ? 'Proj ' : ''}
          {line}
        </span>
      ) : null}
      {odds ? <span className="snffl-mu-odds">{odds}</span> : null}
      <RangeBar player={player} />
    </div>
  );
}

function Points({
  player,
  winning,
  side,
  week,
}: {
  player?: LivePlayer;
  winning: boolean;
  side: 'away' | 'home';
  week: number;
}) {
  if (!player) {
    return <span className={`snffl-mu-points snffl-mu-points-${side} snffl-mu-points-empty`}>&ndash;</span>;
  }
  return (
    <span className={`snffl-mu-points snffl-mu-points-${side}${winning ? ' snffl-mu-points-win' : ''}`}>
      <LivePlayerPoints
        playerId={player.id}
        week={week}
        fallback={player.points}
        className="snffl-numeric snffl-mu-points-value"
      />
      {player.projected != null ? (
        <span className="snffl-mu-points-proj">{player.projected.toFixed(1)}</span>
      ) : null}
    </span>
  );
}

function Rows({
  away,
  home,
  bench,
  week,
}: {
  away: LivePlayer[];
  home: LivePlayer[];
  bench?: boolean;
  week: number;
}) {
  const rows = Math.max(away.length, home.length);
  return (
    <>
      {Array.from({ length: rows }, (_, i) => {
        const a = away[i];
        const h = home[i];
        const aWin = !!a && !!h && a.gameState !== 'pre' && a.points > h.points;
        const hWin = !!a && !!h && h.gameState !== 'pre' && h.points > a.points;
        return (
          // Faces, names and scores up front; the stat lines, the book line and
          // the range open on tap. Squeezing all of it into every row cost the
          // headshots their size and the columns their alignment.
          <details className="snffl-mu-row" key={`${bench ? 'b' : 's'}-${i}`}>
            <summary className="snffl-mu-main">
              <PlayerId player={a} align="left" />
              <Points player={a} winning={aWin} side="away" week={week} />
              <span className="snffl-mu-slot">
                {bench ? 'BN' : (a?.slot ?? h?.slot ?? '')}
                <span className="snffl-mu-caret" aria-hidden />
              </span>
              <Points player={h} winning={hWin} side="home" week={week} />
              <PlayerId player={h} align="right" />
            </summary>
            <div className="snffl-mu-more">
              <PlayerInfo player={a} align="left" />
              <PlayerInfo player={h} align="right" />
            </div>
          </details>
        );
      })}
    </>
  );
}

function Total({ side, align, week }: { side: LiveSide; align: 'left' | 'right'; week: number }) {
  return (
    <div className={`snffl-mu-total snffl-mu-total-${align}`}>
      <ManagerLink rosterId={side.rosterId} className="snffl-label">
        {side.team}
      </ManagerLink>
      <LiveTeamPoints
        rosterId={side.rosterId}
        week={week}
        fallback={side.points}
        className="snffl-score-xl snffl-mu-total-score"
      />
      <span className="snffl-mu-total-proj">
        Proj {side.projectedTotal.toFixed(1)}
      </span>
    </div>
  );
}

export default function MatchupLineup({ matchup }: { matchup: LiveMatchup }) {
  const { away, home } = matchup;
  const benchPoints = (side: LiveSide) => side.bench.reduce((sum, p) => sum + p.points, 0);

  return (
    <div className="snffl-card snffl-mu">
      <div className="snffl-mu-legend">
        <span className="snffl-label">Starters</span>
        <span className="snffl-mu-legend-key">
          <span className="snffl-range snffl-range-key">
            <span className="snffl-range-band" style={{ left: '15%', width: '55%' }} />
            <span className="snffl-range-dot snffl-range-dot-hit" style={{ left: '48%' }} />
          </span>
          Tap a row for stats, line and range
        </span>
      </div>

      <Rows away={away.lineup} home={home.lineup} week={matchup.game.week} />

      <div className="snffl-mu-totals">
        <Total side={away} align="left" week={matchup.game.week} />
        <span className="snffl-mu-slot">TOT</span>
        <Total side={home} align="right" week={matchup.game.week} />
      </div>

      {away.bench.length || home.bench.length ? (
        <details className="snffl-mu-bench">
          <summary>
            <span>Bench</span>
            <span className="snffl-numeric">
              {benchPoints(away).toFixed(2)} and {benchPoints(home).toFixed(2)}
            </span>
          </summary>
          <Rows away={away.bench} home={home.bench} bench week={matchup.game.week} />
        </details>
      ) : null}
    </div>
  );
}
