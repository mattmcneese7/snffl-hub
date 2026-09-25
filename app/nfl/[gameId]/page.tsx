import Link from 'next/link';
import Chrome from '@/components/Chrome';
import LiveRefresh from '@/components/LiveRefresh';
import ManagerLink from '@/components/ManagerLink';
import { SourceStrip } from '@/components/SourceMark';
import WinBar from '@/components/WinBar';
import { getWeekGames, scoredWeek, teamByRoster } from '@/lib/league';
import {
  getGameLines,
  getNflGames,
  impliedTeamTotal,
  leagueEntriesInGame,
  type GameLines,
  type NflGame,
  type NflSide,
} from '@/lib/gameday';

/**
 * One NFL game, from this league's point of view.
 *
 * The slate on Home was labelled The Lines, which described the smallest part
 * of it and nothing else, and the cards went nowhere. Nobody in a fourteen
 * person league opens an NFL game for the football: they open it because
 * three of their starters are in it, so this page leads with the score, says
 * who is expected to win and why, and then names every league player on the
 * field and who owns him.
 */
export const revalidate = 60;

function kickoff(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }).format(new Date(iso));
}

const money = (n: number | null) => (n == null ? null : n > 0 ? `+${n}` : `${n}`);

function Side({ side, lines, home }: { side: NflSide; lines: GameLines | null; home: boolean }) {
  const total = impliedTeamTotal(lines ?? undefined, home);
  const ml = money(home ? (lines?.home.moneyline ?? null) : (lines?.away.moneyline ?? null));
  return (
    <div className={`snffl-nflg-side${home ? ' snffl-nflg-side-home' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="snffl-nflg-logo" src={side.logo} alt="" />
      <span className="snffl-nflg-abbr">{side.abbr}</span>
      <span className="snffl-nflg-name">{side.name}</span>
      {side.record ? <span className="snffl-nflg-record">{side.record}</span> : null}
      <span className="snffl-nflg-score snffl-numeric">{side.score ?? '-'}</span>
      <span className="snffl-nflg-book">
        {ml ? <b className="snffl-numeric">{ml}</b> : null}
        {total != null ? <span className="snffl-label">TT {total}</span> : null}
      </span>
    </div>
  );
}

export async function generateStaticParams() {
  // Pre-render this week's slate; anything else renders on demand.
  const games = await getNflGames().catch(() => []);
  return games.map((game) => ({ gameId: game.id }));
}

export default async function NflGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const week = await scoredWeek();
  const games = await getNflGames().catch((): NflGame[] => []);
  const game = games.find((g) => g.id === gameId);

  if (!game) {
    return (
      <>
        <Chrome section="Scoreboard" week={week} />
        <main className="snffl-page">
          <Link className="snffl-back" href={`/matchups/${week}`}>
            <span aria-hidden>&lsaquo;</span> Scoreboard
          </Link>
          <div className="snffl-placeholder">
            <span className="snffl-placeholder-label">Game not listed</span>
            <span className="snffl-placeholder-note">
              ESPN is not carrying this game on the current slate. It may belong to another week.
            </span>
          </div>
        </main>
      </>
    );
  }

  const [lines, weekGames] = await Promise.all([
    getGameLines(game.id, game.state === 'in').catch(() => null),
    getWeekGames(week).catch(() => []),
  ]);

  const entries = leagueEntriesInGame(weekGames, [game.away.abbr, game.home.abbr]);
  // Grouped by manager, because "who does this game matter to" is the question,
  // and a flat list of nine players sorted by points does not answer it.
  const byManager = new Map<number, typeof entries>();
  for (const entry of entries) {
    const list = byManager.get(entry.rosterId) ?? [];
    list.push(entry);
    byManager.set(entry.rosterId, list);
  }
  const managers = [...byManager.entries()].sort(
    (a, b) =>
      b[1].filter((e) => e.slot).length - a[1].filter((e) => e.slot).length ||
      b[1].length - a[1].length
  );

  const awayWin =
    lines?.liveHomeWin != null && game.state === 'in'
      ? 1 - lines.liveHomeWin
      : (lines?.away.implied ?? null);
  const starters = entries.filter((e) => e.slot).length;

  return (
    <>
      <Chrome section="Scoreboard" sub={`${game.away.abbr} at ${game.home.abbr}`} week={week} />
      <LiveRefresh live={game.state === 'in'} week={week} />
      <main className="snffl-page">
        <Link className="snffl-back" href={`/matchups/${week}`}>
          <span aria-hidden>&lsaquo;</span> Scoreboard
        </Link>

        {/* The board below is the title, same as a fantasy matchup page. */}
        <h1 className="snffl-visually-hidden">
          {game.away.name} at {game.home.name}
        </h1>

        <article className="snffl-card snffl-nflg">
          <header className="snffl-nflg-head">
            {game.state === 'in' ? (
              <span className="snffl-live-pill snffl-live-pill-sm">
                <span className="snffl-live-pill-dot" aria-hidden />
                {game.period && game.period > 4 ? 'OT' : `Q${game.period ?? 1}`} {game.clock}
              </span>
            ) : (
              <span className="snffl-label">
                {game.state === 'pre' ? kickoff(game.kickoff) : 'Final'}
              </span>
            )}
            <span className="snffl-label">
              {[game.broadcast, game.venue].filter(Boolean).join(' · ')}
            </span>
          </header>

          <div className="snffl-nflg-sides">
            <Side side={game.away} lines={lines} home={false} />
            <Side side={game.home} lines={lines} home />
          </div>

          {game.state === 'in' && game.situation ? (
            <p className="snffl-nflg-situation">{game.situation}</p>
          ) : null}

          {awayWin != null && game.state !== 'post' ? (
            <WinBar
              away={{ pct: awayWin, primary: game.away.color ?? '#72809f', name: game.away.name }}
              home={{
                pct: 1 - awayWin,
                primary: game.home.color ?? '#9aa7bd',
                name: game.home.name,
              }}
              caption={game.state === 'in' ? 'Live win probability' : 'Implied by the moneyline'}
            />
          ) : null}
        </article>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">The Line</h2>
            {lines?.provider ? (
              <span className="snffl-block-heading-link">{lines.provider}</span>
            ) : null}
          </div>
          {lines ? (
            <div className="snffl-card snffl-nflg-book-grid">
              <div>
                <span className="snffl-label">Spread</span>
                <b>{lines.details ?? '-'}</b>
              </div>
              <div>
                <span className="snffl-label">Total</span>
                <b className="snffl-numeric">{lines.overUnder ?? '-'}</b>
              </div>
              <div>
                <span className="snffl-label">{game.away.abbr} money</span>
                <b className="snffl-numeric">{money(lines.away.moneyline) ?? '-'}</b>
              </div>
              <div>
                <span className="snffl-label">{game.home.abbr} money</span>
                <b className="snffl-numeric">{money(lines.home.moneyline) ?? '-'}</b>
              </div>
            </div>
          ) : (
            <div className="snffl-placeholder">
              <span className="snffl-placeholder-label">No line posted</span>
              <span className="snffl-placeholder-note">
                ESPN has no book on this game yet. Lines usually land in the week before kickoff.
              </span>
            </div>
          )}
          <p className="snffl-chug-axis-note">
            TT is the implied team total: what the spread and the over under say each side scores.
            Read, not placed. Nobody bets from here.
          </p>
        </section>

        <section>
          <div className="snffl-block-heading">
            <h2 className="snffl-headline">Who Has Skin In This</h2>
            <span className="snffl-block-heading-link">
              {starters} {starters === 1 ? 'starter' : 'starters'}
            </span>
          </div>
          {managers.length ? (
            <div className="snffl-nflg-managers">
              {managers.map(([rosterId, list]) => {
                const team = teamByRoster(rosterId);
                return (
                  <div className={`snffl-card snffl-nflg-mgr mgr-${team?.userId}`} key={rosterId}>
                    <div className="snffl-nflg-mgr-head">
                      <span className="snffl-standings-colorbar" />
                      <span className="snffl-mini-body">
                        <ManagerLink rosterId={rosterId} className="snffl-standings-team-name">
                          {team?.teamName ?? list[0].teamName}
                        </ManagerLink>
                        <span className="snffl-standings-manager">{list[0].manager}</span>
                      </span>
                    </div>
                    <ul className="snffl-nflg-players">
                      {list.map((entry) => (
                        <li key={`${rosterId}-${entry.playerId}`}>
                          <Link href={`/players/${entry.playerId}`}>{entry.name}</Link>
                          <span className="snffl-menu-note">
                            {entry.slot ?? 'Bench'} · {entry.position} · {entry.nflTeam}
                          </span>
                          <b className="snffl-numeric">{entry.points.toFixed(2)}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="snffl-placeholder">
              <span className="snffl-placeholder-label">Nobody in the league</span>
              <span className="snffl-placeholder-note">
                No rostered player is in this game, so it is just football.
              </span>
            </div>
          )}
        </section>

        <SourceStrip
          items={[
            { source: 'espn', label: 'Scores and win probability' },
            { source: 'draftkings', label: 'Lines' },
            { source: 'sleeper', label: 'Rosters' },
          ]}
        />
      </main>
    </>
  );
}
