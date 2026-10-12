import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import LiveRefresh from '@/components/LiveRefresh';
import {
  getGameExtras,
  getGameLines,
  getNflGames,
  impliedTeamTotal,
  leagueEntriesInGame,
  type NflGame,
  type NflSide,
  type SeasonLine,
} from '@/lib/gameday';
import { getWeekGames, league, scoredWeek, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getWeekProjections } from '@/lib/projections';
import Shell from '../../kit/Shell';
import { nflTeamName } from '../../kit/nflTeams';
import PageHead from '../../kit/PageHead';
import Squirt from '../../home/Squirt';
import Widget from '../../home/Widget';
import { ClipRail } from '../../home/Widgets';
import w from '../../home/widgets.module.css';
import { embedClipsForWeek } from '../../lib/embed-clips';
import { BOOK_LOGOS } from '../../kit/bookLogos';
import { bookFrom, bookName, getLine, linesAcrossBooks, moneyText, polymarketFor, readOdds } from '../../lib/odds-books';
import { Drop, nameOf, pts, quarter, WinBar } from '../../scoreboard/parts/shared';
import sb from '../../scoreboard/sb.module.css';
import n from '../nfl.module.css';
import BookTable from './BookTable';

export const metadata: Metadata = { title: { absolute: 'NFL game, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * One NFL game from this league's side, v2's game page in widgets. Nobody
 * opens Jets at Patriots for the football; they open it because three of
 * their starters are in it. So: the board (score, line, win bar, the ground
 * it is played on), the weather before kickoff, both clubs' seasons, the
 * book, then every league player in the game grouped by his manager, and
 * the game's clips.
 */

/** "Sun, Sep 27, 12:00 PM", Central. */
function kickoffLong(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }).format(new Date(iso));
}

/** "Updated 12 minutes ago": how fresh the compared lines are. */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const money = (v: number | null) => (v == null ? null : v > 0 ? `+${v}` : `${v}`);

/**
 * One team on the board, as a scoreboard row: logo, full name, record under
 * it, score on the right (the winner in ink once it is final). The away
 * team is simply the top row.
 */
function TeamRow({ side, game, lost }: { side: NflSide; game: NflGame; lost: boolean }) {
  return (
    <div className={n.teamRow}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={n.logo} src={side.logo} alt="" />
      <span className={n.teamWho}>
        <span className={n.name}>{nflTeamName(side.abbr)}</span>
        {side.record ? <span className={sb.sub}>{side.record}</span> : null}
      </span>
      {game.state !== 'pre' ? <span className={`${n.score} ${lost ? n.scoreLost : ''}`}>{side.score ?? 0}</span> : null}
    </div>
  );
}

