import type { Metadata } from 'next';
import { statWords } from '../../kit/statWords';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { SleeperPill } from '../../scoreboard/parts/shared';
import { nflTeamName } from '../../kit/nflTeams';
import { firstNameOf } from '@/config/managers';
import { dsRos, dsWeekly } from '@/lib/draftsharks';
import { ESPN_CUTOUT } from '@/lib/espn';
import { formatMoneyline, gamesByTeam, getGameLines, getNflGames, impliedTeamTotal } from '@/lib/gameday';
import { league, scoredWeek, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { filed, newsFor } from '@/lib/news';
import { outlookFor, roleOf } from '@/lib/outlook';
import { readOf } from '@/lib/player-read';
import { getPlayerSeason } from '@/lib/players';
import { scoreStats } from '@/lib/scoring';
import { formatStatLine, getWeekProjectionLines, getWeekStatLines } from '@/lib/sleeper-live';
import { statBlocksFor, statsFor } from '@/lib/stats';
import Shell from '../../kit/Shell';
import Widget, { WidgetHead } from '../../home/Widget';
import { embedClipsForPlayers, type EmbedClip } from '../../lib/embed-clips';
import { ClipRail } from '../../home/Widgets';
import { bookFrom, lineFor, moneyText } from '../../lib/odds-books';
import { sleeperPropsFor, type SleeperProp } from '../../lib/sleeper-props';
import { SLEEPER_MARK } from '../../kit/sleeperMark';
import PointsChart from '../../managers/PointsChart';
import StatRow from '../../managers/StatRow';
import Usage from './Usage';
import w from '../../home/widgets.module.css';
import p from '../players.module.css';
import pp from './player.module.css';
import { POSITION } from '../../kit/positions';
import { gameStatus } from '../../kit/gameStatus';

export const metadata: Metadata = { title: { absolute: 'Player, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const ordinal = (n: number) => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};
/** His team's score first: "won 32-29" once final, "17-10" while live. */
const result = (us: number | null, them: number | null, final: boolean) => {
  const a = us ?? 0;
  const b = them ?? 0;
  return `${final ? (a > b ? 'won ' : a < b ? 'lost ' : 'tied ') : ''}${a}-${b}`;
};
const PLURAL: Record<string, string> = { QB: 'quarterbacks', RB: 'running backs', WR: 'wide receivers', TE: 'tight ends', K: 'kickers', DEF: 'defenses' };
const kickoff = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(iso));


/**
 * A player's page: who he is, his season in four numbers and in full, what
 * to expect this week and why, what is being reported, his NFL game, the
 * rest of his season as DraftSharks sees it, his plays on YouTube, who has
 * him, and every week he has scored. The same sources v2's page reads, in
 * widgets, with his NFL game a tap away and the hero kept in Pool rather
 * than flooded in team colors.
 */
export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  // state.week is the week actually in progress. display_week lags it, and
  // projecting off the lagging value would show last week as next week.
  const upcoming = league.state.week;
  const week = await scoredWeek();
  const [season, projections, statLines, nflWeek, clipsNow, clipsBefore, jar, props] = await Promise.all([
    getPlayerSeason(playerId),
    getWeekProjectionLines(league.season, upcoming).catch(() => ({}) as Awaited<ReturnType<typeof getWeekProjectionLines>>),
    getWeekStatLines(league.season, upcoming).catch(() => ({}) as Awaited<ReturnType<typeof getWeekStatLines>>),
    getNflGames(upcoming, league.season),
    embedClipsForPlayers(week, [playerId]).catch(() => [] as EmbedClip[]),
    week > 1 ? embedClipsForPlayers(week - 1, [playerId]).catch(() => [] as EmbedClip[]) : Promise.resolve([] as EmbedClip[]),
    cookies(),
    sleeperPropsFor(playerId).catch(() => [] as SleeperProp[]),
  ]);
  const { player } = season;
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);

  // Scored on this league's rules, not Sleeper's defaults.
  const projection = projections[playerId];
  const projected = projection?.stats ? scoreStats(projection.stats, league.scoring as Record<string, number>) : null;
  const matchup = player.team ? gamesByTeam(nflWeek).get(player.team) : undefined;
  // His game's line from the book this device picked, DraftKings where it has none.
  const espnLines = matchup ? await getGameLines(matchup.game.id, matchup.game.state === 'in') : null;
  const lines = matchup ? await lineFor(matchup.game, espnLines, bookFrom(jar)) : null;
  const teamTotal = matchup ? impliedTeamTotal(lines ?? undefined, matchup.home) : null;
  const book = matchup && lines ? (matchup.home ? lines.home : lines.away) : null;
  const weekly = dsWeekly(playerId);
  const ros = dsRos(playerId);
  const actualLine = statWords(formatStatLine(player.position, statLines[playerId]?.stats));
  const projectedLine = statWords(formatStatLine(player.position, projection?.stats, true));
  const injury = projection?.injury ?? player.injuryStatus ?? null;
  const outlook = outlookFor(playerId, player.position, player.team, projected ?? 0, upcoming);
  const role = roleOf(playerId, player.position);
  const read = readOf(outlook, playerId);
  const notes = newsFor(player.espnId);
  const blocks = statBlocksFor(player.position, statsFor(playerId));
  const owner = season.ownerRosterId ? teamByRoster(season.ownerRosterId) : null;
  const ownerName = owner ? (firstNameOf(owner.rosterId) ?? owner.manager) : null;
  const unit = player.position === 'DEF';
  const clips = [...clipsNow, ...clipsBefore.filter((c) => !clipsNow.some((x) => x.videoId === c.videoId))].slice(0, 8);

  // ESPN cutout when the nflverse map has an id, the Sleeper headshot otherwise.
  const portrait = player.espnId ? ESPN_CUTOUT(player.espnId) : player.headshot;
  const best = season.weeks.length ? season.weeks.reduce((a, b) => (b.points > a.points ? b : a)) : null;

  const { matchup: mu, usage, trend, boomBust } = outlook;
  const moved = outlook.source === 'deterministic' && Math.abs(outlook.adjusted - outlook.base) >= 0.05;
  const shareLabel = player.position === 'RB' ? 'Carry' : 'Target';
  const shareValue = player.position === 'RB' ? usage?.carryShare : usage?.targetShare;

  // The week card's numbers, each its own labelled cell. His spread is his
  // team's side of the line, so a favorite reads negative.
  const spread = lines?.spread != null && matchup ? (matchup.home ? lines.spread : -lines.spread) : null;
  const showLine = lines && matchup && matchup.game.state !== 'post';
  const weekCells: { label: string; value: string }[] = [
    { label: 'Sleeper projection', value: projected != null ? projected.toFixed(2) : 'None' },
    {
      label: 'DraftSharks range',
      value: weekly?.floor != null && weekly?.ceiling != null ? `${weekly.floor.toFixed(1)} to ${weekly.ceiling.toFixed(1)}` : 'None',
    },
    { label: 'DraftSharks rank', value: weekly ? `${weekly.position}${weekly.posRank}` : 'Unranked' },
    { label: 'Implied total', value: teamTotal != null ? String(teamTotal) : 'None' },
    ...(showLine
      ? [
          ...(spread != null ? [{ label: 'Spread', value: spread > 0 ? `+${spread}` : spread === 0 ? 'Even' : String(spread) }] : []),
          ...(lines!.overUnder != null ? [{ label: 'Total', value: String(lines!.overUnder) }] : []),
          // Polymarket's moneyline is its win price, so it stands in for the win chance.
          ...(lines!.win
            ? [{ label: 'Moneyline', value: moneyText(lines!, !!matchup?.home) ?? 'None' }]
            : [
                ...(book?.moneyline != null ? [{ label: 'Moneyline', value: formatMoneyline(book.moneyline) }] : []),
                ...(book?.implied != null ? [{ label: 'Win chance', value: `${Math.round(book.implied * 100)}%` }] : []),
              ]),
          ...(spread != null || lines!.overUnder != null || book?.moneyline != null ? [{ label: 'Book', value: lines!.provider }] : []),
        ]
      : []),
    ...(matchup?.game.broadcast ? [{ label: 'TV', value: matchup.game.broadcast }] : []),
  ];
  const rosCells: { label: string; value: string }[] = ros
    ? [
        { label: 'Overall rank', value: `#${ros.rank}` },
        { label: 'Position rank', value: `${ros.position}${ros.posRank}` },
        { label: 'Per game', value: ros.projection != null ? ros.projection.toFixed(1) : 'None' },
        { label: 'DraftSharks value', value: ros.value != null ? String(ros.value) : 'None' },
        ...(ros.floor != null && ros.ceiling != null ? [{ label: 'Weekly range', value: `${ros.floor.toFixed(1)} to ${ros.ceiling.toFixed(1)}` }] : []),
        ...(ros.injuryRisk != null ? [{ label: 'Injury risk', value: `${Math.round(ros.injuryRisk * 100)}%` }] : []),
        ...(ros.sos != null ? [{ label: 'Schedule', value: `${ros.sos >= 0 ? '+' : ''}${(ros.sos * 100).toFixed(1)}%` }] : []),
      ]
    : [];

  return (
    <Shell active="more">
      <div className={w.grid}>
        {/* Who he is, each fact once and stacked tight: the way back, his
            name as the page's h1, position and team with the logo, his
            injury status, whether anyone has him and who, and the one thing
            to do about it in Sleeper. The picture fills the right column,
            sat on the card's bottom edge. */}
        <section className={`${w.widget} ${w.l} ${pp.hero}`}>
          <Link href="/players" className={pp.back}>
            <CaretLeft weight="bold" aria-hidden />
            All players
          </Link>
          {/* Who he is: the name, then position, logo and team, all on the
              name's left edge. The picture stands beside them. */}
          <div className={pp.who}>
            <h1 className={pp.heroName}>{player.name}</h1>
            <span className={pp.heroTeam}>
              <abbr className={pp.pos} title={POSITION[player.position] ?? player.position}>
                {player.position}
              </abbr>
              {player.position !== 'DEF' ? (
                <>
                  {player.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.logo} alt="" />
                  ) : null}
                  <span>{nflTeamName(player.team)}</span>
                </>
              ) : null}
            </span>
            {injury ? (
              <span className={pp.hurt}>
                <span className={pp.hot}>
                  {injury}
                  {player.injuryPart ? ` | ${player.injuryPart}` : ''}
                </span>
                {player.practice && player.practice !== 'None' ? <span className={pp.hot}>{`${player.practice} in practice`}</span> : null}
              </span>
            ) : null}
          </div>
          <span className={pp.cutout}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portrait} alt="" className={player.espnId ? pp.cutoutImg : pp.headshotImg} />
          </span>
          {/* Who has him, across the card's white foot: the manager on the
              left edge, the status on the right, then the one thing to do
              about it in Sleeper, full width. */}
          <div className={pp.foot}>
            <div className={pp.ownerRow}>
              {owner ? (
                <Link href={`/managers/${owner.rosterId}`} className={pp.owner}>
                  <span className={pp.ownerFace}>
                    {owner.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={owner.avatarUrl} alt="" />
                    ) : null}
                  </span>
                  <span className={pp.ownerText}>
                    <b>{owner.rosterId === mine ? 'You' : ownerName}</b>
                    <span>{owner.teamName.trim()}</span>
                  </span>
                </Link>
              ) : null}
              <span className={owner ? pp.bugOwned : pp.bugFree}>{owner ? 'Rostered' : 'Free agent'}</span>
            </div>
            {owner ? (
              owner.rosterId === mine ? null : <SleeperPill action="trades" label="Propose a trade" />
            ) : (
              <SleeperPill action="players" label={unit ? 'Add this defense' : 'Claim him on waivers'} />
            )}
          </div>
        </section>

        {/* The season in four numbers, one row. */}
        {season.weeks.length ? (
          <StatRow
            icon="football"
            title="Season"
            stats={[
              {
                label: 'Total',
                value: season.totalPoints.toFixed(2),
                sub: season.weeks.length ? `Avg ${(season.totalPoints / season.weeks.length).toFixed(2)}` : undefined,
              },
              {
                label: 'Started',
                value: season.startedPoints.toFixed(2),
                sub: season.totalPoints > 0 ? `${Math.round((season.startedPoints / season.totalPoints) * 100)}%` : undefined,
              },
              ...(best ? [{ label: 'Best', value: best.points.toFixed(2), sub: `Week ${best.week}, ${best.started ? 'started' : 'benched'}` }] : []),
              {
                label: 'Games',
                value: String(season.weeks.length),
                sub: `${season.weeks.filter((x) => x.started).length} started`,
              },
            ]}
          />
        ) : (
          <Widget size="m" icon="football" title="Season">
            <p className={w.empty}>Not on a league roster this season</p>
          </Widget>
        )}

        {/* Season stats, picked and labelled by the league's own scoring. */}
        <Widget size="m" icon="chart" title="Season stats">
          {blocks.length ? (
            <div className={pp.blocks}>
              {blocks.map((b) => (
                <div key={b.title} className={pp.block}>
                  <span className={w.subHead}>{b.title}</span>
                  <dl className={pp.pairs}>
                    {b.lines.map((l) => (
                      <div key={l.label} className={pp.pair}>
                        <dt>{l.label}</dt>
                        <dd>{l.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <p className={w.empty}>No season stats yet.</p>
          )}
        </Widget>

        {/* Usage, week by week, from nflverse. */}
        <Usage playerId={playerId} position={player.position} />

        {/* Outlook: the number, the range, the matchup, and the working
            underneath, so nobody has to take the app's word for it. */}
        <Widget size="m">
          <WidgetHead icon="binoculars" title="Outlook" />
          <div className={pp.outTop}>
            <div className={pp.outCell}>
              <span className={w.subHead}>Projected</span>
              <span className={pp.outBig}>{outlook.adjusted.toFixed(2)}</span>
              <span className={w.sub}>
                {outlook.floor.toFixed(2)} to {outlook.ceiling.toFixed(2)}
              </span>
            </div>
            {mu ? (
              <div className={`${pp.outCell} ${mu.label === 'hard' ? pp.cellHard : mu.label === 'soft' ? pp.cellSoft : ''}`}>
                <span className={w.subHead}>Matchup</span>
                <span className={pp.outBig}>{mu.label === 'soft' ? 'Soft' : mu.label === 'hard' ? 'Hard' : 'Even'}</span>
                <span className={pp.outNote}>
                  {ordinal(mu.rank)} most points allowed to {PLURAL[player.position] ?? player.position}
                </span>
              </div>
            ) : (
              <div className={pp.outCell}>
                <span className={w.subHead}>Matchup</span>
                <span className={pp.outNote}>No opponent on the schedule this week.</span>
              </div>
            )}
          </div>

          {read ? <p className={pp.read}>{read}</p> : null}

          {boomBust ? (
            <div className={pp.odds}>
              <span className={`${pp.odd} ${pp.boom}`}>
                <b>{pct(boomBust.boom)}</b>
                <span>Boom | {boomBust.boomLine}+</span>
              </span>
              <span className={`${pp.odd} ${pp.bust}`}>
                <b>{pct(boomBust.bust)}</b>
                <span>Bust | {boomBust.bustLine} or less</span>
              </span>
            </div>
          ) : null}

          {moved && mu ? (
            <p className={pp.working}>
              {outlook.base.toFixed(2)} before the matchup. {nflTeamName(mu.opponent)} allows {mu.conceded.toFixed(1)} a game to {PLURAL[player.position] ?? 'the position'}.
            </p>
          ) : null}

          {role || usage ? (
            <div className={pp.chips}>
              {role ? <span className={`${w.chip} ${pp.role}`}>{role}</span> : null}
              {usage ? (
                <>
                  <span className={w.chip}>Snaps | {pct(usage.snapShare)}</span>
                  {shareValue ? (
                    <span className={w.chip}>
                      {shareLabel} share | {pct(shareValue)}
                    </span>
                  ) : null}
                  {usage.redZone ? <span className={w.chip}>Red zone looks | {usage.redZone} per game</span> : null}
                  {trend && trend !== 'steady' ? <span className={w.chip}>Usage | {trend}</span> : null}
                </>
              ) : null}
            </div>
          ) : null}

          {outlook.ahead.length ? (
            <div className={pp.ahead}>
              <span className={w.subHead}>Coming up</span>
              <div className={pp.chips}>
                {outlook.ahead.map((f) => (
                  <span key={f.week} className={`${w.chip} ${f.label === 'hard' ? w.chipHot : f.label === 'even' ? pp.chipEven : ''}`}>
                    {`W${f.week} | ${f.home ? 'vs' : 'at'} ${nflTeamName(f.opponent)}`}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {outlook.source === 'model' ? (
            <p className={w.via}>SQUIRT model, off {outlook.median?.toFixed(1)} median across the field it has seen. A projection, not a promise.</p>
          ) : outlook.confidence === 'thin' ? (
            <p className={w.via}>
              Defensive ratings are {Math.round(outlook.weight * 100)} percent applied this early. Two games isn&rsquo;t a read on a defense yet.
            </p>
          ) : null}
        </Widget>

        {/* What is being reported, as the reporters wrote it. */}
        <Widget size="m">
          <WidgetHead icon="newspaper" title="Word on him" aside={notes.length ? <span className={w.sub}>via ESPN</span> : null} />
          {notes.length ? (
            <ul className={w.list}>
              {notes.map((n) => (
                <li key={n.url}>
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className={pp.news}>
                    <b>{n.headline}</b>
                    {n.summary ? <span className={pp.newsSum}>{n.summary}</span> : null}
                    <span className={pp.newsCredit}>
                      {[n.byline, n.source, filed(n.published)].filter(Boolean).join(', ')}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={w.empty}>No recent news.</p>
          )}
        </Widget>

        {/* His NFL game this week: who, when, where to watch, then every
            number on it as its own labelled cell, nothing chained. */}
        <Widget size="m" icon="tv" title={`Week ${upcoming}`}>
          {matchup ? (
            <Link href={`/nfl/${matchup.game.id}`} className={pp.game}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={matchup.opponent.logo} alt="" className={pp.gameLogo} />
              <span className={pp.gameText}>
                <b>
                  {matchup.home ? 'vs' : 'at'} {nflTeamName(matchup.opponent.abbr)}
                </b>
                <span>
                  {matchup.game.state === 'pre'
                    ? kickoff(matchup.game.kickoff)
                    : `${gameStatus(matchup.game.status)}, ${result(matchup.team.score, matchup.opponent.score, matchup.game.state === 'post')}`}
                </span>
              </span>
              <CaretRight weight="bold" className={pp.caret} aria-hidden />
            </Link>
          ) : (
            <p className={w.empty}>No game this week.</p>
          )}
          <div className={pp.cells}>
            {/* A number that doesn't exist yet isn't shown, rather than said as None. */}
            {weekCells.filter((c) => c.value !== 'None').map((c) => (
              <span key={c.label} className={pp.cell}>
                <span className={w.subHead}>{c.label}</span>
                <b>{c.value}</b>
              </span>
            ))}
          </div>
          {actualLine ? (
            <p className={pp.note}>
              <b>This week:</b> {actualLine}
            </p>
          ) : null}
          {projectedLine ? (
            <p className={pp.note}>
              <b>Projected line:</b> {projectedLine}
            </p>
          ) : null}
          <p className={w.via}>Sources | Sleeper, DraftSharks{lines ? `, ${lines.provider}` : ''}</p>
        </Widget>

        {/* Sleeper's own lines on him, from Sleeper Picks: the number, then
            what each side pays. Only there when Sleeper has posted some. */}
        {props.length ? (
          <Widget size="m">
            <div className={w.head}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SLEEPER_MARK} alt="" className={pp.propsMark} />
              <span className={w.title}>Sleeper props</span>
            </div>
            <ul className={pp.props}>
              {props.map((prop) => (
                <li key={prop.wager} className={pp.prop}>
                  <span className={pp.propLine}>
                    {prop.label} | <b>{prop.line}</b>
                  </span>
                  <span className={pp.propPays}>
                    {[prop.over != null ? `Over ${prop.over.toFixed(2)}x` : null, prop.under != null ? `Under ${prop.under.toFixed(2)}x` : null]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          </Widget>
        ) : null}

        {/* The rest of his season, as DraftSharks ranks it. */}
        <Widget size="m">
          <WidgetHead icon="ranking" title="Rest of season" aside={<span className={w.sub}>DraftSharks</span>} />
          {ros ? (
            <div className={pp.cells}>
              {rosCells.filter((c) => c.value !== 'None').map((c) => (
                <span key={c.label} className={pp.cell}>
                  <span className={w.subHead}>{c.label}</span>
                  <b>{c.value}</b>
                </span>
              ))}
            </div>
          ) : (
            <p className={w.empty}>Not ranked by DraftSharks.</p>
          )}
        </Widget>

        {/* His plays, from the broadcasters' channels, playing right here:
            muted in view, one at a time, a tap for sound. */}
        {clips.length ? (
          <ClipRail title="Highlights" icon="play" clips={clips} ownerOf={() => null} size="m" />
        ) : (
          <Widget size="m" icon="play" title="Highlights">
            <p className={w.empty}>No clips yet</p>
          </Widget>
        )}

        {/* Every scored week: started solid, benched outlined. */}
        <Widget size="m" icon="chart" title="Points by week">
          <PointsChart
            points={season.weeks.map((x) => ({ week: x.week, points: x.points, good: x.started }))}
            playoffWeekStart={league.playoffWeekStart}
            weeks={Math.max(1, ...season.weeks.map((x) => x.week))}
            solid="Started"
            hollow="Benched"
          />
        </Widget>

        <Widget size="m" icon="book" title="Game log">
          {season.weeks.length ? (
            <ul className={w.list}>
              {season.weeks.map((x) => (
                <li key={x.week} className={pp.log}>
                  <span className={pp.logWeek}>Week {x.week}</span>
                  <span className={`${pp.logTag} ${x.started ? '' : pp.logBench}`}>{x.started ? 'Started' : 'Benched'}</span>
                  <span className={pp.logPts}>{x.points.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={w.empty}>No scored weeks yet.</p>
          )}
        </Widget>
      </div>
    </Shell>
  );
}
