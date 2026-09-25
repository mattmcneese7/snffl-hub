import Link from 'next/link';
import Chrome from '@/components/Chrome';
import LiveRefresh from '@/components/LiveRefresh';
import ManagerLink from '@/components/ManagerLink';
import { PageSources } from '@/components/SourceMark';
import WinBar from '@/components/WinBar';
import { league, getWeekGames, scoredWeek, teamByRoster } from '@/lib/league';
import { getWeekProjections } from '@/lib/projections';
import {
  getGameExtras,
  getGameLines,
  getNflGames,
  impliedTeamTotal,
  leagueEntriesInGame,
  weatherIcon,
  type GameLines,
  type GameWeather,
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

/** "Sun, Sep 27, 12:00 PM". Short weekday, because the long one was the word
 *  that pushed this line onto a second row. */
function kickoff(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }).format(new Date(iso));
}

const money = (n: number | null) => (n == null ? null : n > 0 ? `+${n}` : `${n}`);

const GLYPH: Record<string, string> = {
  sun: '\u2600\uFE0E',
  clear: '\u263D',
  partly: '\u26C5\uFE0E',
  cloud: '\u2601\uFE0E',
  rain: '\u2614\uFE0E',
  snow: '\u2744\uFE0E',
  wind: '\uD83C\uDF2C\uFE0F',
};

/**
 * Kickoff conditions, which in football are not decoration: a twenty mile an
 * hour wind is the difference between a kicker and a liability, and rain is
 * why your receiver caught three of nine. Shown only for a game not yet
 * played, outdoors.
 */
function Forecast({ weather }: { weather: GameWeather }) {
  const icon = weatherIcon(weather.conditionId, weather.windSpeed);
  return (
    <div className="snffl-nflg-wx">
      <span className="snffl-nflg-wx-icon" aria-hidden>
        {GLYPH[icon] ?? GLYPH.cloud}
      </span>
      <div className="snffl-nflg-wx-facts">
        {weather.temperature != null ? (
          <span>
            <b className="snffl-numeric">{weather.temperature}&deg;</b>
            <span className="snffl-label">Temp</span>
          </span>
        ) : null}
        {weather.windSpeed != null ? (
          <span>
            <b className="snffl-numeric">
              {weather.windSpeed}
              <small> mph</small>
            </b>
            <span className="snffl-label">Wind {weather.windDirection ?? ''}</span>
          </span>
        ) : null}
        {weather.precipitation != null ? (
          <span>
            <b className="snffl-numeric">{weather.precipitation}%</b>
            <span className="snffl-label">Precip</span>
          </span>
        ) : null}
      </div>
      {weather.summary ? <p className="snffl-nflg-wx-note">{weather.summary} at kickoff</p> : null}
    </div>
  );
}

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

  const [lines, weekGames, extras, projections] = await Promise.all([
    getGameLines(game.id, game.state === 'in').catch(() => null),
    getWeekGames(week).catch(() => []),
    getGameExtras(game.id, game.state === 'in').catch(() => ({
      venue: null,
      weather: null,
      attendance: null,
    })),
    getWeekProjections(league.season, week).catch(() => ({}) as Record<string, number>),
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
          {/* The ground it is played on, behind the score. A row of numbers
              tells you nothing about why a Sunday at Lambeau in December is
              different from one in a dome, and ESPN keeps a photograph of
              every stadium. It sits under a heavy scrim because the score has
              to stay readable over whatever the picture is doing. */}
          <div
            className={`snffl-nflg-art${extras.venue?.image ? '' : ' snffl-nflg-art-bare'}`}
            style={{ ['--home' as string]: game.home.color ?? '#1b2740' }}
            aria-hidden
          >
            {extras.venue?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={extras.venue.image} alt="" />
            ) : null}
          </div>
          {/* One line, in the interface face rather than tracked out mono.
              This was two columns of letter spaced capitals that each wrapped
              onto a second row, and the venue was in it twice: once here and
              again under the board, where it belongs with the city. */}
          <header className="snffl-nflg-head">
            {game.state === 'in' ? (
              <span className="snffl-live-pill snffl-live-pill-sm">
                <span className="snffl-live-pill-dot" aria-hidden />
                {game.period && game.period > 4 ? 'OT' : `Q${game.period ?? 1}`} {game.clock}
              </span>
            ) : null}
            <p className="snffl-nflg-when">
              {[
                game.state === 'pre' ? kickoff(game.kickoff) : game.state === 'post' ? 'Final' : '',
                game.broadcast,
              ]
                .filter(Boolean)
                .join(' \u00B7 ')}
            </p>
          </header>

          <div className="snffl-nflg-sides">
            <Side side={game.away} lines={lines} home={false} />
            <Side side={game.home} lines={lines} home />
          </div>

          {game.state === 'in' && game.situation ? (
            <p className="snffl-nflg-situation">{game.situation}</p>
          ) : null}

          {extras.venue ? (
            <p className="snffl-nflg-venue">
              {extras.venue.name}
              {extras.venue.city ? ` \u00B7 ${extras.venue.city}` : ''}
              {extras.venue.state ? `, ${extras.venue.state}` : ''}
              {extras.venue.indoor ? ' \u00B7 Indoors' : ''}
              {extras.attendance ? ` \u00B7 ${extras.attendance.toLocaleString()} in` : ''}
            </p>
          ) : null}

          {awayWin != null && game.state !== 'post' ? (
            <WinBar
              away={{ pct: awayWin, primary: game.away.color ?? '#72809f', name: game.away.name }}
              home={{
                pct: 1 - awayWin,
                primary: game.home.color ?? '#9aa7bd',
                name: game.home.name,
              }}
              caption={game.state === 'in' ? 'Live win prob' : 'Moneyline'}
            />
          ) : null}
        </article>

        {game.state === 'pre' && extras.weather ? (
          <section>
            <div className="snffl-block-heading">
              <h2 className="snffl-headline">At Kickoff</h2>
            </div>
            <div className="snffl-card">
              <Forecast weather={extras.weather} />
            </div>
          </section>
        ) : null}

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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="snffl-nflg-face"
                            src={entry.headshot}
                            alt=""
                            loading="lazy"
                          />
                          <Link href={`/players/${entry.playerId}`}>{entry.name}</Link>
                          <span className="snffl-menu-note">
                            {entry.slot ?? 'Bench'} &middot; {entry.position} &middot;{' '}
                            {entry.nflTeam}
                            {projections[entry.playerId] != null
                              ? ` \u00B7 Proj ${projections[entry.playerId].toFixed(1)}`
                              : ''}
                          </span>
                          {/* Before kickoff the projection is the only number
                              there is, so it is the number. Afterwards it moves
                              to the line under the name and what he actually
                              did takes its place, green when he cleared it.
                              Both at full size squeezed the name into two
                              lines on a phone. */}
                          {game.state === 'pre' ? (
                            <b className="snffl-numeric snffl-nflg-pending">
                              {projections[entry.playerId] != null
                                ? projections[entry.playerId].toFixed(1)
                                : '-'}
                            </b>
                          ) : (
                            <b
                              className={`snffl-numeric${
                                projections[entry.playerId] != null &&
                                entry.points >= projections[entry.playerId]
                                  ? ' snffl-nflg-beat'
                                  : ''
                              }`}
                            >
                              {entry.points.toFixed(2)}
                            </b>
                          )}
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

        <PageSources
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