export default async function NflGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const [week, games, jar] = await Promise.all([scoredWeek(), getNflGames().catch((): NflGame[] => []), cookies()]);
  const game = games.find((g) => g.id === gameId);

  if (!game) {
    return (
      <Shell active="scoreboard">
        <PageHead title="Game not listed">
          <Link href={`/scoreboard/${week}`} className={sb.back}>
            &lsaquo; Scoreboard
          </Link>
        </PageHead>
        <div className={w.grid}>
          <Widget size="m" icon="tv" title="Nothing here">
            <div className={sb.nudge}>
              <Squirt mood="sleep" size={56} />
              <p className={sb.empty}>Not on ESPN&rsquo;s current slate.</p>
            </div>
          </Widget>
        </div>
      </Shell>
    );
  }

  const [espnLines, weekGames, extras, projections, clips] = await Promise.all([
    getGameLines(game.id, game.state === 'in').catch(() => null),
    getWeekGames(week).catch(() => []),
    getGameExtras(game.id, game.state === 'in').catch(() => ({ venue: null, weather: null, attendance: null, season: [] as SeasonLine[] })),
    getWeekProjections(league.season, week).catch(() => ({}) as Record<string, number>),
    embedClipsForWeek(week).catch(() => []),
  ]);
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  // The line from the book this device picked, DraftKings where it has none,
  // and every listed book's line for shopping before kickoff. Polymarket is
  // read live, for its row in the table and for anyone who picked it.
  const chosen = bookFrom(jar);
  const [odds, poly] = await Promise.all([readOdds(), polymarketFor([game]).catch(() => ({}) as Awaited<ReturnType<typeof polymarketFor>>)]);
  const lines = getLine(game, espnLines, chosen, odds, poly[game.id]);
  const across = game.state === 'pre' ? linesAcrossBooks(game, espnLines, odds, poly[game.id]) : [];
  const pulled = odds?.pulledAt ?? null;

  // Grouped by manager, starters first: who this game matters to.
  const entries = leagueEntriesInGame(weekGames, [game.away.abbr, game.home.abbr]);
  const byManager = new Map<number, typeof entries>();
  for (const e of entries) byManager.set(e.rosterId, [...(byManager.get(e.rosterId) ?? []), e]);
  const managers = [...byManager.entries()].sort(
    (a, b) => Number(b[0] === mine) - Number(a[0] === mine) || b[1].filter((e) => e.slot).length - a[1].filter((e) => e.slot).length || b[1].length - a[1].length,
  );
  const starters = entries.filter((e) => e.slot).length;

  const awayWin = lines?.liveHomeWin != null && game.state === 'in' ? 1 - lines.liveHomeWin : (lines?.away.implied ?? null);
  const a = game.away.score ?? 0;
  const h = game.home.score ?? 0;
  const post = game.state === 'post';

  // The game's clips: any naming either club (the clips write Washington as
  // WAS, as Sleeper does; ESPN's WSH is already mapped by lib/gameday, and
  // mapped again here in case it ever is not), or any league player in it.
  const sleeperAbbr = (x: string) => (x === 'WSH' ? 'WAS' : x);
  const clubs = [sleeperAbbr(game.away.abbr), sleeperAbbr(game.home.abbr)];
  const inGame = new Set(entries.map((e) => e.playerId));
  const gameClips = clips.filter((c) => c.nflTeams.some((t) => clubs.includes(t)) || c.playerIds.some((id) => inGame.has(id))).slice(0, 10);
  const owner = new Map(entries.map((e) => [e.playerId, { name: nameOf(e.rosterId, e.manager), started: e.slot != null }]));

  const when = [game.state === 'pre' ? kickoffLong(game.kickoff) : post ? 'Final' : quarter(game.period, game.clock), game.broadcast].filter(Boolean).join(' | ');
  const season = extras.season.length === 2 ? extras.season : null;
  const ROWS: [string, (t: SeasonLine) => string][] = [
    ['Scored', (t) => (t.played ? (t.pointsFor / t.played).toFixed(1) : '-')],
    ['Allowed', (t) => (t.played ? (t.pointsAgainst / t.played).toFixed(1) : '-')],
    [
      'Margin',
      (t) => {
        if (!t.played) return '-';
        const d = (t.pointsFor - t.pointsAgainst) / t.played;
        return `${d > 0 ? '+' : ''}${d.toFixed(1)}`;
      },
    ],
  ];

  return (
    <Shell active="scoreboard">
      <LiveRefresh live={game.state === 'in'} week={week} />
      <div className={w.grid}>
        <section className={`${w.widget} ${w.l} ${n.board}`}>
          <Link href={`/scoreboard/${week}`} className={`${sb.back} ${n.boardBack}`}>
            &lsaquo; Scoreboard
          </Link>
          {/* The ground it is played on, or the home side's color. Only the
              white pill sits on it, so nothing has to be read off a photo. */}
          <div className={n.art} style={{ '--home': game.home.color ?? '#2d4c9c' } as CSSProperties}>
            {extras.venue?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={extras.venue.image} alt="" />
            ) : null}
            <span className={n.artShade} aria-hidden />
            <span className={`${n.pill} ${game.state === 'in' ? n.pillLive : ''}`}>
              {game.state === 'in' ? <Drop /> : null}
              {when}
            </span>
          </div>
          <div className={n.body}>
            {/* The board is the page; its h1 is for readers that need it,
                since the two sides already say it on screen. */}
            <h1 className={sb.srOnly}>
              {nflTeamName(game.away.abbr)} at {nflTeamName(game.home.abbr)}
            </h1>
            <div className={n.rows}>
              <TeamRow side={game.away} game={game} lost={post && a < h} />
              <TeamRow side={game.home} game={game} lost={post && h < a} />
            </div>
            {game.state === 'in' && (game.situation || game.possession) ? (
              <div className={n.facts1}>
                {game.possession ? (
                  <span className={n.pair}>
                    <span className={sb.label}>Ball</span>
                    {nflTeamName(game.possession)}
                  </span>
                ) : null}
                {game.situation ? (
                  <span className={n.pair}>
                    <span className={sb.label}>Down</span>
                    {game.situation}
                  </span>
                ) : null}
              </div>
            ) : null}
            {extras.venue || extras.attendance ? (
              <div className={n.facts1}>
                {extras.venue ? (
                  <span className={n.pair}>
                    <span className={sb.label}>Venue</span>
                    {[extras.venue.name, extras.venue.city, extras.venue.state].filter(Boolean).join(', ')}
                    {extras.venue.indoor ? ', indoors' : ''}
                  </span>
                ) : null}
                {extras.attendance ? (
                  <span className={n.pair}>
                    <span className={sb.label}>Attendance</span>
                    {extras.attendance.toLocaleString()}
                  </span>
                ) : null}
              </div>
            ) : null}
            {awayWin != null && !post ? (
              <WinBar away={awayWin} caption={game.state === 'in' ? 'Live win chance' : 'Moneyline, no vig'} />
            ) : null}
          </div>
        </section>

        {game.state === 'pre' && extras.weather ? (
          <Widget size="m" icon="flag" title="At kickoff">
            <div className={n.facts}>
              {extras.weather.temperature != null ? (
                <span className={n.fact}>
                  <span className={sb.label}>Temp</span>
                  <span className={n.factNum}>{extras.weather.temperature}&deg;</span>
                </span>
              ) : null}
              {extras.weather.windSpeed != null ? (
                <span className={n.fact}>
                  <span className={sb.label}>Wind {extras.weather.windDirection ?? ''}</span>
                  <span className={n.factNum}>
                    {extras.weather.windSpeed}
                    <small> mph</small>
                  </span>
                </span>
              ) : null}
              {extras.weather.precipitation != null ? (
                <span className={n.fact}>
                  <span className={sb.label}>Precip</span>
                  <span className={n.factNum}>{extras.weather.precipitation}%</span>
                </span>
              ) : null}
            </div>
            {extras.weather.summary ? <p className={n.note}>{extras.weather.summary}</p> : null}
          </Widget>
        ) : null}

        {season ? (
          <Widget size="m" icon="calendar" title="Season so far">
            <div className={n.season}>
              <div className={`${n.sRow} ${n.sHead}`}>
                <span className={n.sTeam}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={game.away.logo} alt={nflTeamName(game.away.abbr)} />
                </span>
                <span className={sb.label}>Per game</span>
                <span className={n.sTeam}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={game.home.logo} alt={nflTeamName(game.home.abbr)} />
                </span>
              </div>
              {ROWS.map(([label, read]) => (
                <div key={label} className={n.sRow}>
                  <span>{read(season[0])}</span>
                  <span className={sb.label}>{label}</span>
                  <span>{read(season[1])}</span>
                </div>
              ))}
            </div>
          </Widget>
        ) : null}

        <Widget size="m" icon="coins" title="The line">
          {lines ? (
            <>
              <div className={`${n.facts} ${n.facts2}`}>
                <span className={n.fact}>
                  <span className={sb.label}>Spread</span>
                  <span className={n.factText}>{lines.details ?? '-'}</span>
                </span>
                <span className={n.fact}>
                  <span className={sb.label}>Total</span>
                  <span className={n.factNum}>{lines.overUnder ?? '-'}</span>
                </span>
              </div>
              {/* Each team's moneyline and the total the spread and the
                  over under imply for it, one team a row. */}
              <div className={n.lineTeams}>
                {[game.away, game.home].map((side, i) => {
                  const book = i === 0 ? lines.away : lines.home;
                  const implied = impliedTeamTotal(lines, i === 1);
                  // Polymarket's moneyline is its win price; the American
                  // number beside it is what buying that side costs.
                  const win = lines.win ? moneyText(lines, i === 1) : null;
                  return (
                    <div key={side.abbr} className={n.lineTeam}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={side.logo} alt="" />
                      <span className={n.lineName}>{nflTeamName(side.abbr)}</span>
                      <span className={n.linePairs}>
                        <span className={n.pair}>
                          <span className={sb.label}>Moneyline</span>
                          {win ?? money(book.moneyline) ?? '-'}
                          {win && book.moneyline != null ? <small className={n.pairSub}>{money(book.moneyline)}</small> : null}
                        </span>
                        <span className={n.pair}>
                          <span className={sb.label}>Implied total</span>
                          {implied != null ? Number(implied).toFixed(1) : 'None'}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className={sb.empty}>No line posted yet.</p>
          )}
          {lines?.provider ? (
            <span className={`${sb.via} ${n.viaBook}`}>
              Book |
              {BOOK_LOGOS[lines.bookKey] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={n.bookLogo} src={BOOK_LOGOS[lines.bookKey]} alt="" />
              ) : null}
              {lines.provider}
            </span>
          ) : null}
          {lines?.fallback && (lines.details || lines.overUnder != null) ? <span className={sb.via}>{bookName(chosen)} has no line on this game.</span> : null}
        </Widget>

        {across.length >= 2 ? (
          <Widget size="m" icon="coins" title="Lines across books">
            <BookTable game={game} rows={across} chosen={chosen} updated={pulled ? ago(pulled) : null} />
          </Widget>
        ) : null}

        <Widget size="l" icon="foamFinger" title="Who has skin in this">
          {entries.length ? (
            <span className={sb.edgesRow}>
              <span className={sb.chip}>{starters} starting</span>
              <span className={`${sb.chip} ${sb.chipPlain}`}>{entries.length - starters} benched</span>
            </span>
          ) : null}
          {managers.length ? (
            <div className={n.groups}>
              {managers.map(([rosterId, list]) => {
                const team = teamByRoster(rosterId);
                const started = list.filter((e) => e.slot).length;
                return (
                  <div key={rosterId} className={`${n.group} ${rosterId === mine ? n.groupMine : ''}`}>
                    <Link href={`/managers/${rosterId}`} className={n.gHead}>
                      <span className={n.gAvatar}>
                        {team?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={team.avatarUrl} alt="" loading="lazy" />
                        ) : null}
                      </span>
                      <span className={n.gWho}>
                        <span className={n.gTeam}>{team?.teamName ?? list[0].teamName}</span>
                        <span className={sb.sub}>{rosterId === mine ? `${nameOf(rosterId, list[0].manager)} | You` : nameOf(rosterId, list[0].manager)}</span>
                      </span>
                      <span className={sb.chip}>{started ? `${started} starting` : 'Bench only'}</span>
                    </Link>
                    <ul className={n.players}>
                      {list.map((e) => {
                        const proj = projections[e.playerId];
                        const beat = game.state !== 'pre' && proj != null && e.points >= proj;
                        return (
                          <li key={e.playerId}>
                            <Link href={`/players/${e.playerId}`} className={n.player}>
                              <span className={n.pFace}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={e.headshot} alt="" loading="lazy" />
                              </span>
                              <span className={n.pWho}>
                                <span className={n.pName}>{e.name}</span>
                                <span className={n.pMeta}>
                                  {e.slot !== e.position ? <span className={`${sb.chip} ${e.slot ? '' : sb.chipPlain}`}>{e.slot ?? 'Bench'}</span> : null}
                                  {e.position === 'DEF' ? 'Defense' : `${e.position}, ${nflTeamName(e.nflTeam)}`}
                                </span>
                              </span>
                              {game.state === 'pre' ? (
                                <span className={n.pNum}>
                                  {proj != null ? proj.toFixed(1) : '-'}
                                  <span>Projected</span>
                                </span>
                              ) : (
                                <span className={n.pNum}>
                                  <b className={beat ? n.beat : undefined}>{pts(e.points)}</b>
                                  {proj != null ? <span>{`Projected ${proj.toFixed(1)}`}</span> : null}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={sb.nudge}>
              <Squirt mood="sleep" size={56} />
              <p className={sb.empty}>No rostered players in this game.</p>
            </div>
          )}
        </Widget>

        <ClipRail title="This game, on tape" icon="play" clips={gameClips} ownerOf={(id) => owner.get(id) ?? null} size="m" />
      </div>
    </Shell>
  );
}
