import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { weekProjections } from '../../cached';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { LiveStart } from '../../live/Live';
import { getGameExtras, getGameLines, getNflGames, impliedTeamTotal, leagueEntriesInGame, type NflGame, type NflSide, type SeasonLine } from '@/lib/gameday';
import { league, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { embedClipsForWeek } from '../../../../lib/embed-clips';
import { bookFrom, bookName, getLine, linesAcrossBooks, moneyText, polymarketFor, readOdds } from '../../../../lib/odds-books';
import { getV4Data } from '../../data';
import Shell, { SectionHead } from '../../Shell';
import Clips from '../../scores/Clips';
import { railOf } from '../../scores/clipData';
import { kickoffText, LiveChip, managerOf, quarter, WinBar } from '../../scores/parts';
import { shortName, weekView } from '../../scores/weekData';
import BookTable from '../BookTable';
import s from '../../v4.module.css';
import x from '../../scores/scores.module.css';

export const metadata: Metadata = { title: { absolute: 'NFL game, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const money = (v: number | null) => (v == null ? null : v > 0 ? `+${v}` : `${v}`);

function BoardRow({ side, game, lost }: { side: NflSide; game: NflGame; lost: boolean }) {
  return (
    <div className={`${x.bRow} ${lost ? x.bLost : ''}`}>
      <span className={`${s.tile} ${x.crest}`} style={{ ['--tc' as string]: side.color ?? '#5a616d' }}>
        <img src={side.logo} alt="" />
      </span>
      <span className={x.bWho}>
        <b>{side.name}</b>
        <small>
          {side.record ?? ''}
          {game.state === 'in' && game.possession === side.abbr ? ' · Ball' : ''}
        </small>
      </span>
      {game.state !== 'pre' ? <span className={x.bScore}>{side.score ?? 0}</span> : null}
    </div>
  );
}

/**
 * One NFL game from this league's side. Nobody opens Jets at Patriots for
 * the football; they open it because three of their starters are in it. So:
 * the board, the weather at kickoff, both clubs' seasons, the line and every
 * book's, then every league player in the game by team, and the tape.
 */
export default async function V4NflGame({ params, searchParams }: { params: Promise<{ gameId: string }>; searchParams: Promise<{ week?: string }> }) {
  const [{ gameId }, q] = await Promise.all([params, searchParams]);
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);
  const asked = Number(q.week);
  const askedWeek = Number.isInteger(asked) && asked >= 1 && asked <= 18 ? asked : null;
  // ESPN's current slate first, then the week the link came from.
  let week = askedWeek ?? data.week;
  let game = (await getNflGames().catch((): NflGame[] => [])).find((g) => g.id === gameId);
  if (!game) {
    const slate = await getNflGames(week, league.season).catch((): NflGame[] => []);
    game = slate.find((g) => g.id === gameId);
  } else if (!askedWeek) week = data.week;

  if (!game) {
    return (
      <Shell data={data} active="scores">
        <SectionHead icon="football" word="nfl" week={data.week} mine={data.myRoster} />
        <p className={s.empty}>
          That game is not on ESPN&rsquo;s slate for week {week}. <Link href={`/lab/app/nfl?week=${week}`}>NFL Week {week}</Link>
        </p>
      </Shell>
    );
  }

  const [espnLines, wv, extras, projections, clips, odds, poly] = await Promise.all([
    getGameLines(game.id, game.state === 'in').catch(() => null),
    weekView(week, mine, data),
    getGameExtras(game.id, game.state === 'in').catch(() => ({ venue: null, weather: null, attendance: null, season: [] as SeasonLine[] })),
    weekProjections(league.season, week).catch(() => ({}) as Record<string, number>),
    embedClipsForWeek(week).catch(() => []),
    readOdds(),
    polymarketFor([game]).catch(() => ({}) as Awaited<ReturnType<typeof polymarketFor>>),
  ]);
  const chosen = bookFrom(jar);
  const lines = getLine(game, espnLines, chosen, odds, poly[game.id]);
  const across = game.state === 'pre' ? linesAcrossBooks(game, espnLines, odds, poly[game.id]) : [];

  // Grouped by team, yours first, then by how many each is starting.
  const entries = leagueEntriesInGame(wv.games, [game.away.abbr, game.home.abbr]);
  const byTeam = new Map<number, typeof entries>();
  for (const e of entries) byTeam.set(e.rosterId, [...(byTeam.get(e.rosterId) ?? []), e]);
  const groups = [...byTeam.entries()].sort(
    (a, b) => Number(b[0] === mine) - Number(a[0] === mine) || b[1].filter((e) => e.slot).length - a[1].filter((e) => e.slot).length || b[1].length - a[1].length,
  );
  const starting = entries.filter((e) => e.slot).length;

  const awayWin = lines?.liveHomeWin != null && game.state === 'in' ? 1 - lines.liveHomeWin : (lines?.away.implied ?? null);
  const a = game.away.score ?? 0;
  const h = game.home.score ?? 0;
  const post = game.state === 'post';
  const when = game.state === 'pre' ? kickoffText(game.kickoff) : post ? 'Final' : quarter(game.period, game.clock);

  const clubs = [game.away.abbr, game.home.abbr].map((c) => (c === 'WSH' ? 'WAS' : c));
  const inGame = new Set(entries.map((e) => e.playerId));
  const owner = new Map(entries.map((e) => [e.playerId, teamByRoster(e.rosterId)?.teamName ?? e.teamName]));
  const rail = railOf(
    clips.filter((c) => c.nflTeams.some((t) => clubs.includes(t)) || c.playerIds.some((id) => inGame.has(id))),
    (id) => owner.get(id) ?? null,
  );

  const season = extras.season.length === 2 ? extras.season : null;
  const SEASON: [string, (t: SeasonLine) => string][] = [
    ['Scored', (t) => (t.played ? (t.pointsFor / t.played).toFixed(1) : '')],
    ['Allowed', (t) => (t.played ? (t.pointsAgainst / t.played).toFixed(1) : '')],
    [
      'Margin',
      (t) => {
        if (!t.played) return '';
        const d = (t.pointsFor - t.pointsAgainst) / t.played;
        return `${d > 0 ? '+' : ''}${d.toFixed(1)}`;
      },
    ],
  ];
  const venueChips = [
    extras.venue ? [extras.venue.name, extras.venue.city].filter(Boolean).join(', ') : game.venue,
    extras.venue?.indoor ? 'Indoors' : extras.venue ? 'Outdoors' : null,
    extras.venue?.grass === true ? 'Grass' : extras.venue?.grass === false ? 'Turf' : null,
    extras.attendance ? `${extras.attendance.toLocaleString()} attendance` : null,
    game.broadcast,
  ].filter(Boolean) as string[];

  return (
    <Shell data={data} active="scores">
      <LiveStart live={game.state === 'in'} week={week} />
      <SectionHead icon="football" word="nfl" week={data.week} mine={data.myRoster} back={{ href: `/lab/app/nfl?week=${week}`, label: `NFL Week ${week}` }} />
      <section className={x.board}>
        <div className={x.art} style={{ '--home': game.home.color ?? '#2d4c9c' } as CSSProperties}>
          {extras.venue?.image ? <img src={extras.venue.image} alt="" /> : null}
          <span className={x.artShade} aria-hidden />
          {game.state === 'in' ? (
            <span className={x.artPill} style={{ background: 'none', padding: 0 }}>
              <LiveChip text={when} />
            </span>
          ) : (
            <span className={x.artPill}>{when}</span>
          )}
        </div>
        <div className={x.boardBody}>
          <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            {game.away.name} at {game.home.name}
          </h1>
          <BoardRow side={game.away} game={game} lost={post && a < h} />
          <BoardRow side={game.home} game={game} lost={post && h < a} />
          {game.state === 'in' && game.situation ? <span className={s.note}>{game.situation}</span> : null}
          {awayWin != null && !post ? <WinBar first={awayWin} caption={game.state === 'in' ? 'Live win chance' : 'Moneyline, no vig'} /> : null}
          {venueChips.length ? (
            <div className={s.venue}>
              {venueChips.map((c) => (
                <i key={c}>{c}</i>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {game.state === 'pre' && extras.weather ? (
        <>
          <div className={s.title}>
            <h2>At Kickoff</h2>
          </div>
          <section className={s.card}>
            <div className={x.facts}>
              {extras.weather.temperature != null ? (
                <span className={x.fact}>
                  <small>Temp</small>
                  <b>{extras.weather.temperature}&deg;</b>
                </span>
              ) : null}
              {extras.weather.windSpeed != null ? (
                <span className={x.fact}>
                  <small>Wind {extras.weather.windDirection ?? ''}</small>
                  <b>
                    {extras.weather.windSpeed}
                    <small> mph</small>
                  </b>
                </span>
              ) : null}
              {extras.weather.precipitation != null ? (
                <span className={x.fact}>
                  <small>Precip</small>
                  <b>{extras.weather.precipitation}%</b>
                </span>
              ) : null}
            </div>
            {extras.weather.summary ? <p className={s.note}>{extras.weather.summary}</p> : null}
          </section>
        </>
      ) : null}

      {season ? (
        <>
          <div className={s.title}>
            <h2>Season So Far</h2>
          </div>
          <section className={s.card}>
            <div className={x.sea}>
              <div className={x.seaRow}>
                <img className={x.seaLogo} src={game.away.logo} alt={game.away.name} />
                <small>Per game</small>
                <img className={x.seaLogo} src={game.home.logo} alt={game.home.name} style={{ justifySelf: 'end' }} />
              </div>
              {SEASON.map(([label, read]) => (
                <div key={label} className={x.seaRow}>
                  <span>{read(season[0])}</span>
                  <small>{label}</small>
                  <span>{read(season[1])}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <div className={s.title}>
        <h2>The Line</h2>
      </div>
      <section className={s.card}>
        {lines && (lines.details || lines.overUnder != null) ? (
          <>
            <div className={`${x.facts} ${x.facts2}`}>
              {lines.details ? (
                <span className={x.fact}>
                  <small>Spread</small>
                  <span>{lines.details}</span>
                </span>
              ) : null}
              {lines.overUnder != null ? (
                <span className={x.fact}>
                  <small>Total</small>
                  <b>{lines.overUnder}</b>
                </span>
              ) : null}
            </div>
            <div>
              {[game.away, game.home].map((side, i) => {
                const book = i === 0 ? lines.away : lines.home;
                const implied = impliedTeamTotal(lines, i === 1);
                const win = lines.win ? moneyText(lines, i === 1) : null;
                return (
                  <div key={side.abbr} className={x.ln}>
                    <span className={s.tile} style={{ ['--tc' as string]: side.color ?? '#5a616d' }}>
                      <img src={side.logo} alt="" />
                    </span>
                    <b>{side.name}</b>
                    <span className={x.lnPair}>
                      {win ?? money(book.moneyline) ?? '–'}
                      <small>Moneyline</small>
                    </span>
                    <span className={x.lnPair}>
                      {implied != null ? implied.toFixed(1) : '–'}
                      <small>Implied</small>
                    </span>
                  </div>
                );
              })}
            </div>
            <span className={x.via}>
              Book: {lines.provider}
              {lines.fallback ? `, ${bookName(chosen)} has no line on this game` : ''}
            </span>
          </>
        ) : (
          <p className={s.note}>No line posted yet.</p>
        )}
      </section>

      {across.length >= 2 ? (
        <>
          <div className={s.title}>
            <h2>Lines Across Books</h2>
          </div>
          <section className={s.card}>
            <BookTable game={game} rows={across} chosen={chosen} />
            {odds?.pulledAt ? <span className={x.via}>Updated {new Date(odds.pulledAt).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' })} CT</span> : null}
          </section>
        </>
      ) : null}

      <div className={s.title}>
        <h2>Who Has Skin in This</h2>
        {entries.length ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>
            {starting} starting &middot; {entries.length - starting} benched
          </span>
        ) : null}
      </div>
      {groups.length ? (
        <div className={x.skin}>
          {groups.map(([rosterId, list]) => {
            const t = teamByRoster(rosterId);
            const started = list.filter((e) => e.slot).length;
            return (
              <section key={rosterId} className={`${x.grp} ${rosterId === mine ? x.grpMine : ''}`}>
                <div className={x.grpHead}>
                  <span className={s.av} style={{ width: 28, height: 28, ['--mgr' as string]: t?.colors?.primary ?? 'var(--powder)' }}>
                    {t?.avatarUrl ? <img src={t.avatarUrl} alt="" loading="lazy" /> : null}
                  </span>
                  <span className={s.who}>
                    <b>{t?.teamName ?? list[0].teamName}</b>
                    <small>{rosterId === mine ? `${managerOf(rosterId, list[0].manager)} · You` : managerOf(rosterId, list[0].manager)}</small>
                  </span>
                  <span className={x.chip}>{started ? `${started} starting` : 'Bench only'}</span>
                </div>
                {list.map((e) => {
                  const proj = projections[e.playerId];
                  const beat = game.state !== 'pre' && proj != null && proj > 0 && e.points >= proj;
                  return (
                    <button key={e.playerId} type="button" data-player={e.playerId} className={s.prow} aria-label={`${e.name}, open player`}>
                      {e.position === 'DEF' ? <img className={x.logo32} src={e.headshot} alt="" loading="lazy" /> : <img className={x.face32} src={e.headshot} alt="" loading="lazy" />}
                      <span className={s.prowName}>
                        <b>{shortName(e.name, e.position, e.nflTeam)}</b>
                        <small>
                          <i className={`${s.pos} ${s[`p${e.position}`] ?? ''}`}>{e.position}</i>
                          {e.slot ? (e.slot !== e.position ? e.slot.replace('SUPER_FLEX', 'SF') : 'Starting') : 'Bench'}
                        </small>
                      </span>
                      <span className={s.prowPts}>
                        <b className={beat ? s.win : undefined}>{game.state === 'pre' ? '–' : e.points.toFixed(2)}</b>
                        <small>{proj != null && proj > 0 ? `Proj ${proj.toFixed(2)}` : ''}</small>
                      </span>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>
      ) : (
        <p className={s.empty}>No rostered players in this game.</p>
      )}

      {rail.length ? (
        <>
          <div className={s.title}>
            <h2>This Game, On Tape</h2>
          </div>
          <Clips clips={rail} />
        </>
      ) : null}
      <span className={x.via}>Sources: ESPN, Sleeper{lines?.provider ? `, ${lines.provider}` : ''}, YouTube</span>
    </Shell>
  );
}
