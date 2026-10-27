import type { Metadata } from 'next';
import { weekProjections } from '../../cached';
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
import { kickoffText, managerOf, quarter } from '../../scores/format';
import { shortName, weekView } from '../../scores/weekData';
import { Avatar, Card, Chips, Crest, Empty, Face, List, LiveTag, Meter, Pair, Row, Section, Stats, Tag, Versus, ui } from '../../ui';

export const metadata: Metadata = { title: { absolute: 'NFL game, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const money = (v: number | null) => (v == null ? null : v > 0 ? `+${v}` : `${v}`);

/**
 * One NFL game from this league's side: the game itself, the weather before
 * kickoff, both clubs' season, the odds, every league player in it by team,
 * and the highlights. Built from the kit; nothing here styles itself.
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
        <SectionHead icon="football" word="nfl" week={data.week} mine={data.myRoster} back={{ href: `/lab/app/nfl?week=${week}`, label: 'NFL Scores' }} />
        <Empty action={{ href: `/lab/app/nfl?week=${week}`, label: 'NFL Scores' }}>That game is not on ESPN&rsquo;s week {week} schedule.</Empty>
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

  const awayName = game.away.name;
  const homeName = game.home.name;
  const favorite = awayWin != null ? (awayWin >= 0.5 ? { name: awayName, pct: awayWin } : { name: homeName, pct: 1 - awayWin }) : null;
  const status =
    game.state === 'in' ? (
      <>
        <LiveTag text={when} />
        <span>{game.broadcast ?? ''}</span>
      </>
    ) : (
      <>
        <span>{when}</span>
        <span>{game.broadcast ?? ''}</span>
      </>
    );

  return (
    <Shell data={data} active="scores">
      <LiveStart live={game.state === 'in'} week={week} />
      <SectionHead icon="football" word="nfl" week={data.week} mine={data.myRoster} back={{ href: `/lab/app/nfl?week=${week}`, label: 'NFL Scores' }} />
      <h1 className={ui.sr}>
        {awayName} at {homeName}
      </h1>
      <Card>
        <Pair
          big
          status={status}
          sides={[
            { lead: <Crest src={game.away.logo} size={40} />, title: awayName, sub: game.away.record ?? undefined, value: game.state === 'pre' ? undefined : a, lost: post && a < h },
            { lead: <Crest src={game.home.logo} size={40} />, title: homeName, sub: game.home.record ?? undefined, value: game.state === 'pre' ? undefined : h, lost: post && h < a },
          ]}
        />
        {game.state === 'in' && game.situation ? <span className={ui.sub}>{game.situation}</span> : null}
        {favorite && !post ? (
          <>
            <Meter pct={(awayWin ?? 0) * 100} label={`${favorite.name} ${Math.round(favorite.pct * 100)}% to win`} />
            <span className={ui.sub}>
              {favorite.name} {Math.round(favorite.pct * 100)}% to win &middot; {game.state === 'in' ? 'live' : 'from the moneyline'}
            </span>
          </>
        ) : null}
        {venueChips.length ? (
          <Chips label="Venue">
            {venueChips.filter((c) => c !== game.broadcast && !/attendance/.test(c)).map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </Chips>
        ) : null}
      </Card>

      {game.state === 'pre' && extras.weather ? (
        <Section title="Weather">
          <Card>
            <Stats
              items={[
                ...(extras.weather.temperature != null ? [{ value: `${extras.weather.temperature}°`, label: 'Temp' }] : []),
                ...(extras.weather.windSpeed != null ? [{ value: `${extras.weather.windSpeed} mph`, label: `Wind ${extras.weather.windDirection ?? ''}`.trim() }] : []),
                ...(extras.weather.precipitation != null ? [{ value: `${extras.weather.precipitation}%`, label: 'Precip' }] : []),
              ]}
            />
            {extras.weather.summary ? <span className={ui.sub}>{extras.weather.summary}</span> : null}
          </Card>
        </Section>
      ) : null}

      {season ? (
        <Section title="Season Stats">
          <Card>
            <Versus
              left={<Crest src={game.away.logo} size={28} />}
              right={<Crest src={game.home.logo} size={28} />}
              rows={SEASON.map(([label, read]) => ({ label: `${label} per game`, a: read(season[0]), b: read(season[1]) }))}
            />
          </Card>
        </Section>
      ) : null}

      <Section title="Odds">
        {lines && (lines.details || lines.overUnder != null) ? (
          <List>
            {[game.away, game.home].map((side, i) => {
              const book = i === 0 ? lines.away : lines.home;
              const implied = impliedTeamTotal(lines, i === 1);
              const win = lines.win ? moneyText(lines, i === 1) : null;
              return (
                <Row
                  key={side.abbr}
                  lead={<Crest src={side.logo} size={28} />}
                  title={side.name}
                  sub={`Moneyline ${win ?? money(book.moneyline) ?? 'none'}`}
                  value={implied != null ? implied.toFixed(1) : undefined}
                  valueSub={implied != null ? 'Implied' : undefined}
                />
              );
            })}
            <Row title="Spread and total" sub={`${lines.provider}${lines.fallback ? `, ${bookName(chosen)} has no line` : ''}`} value={lines.details ?? undefined} valueSub={lines.overUnder != null ? `O/U ${lines.overUnder}` : undefined} />
            {across.length >= 2
              ? across.map((b) => (
                  <Row key={b.bookKey} title={b.provider} sub={b.details ?? undefined} value={b.overUnder != null ? `O/U ${b.overUnder}` : undefined} valueSub={b.home.moneyline != null ? `${game.home.abbr} ${money(b.home.moneyline)}` : undefined} />
                ))
              : null}
          </List>
        ) : (
          <Empty>No odds posted yet.</Empty>
        )}
      </Section>

      <Section title="League Players">
        {groups.length ? (
          groups.map(([rosterId, list]) => {
            const t = teamByRoster(rosterId);
            const started = list.filter((e) => e.slot).length;
            return (
              <List key={rosterId} tap>
                <Row
                  href={`/lab/app/managers/${rosterId}`}
                  lead={<Avatar src={t?.avatarUrl} color={t?.colors?.primary} size={28} />}
                  title={t?.teamName ?? list[0].teamName}
                  strong
                  sub={rosterId === mine ? `${managerOf(rosterId, list[0].manager)} · You` : managerOf(rosterId, list[0].manager)}
                  valueSub={started ? `${started} starting` : 'Bench only'}
                />
                {list.map((e) => {
                  const proj = projections[e.playerId];
                  return (
                    <Row
                      key={e.playerId}
                      data={{ player: e.playerId }}
                      lead={<Face id={e.playerId} team={e.nflTeam} size={32} defense={e.position === 'DEF'} />}
                      label={`${e.position} · ${e.slot ? (e.slot !== e.position ? e.slot.replace('SUPER_FLEX', 'SF') : 'Starting') : 'Bench'}`}
                      title={shortName(e.name, e.position, e.nflTeam)}
                      value={game.state === 'pre' ? undefined : e.points.toFixed(2)}
                      valueSub={proj != null && proj > 0 ? `Proj ${proj.toFixed(2)}` : undefined}
                    />
                  );
                })}
              </List>
            );
          })
        ) : (
          <Empty>No league players in this game.</Empty>
        )}
      </Section>

      {rail.length ? (
        <Section title="Highlights">
          <Clips clips={rail} />
        </Section>
      ) : null}
      <p className={ui.spec}>Sources: ESPN, Sleeper{lines?.provider ? `, ${lines.provider}` : ''}, YouTube</p>
    </Shell>
  );
}
