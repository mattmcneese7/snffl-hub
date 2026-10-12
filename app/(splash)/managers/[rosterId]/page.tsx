import type { Metadata } from 'next';
import { statWords } from '../../kit/statWords';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react/dist/ssr';
import { nflTeamName } from '../../kit/nflTeams';
import { notFound } from 'next/navigation';
import { TROPHIES, type TrophyKey } from '@/components/Trophy';
import { firstNameOf } from '@/config/managers';
import { getChugCounts, getPointsByWeek } from '@/lib/awards';
import { toFeature } from '@/lib/feature';
import { getStandings, getWeekGames, league, playerOf, scoredWeek, teamByRoster } from '@/lib/league';
import { buildLiveMatchup, getMatchupContext, markInPlay, type LivePlayer } from '@/lib/matchup-live';
import { movementFor, timing, type MovementEvent } from '@/lib/movement';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { getOddsFor } from '@/lib/playoff-odds';
import { getRosters } from '@/lib/sleeper';
import { getTrophyBoard } from '@/lib/trophies';
import Shell from '../../kit/Shell';
import Widget, { WidgetHead } from '../../home/Widget';
import AwardIcon from '../../home/Awards';
import Squirt from '../../home/Squirt';
import { PillLink } from '../../home/Glass';
import { bookFrom, moneyText, withBook } from '../../lib/odds-books';
import Face, { initialsOf } from '../Face';
import PointsChart from '../PointsChart';
import StatRow from '../StatRow';
import w from '../../home/widgets.module.css';
import home from '../../home/home.module.css';
import soul from '../../home/soul.module.css';
import m from '../managers.module.css';
import { gameStatus } from '../../kit/gameStatus';
import PlayerRow, { PlayerDeep, PlayerMeta, scoredThisWeek, weekLine } from '../../kit/PlayerRow';
import { outlookFor, roleOf } from '@/lib/outlook';
import { getWeekProjections } from '@/lib/projections';
import { playerWeek, weekLines } from '../../swami/week-lines';
import { readSleeperProps } from '../../lib/sleeper-props';
import { recentUsage } from '../../lib/deep/nflverse';

export const metadata: Metadata = { title: { absolute: 'Manager, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';
const record = (t: { wins: number; losses: number; ties: number }) => `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`;
const ordinal = (n: number) => {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

// Best hardware first, the Shart and the Plunger last, as v2's case did.
const SHELF: TrophyKey[] = ['champion', 'motw', 'blowout', 'squeaker', 'lucky', 'heartbreaker', 'bench', 'shart', 'plunger'];
const MOVE_MARK: Record<MovementEvent['kind'], string> = { start: 'START', bench: 'BENCH', add: 'ADD', drop: 'DROP' };

/**
 * The move as a sentence, without his name on it (he knows whose page this
 * is), and with every player's full name. lib/movement writes "E. McPherson";
 * Splash never shortens a player to an initial, so the sentence is said again
 * here from the same event, in the same words, with the full names.
 */
const sayMove = (e: MovementEvent) => {
  const player = playerOf(e.playerId).name;
  const other = e.otherId ? playerOf(e.otherId).name : null;
  switch (e.kind) {
    case 'start':
      return other ? `Started ${player} over ${other}.` : `Started ${player}.`;
    case 'bench':
      return `Benched ${player}.`;
    case 'add':
      return `Added ${player}.`;
    case 'drop':
      return `Dropped ${player}.`;
  }
};
const kickoff = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(new Date(iso));

/**
 * One manager's page: who he is, the game he is in right now, the season in
 * four numbers, his hardware, his scores week by week, his own decisions and
 * the roster he is carrying. Everything v2's manager page showed, from the
 * same sources, plus the live matchup model, the lore the Home tells about
 * him, and this week's points beside every player.
 */
export default async function ManagerPage({ params }: { params: Promise<{ rosterId: string }> }) {
  const { rosterId: raw } = await params;
  const rosterId = Number(raw);
  const team = teamByRoster(rosterId);
  if (!team) notFound();

  const week = await scoredWeek();
  const [standings, byWeek, odds, trophies, rawGames, espnCtx, moves, chugs, jar, rosters] = await Promise.all([
    getStandings(),
    getPointsByWeek(rosterId).catch(() => []),
    getOddsFor(rosterId).catch(() => undefined),
    getTrophyBoard().catch(() => null),
    getWeekGames(week).catch(() => []),
    getMatchupContext(week).catch(() => null),
    movementFor(rosterId),
    getChugCounts().catch(() => []),
    cookies(),
    getRosters().catch(() => null),
  ]);
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  // For the roster's rows: projections and matchups, the week's lines from
  // your book, Sleeper's props.
  const [projections, lineCtx, props] = await Promise.all([
    getWeekProjections(league.state.season, week).catch(() => ({}) as Record<string, number>),
    weekLines(league.state.season, week, undefined, bookFrom(jar)),
    readSleeperProps(),
  ]);
  // Lines from the book this device picked, DraftKings where it has none.
  const ctx = espnCtx ? await withBook(espnCtx, bookFrom(jar)) : null;
  const name = firstNameOf(rosterId) ?? team.manager;

  // Live numbers where Sleeper has them, the nightly file otherwise.
  const standing = standings.find((s) => s.rosterId === rosterId);
  const t = standing ?? team;

  // This week's game, with the live model behind it when the context loaded.
  const games = ctx ? markInPlay(rawGames, ctx.nfl) : rawGames;
  const game = games.find((g) => g.home.rosterId === rosterId || g.away.rosterId === rosterId);
  const lm = game && ctx ? buildLiveMatchup(game, ctx) : undefined;
  const f = game ? toFeature(game, `Week ${week}`, lm) : null;
  const me = f ? (f.away.rosterId === rosterId ? f.away : f.home) : null;
  const them = f ? (f.away.rosterId === rosterId ? f.home : f.away) : null;

  // Lore: what the season says about him, the same chips the Home tells.
  const all = trophies?.all ?? [];
  const lore: { text: string; hot?: boolean }[] = [];
  const streak = standing?.streak ?? '';
  const run = Number(streak.slice(1));
  // Labels, not sentences: the thing, a pipe, the weeks.
  const weeksOf = (list: (number | null)[]) =>
    list
      .filter((x): x is number => x != null)
      .sort((a, b) => a - b)
      .map((x) => `W${x}`)
      .join(', ');
  if (run >= 2) lore.push({ text: streak.startsWith('W') ? `${run} game win streak` : `${run} game losing streak`, hot: streak.startsWith('L') });
  const motw = all.filter((a) => a.kind === 'motw' && a.rosterId === rosterId);
  if (motw.length) lore.push({ text: `Manager of the Week | ${weeksOf(motw.map((a) => a.week))}` });
  const sharts = all.filter((a) => a.kind === 'shart' && a.rosterId === rosterId);
  if (sharts.length) lore.push({ text: `Shart | ${weeksOf(sharts.map((a) => a.week))}`, hot: true });
  const chugged = chugs.find((c) => c.rosterId === rosterId)?.weeks ?? [];
  if (chugged.length) lore.push({ text: `Chugged | ${weeksOf(chugged)}`, hot: true });

  // The trophy case: every award he has won, grouped, with the weeks.
  const myAwards = all.filter((a) => a.rosterId === rosterId);
  const shelf = SHELF.map((kind) => ({ kind, list: myAwards.filter((a) => a.kind === kind) })).filter((s) => s.list.length);

  // The roster: live from Sleeper, the nightly starters if that fails. Empty
  // starter slots come back as "0" and are not players.
  const live = rosters?.find((r) => r.roster_id === rosterId);
  const starterSlots = live?.starters ?? team.starters;
  const starters = starterSlots.filter((id) => id && id !== '0');
  // Every slot as Sleeper orders it (QB, RB, WR, WR, TE, FLEX, FLEX, K, DEF),
  // an empty one shown as empty rather than skipped.
  const slotNames = league.rosterPositions.filter((p) => p !== 'BN' && p !== 'IR' && p !== 'TAXI');
  const lineup = slotNames.map((slot, i) => ({ slot: slot === 'SUPER_FLEX' ? 'SFLEX' : slot, id: starterSlots[i] && starterSlots[i] !== '0' ? starterSlots[i] : null }));
  // Injured reserve and taxi apart from the bench, as Sleeper keeps them.
  const extra = live as { reserve?: string[] | null; taxi?: string[] | null } | undefined;
  const reserve = (extra?.reserve ?? []).filter(Boolean);
  const taxi = (extra?.taxi ?? []).filter(Boolean);
  const bench = (live?.players ?? []).filter((id) => !starters.includes(id) && !reserve.includes(id) && !taxi.includes(id));
  // This week's points beside each player, once the week has any.
  const weekPts = new Map<string, number>();
  if (game && game.status !== 'pending') {
    const side = game.home.rosterId === rosterId ? game.home : game.away;
    for (const p of [...side.lineup, ...(side.bench ?? [])]) weekPts.set(p.id, p.points);
  }
  // Each player's week from the live model: his NFL game, his stat line or
  // projected line, and the chosen book's line on his game. Shown on the row,
  // not behind an expander.
  const liveBy = new Map<string, LivePlayer>();
  if (lm) {
    const side = lm.home.rosterId === rosterId ? lm.home : lm.away;
    for (const p of [...side.lineup, ...side.bench]) liveBy.set(p.id, p);
  }
  // Three short lines at most, commas not pipes, every term spelled out:
  // where and when (or how it went), what he did or is projected to do, and
  // the betting line on his game while it is still to be played.
  const weekOf = (lp: LivePlayer | undefined) => {
    if (!lp) return null;
    const n = lp.nfl;
    let game = '';
    if (lp.gameState === 'bye') game = 'Bye week';
    else if (n) {
      const where = `${n.home ? 'vs' : 'at'} ${nflTeamName(n.opponent.abbr)}`;
      const a = n.team.score ?? 0;
      const b = n.opponent.score ?? 0;
      game =
        n.game.state === 'pre'
          ? `${where}, ${kickoff(n.game.kickoff)}`
          : n.game.state === 'post'
            ? `${where}, ${a > b ? 'won' : a < b ? 'lost' : 'tied'} ${a}-${b}`
            : `${where}, ${gameStatus(n.game.status)}, ${a}-${b}`;
    }
    const stat = lp.statLine
      ? statWords(lp.statLine)
      : lp.projected != null && lp.projected > 0
        ? `Projected ${lp.projected.toFixed(2)}${lp.projectedLine ? `: ${statWords(lp.projectedLine)}` : ''}`
        : '';
    const book = n && lp.lines ? (n.home ? lp.lines.home : lp.lines.away) : null;
    const spread = lp.lines?.spread != null && n ? (n.home ? lp.lines.spread : -lp.lines.spread) : null;
    const line =
      lp.lines && n && n.game.state === 'pre'
        ? [
            spread != null ? `spread ${spread > 0 ? `+${spread}` : spread}` : null,
            lp.lines.overUnder != null ? `total ${lp.lines.overUnder}` : null,
            book && moneyText(lp.lines, n.home) ? `moneyline ${moneyText(lp.lines, n.home)}` : null,
            lp.teamTotal != null ? `implied total ${lp.teamTotal}` : null,
          ]
            .filter(Boolean)
            .join(', ')
        : '';
    // Led by the book it came from, which is the one picked unless that
    // book had nothing on this game.
    return { game, stat, line: line ? `${lp.lines!.provider} | ${line.charAt(0).toUpperCase() + line.slice(1)}` : '' };
  };

  const status = f?.status;
  const hasModel = me?.winProb != null && them?.winProb != null && status !== 'final';

  /**
   * One roster row, the app's shared player row: slot, face, name, position
   * and team, who he plays, and this week's points once his game has kicked
   * off (a dash with his projection under it before then). The caret opens
   * the deep read.
   */
  const playerRow = (id: string, slot: string) => {
    const p = playerOf(id);
    const outlook = outlookFor(id, p.position, p.team, (projections as Record<string, number>)[id] ?? 0, week);
    const scored = scoredThisWeek(p.team ? lineCtx.byTeam.get(p.team)?.game.state : null, weekPts.get(id), lineCtx.actual[id]?.points);
    return (
      <li key={`${slot}-${id}`}>
        <PlayerRow
          id={id}
          name={p.name}
          headshot={p.headshot}
          slot={slot}
          meta={<PlayerMeta position={p.position} team={p.team} />}
          sub={weekLine(outlook.matchup, p.team)}
          value={scored != null ? scored.toFixed(2) : '\u2013'}
          projected={scored == null}
          note={scored == null && outlook.adjusted > 0 ? `Proj: ${outlook.adjusted.toFixed(2)}` : undefined}
        >
          <PlayerDeep
            outlook={outlook}
            role={roleOf(id, p.position)}
            pw={playerWeek(lineCtx, id, p.position, p.team)}
            props={props[id] ?? []}
            usage={recentUsage(id)}
            position={p.position}
          />
        </PlayerRow>
      </li>
    );
  };

  return (
    <Shell active="more">
      <div className={w.grid}>
        {/* Who he is, stacked tight: the way back, the avatar, the team as
            Sleeper spells it (the page's h1), his first name and handle,
            and what the season says about him. */}
        <section className={`${w.widget} ${w.l} ${m.heroCard} ${rosterId === mine ? m.mine : ''}`}>
          <Link href="/managers" className={m.back}>
            <CaretLeft weight="bold" aria-hidden />
            All managers
          </Link>
          <div className={m.hero}>
            <Face src={team.avatarUrl} size={68} initials={initialsOf(team.teamName || team.manager)} ring />
            <div className={m.heroText}>
              <h1 className={m.heroTeam}>{team.teamName}</h1>
              <span className={m.handle}>
                <b>{name}</b>, @{team.manager} on Sleeper
              </span>
              {rosterId === mine ? <span className={m.youChip}>Your team</span> : null}
            </div>
          </div>
          {lore.length ? (
            <div className={m.lore}>
              {lore.map((l) => (
                <span key={l.text} className={`${soul.loreChip} ${l.hot ? soul.loreHot : ''}`}>
                  {l.text}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {/* This week: his game as a score bug, him on top, live when it is. */}
        {f && me && them && game ? (
          <article className={`${home.bug} ${w.l}`}>
            <WidgetHead
              icon="helmet"
              title={`Week ${week}`}
              aside={
                game.inPlay ? (
                  <span className={home.live}>
                    <svg viewBox="0 0 64 64" className={home.liveDrop} aria-hidden>
                      <path d={DROP} />
                    </svg>
                    Live
                  </span>
                ) : (
                  <span className={home.state}>{status === 'final' ? 'Final' : status === 'live' ? 'In progress' : 'Upcoming'}</span>
                )
              }
            />
            <div className={home.bugRows}>
              {[me, them].map((side, i, both) => {
                const lead = side.points >= both[1 - i].points && side.points > 0;
                const ahead: string[] = [];
                if (status !== 'final' && side.projected != null) ahead.push(`Projected ${side.projected.toFixed(2)}`);
                if (status === 'live') ahead.push(`${side.yetToPlay} to play`);
                return (
                  <div key={side.rosterId} className={home.bugRow}>
                    <span className={home.bugAvatar}>
                      {side.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={side.avatarUrl} alt="" />
                      ) : null}
                    </span>
                    <span className={home.bugWho}>
                      {i === 1 ? (
                        <Link href={`/managers/${side.rosterId}`} className={home.bugTeam} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {side.teamName}
                        </Link>
                      ) : (
                        <span className={home.bugTeam}>{side.teamName}</span>
                      )}
                      {/* His own name and record are on the page already;
                          the opponent's are not. */}
                      {i === 1 ? (
                        <span className={home.sub}>
                          {side.manager}
                          {side.record ? `, ${side.record}` : ''}
                        </span>
                      ) : null}
                    </span>
                    <span className={home.bugRight}>
                      <span className={`${home.bugScore} ${lead ? home.winning : ''}`}>{side.points.toFixed(2)}</span>
                      {ahead.length ? <span className={home.sub}>{ahead.join(', ')}</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
            {hasModel ? (
              <div className={home.oddsLine}>
                {/* Never 100 to 0 while anyone is left to play: the app's rule for every win bar. */}
                <b>{Math.min(99, Math.max(1, Math.round(me.winProb! * 100)))}%</b>
                <span className={home.bar} aria-hidden>
                  <span className={me.winProb! >= them.winProb! ? home.barFav : home.barDog} style={{ flex: me.winProb! }} />
                  <span className={me.winProb! >= them.winProb! ? home.barDog : home.barFav} style={{ flex: them.winProb! }} />
                </span>
                <b>{100 - Math.min(99, Math.max(1, Math.round(me.winProb! * 100)))}%</b>
              </div>
            ) : null}
            <div className={home.bugFoot}>
              <span className={home.sub}>{hasModel ? 'Chance to win' : ''}</span>
              <PillLink href={`/scoreboard/${week}/${game.matchupId}`} small>
                Open the matchup
              </PillLink>
            </div>
          </article>
        ) : (
          <Widget size="m" icon="helmet" title={`Week ${week}`}>
            <p className={w.empty}>No game on the board this week.</p>
          </Widget>
        )}

        {/* The season in four numbers, one row. */}
        <StatRow
          icon="ranking"
          title="Season"
          stats={[
            { label: 'Record', value: record(t) },
            // A number that doesn't exist yet is left out, never said as None.
            ...(standing
              ? [{ label: 'Standing', value: ordinal(standing.seed), sub: standing.inPlayoffs ? 'In playoffs' : 'Out of playoffs', href: '/standings' }]
              : []),
            { label: 'Points for', value: t.pointsFor.toFixed(2), sub: `Against ${t.pointsAgainst.toFixed(2)}` },
            ...(odds
              ? [{ label: 'Playoff odds', value: `${odds.makePlayoffs.toFixed(0)}%`, sub: odds.tag, sub2: `Bye ${odds.bye.toFixed(0)}%`, href: '/standings#playoffs' }]
              : []),
          ]}
        />

        {/* The whole roster, right under his week: every starting slot in
            Sleeper's order (an empty one says so), then the bench, injured
            reserve and taxi, each counted, each to the player's page. */}
        <section className={`${w.widget} ${w.l}`}>
          <WidgetHead icon="jersey" title="Roster" aside={<span className={w.sub}>{starters.length + bench.length + reserve.length + taxi.length} players</span>} />
          {starters.length || bench.length || reserve.length ? (
            <div>
              <div className={`${w.subHead} ${m.rosterHead}`}>Starting</div>
              <ul className={`${w.list} ${m.list}`}>
                {lineup.map(({ slot, id }, i) =>
                  id ? (
                    playerRow(id, slot)
                  ) : (
                    <li key={`empty-${i}`}>
                      <span className={`${m.pRow} ${m.withSlot}`}>
                        <span className={m.tag}>{slot}</span>
                        <span className={m.emptySlot} aria-hidden />
                        <span className={m.pText}>
                          <span className={m.pName}>Empty</span>
                          <span className={m.pMeta}>No one in this slot</span>
                        </span>
                      </span>
                    </li>
                  ),
                )}
              </ul>
              {bench.length ? (
                <>
                  <div className={`${w.subHead} ${m.rosterHead}`}>Bench | {bench.length}</div>
                  <ul className={`${w.list} ${m.list}`}>{bench.map((id) => playerRow(id, 'BN'))}</ul>
                </>
              ) : null}
              {reserve.length ? (
                <>
                  <div className={`${w.subHead} ${m.rosterHead}`}>Injured reserve | {reserve.length}</div>
                  <ul className={`${w.list} ${m.list}`}>{reserve.map((id) => playerRow(id, 'IR'))}</ul>
                </>
              ) : null}
              {taxi.length ? (
                <>
                  <div className={`${w.subHead} ${m.rosterHead}`}>Taxi | {taxi.length}</div>
                  <ul className={`${w.list} ${m.list}`}>{taxi.map((id) => playerRow(id, 'TAXI'))}</ul>
                </>
              ) : null}
            </div>
          ) : (
            <p className={w.empty}>Roster unavailable from Sleeper</p>
          )}
        </section>

        {/* The trophy case: every award, how many, which weeks. */}
        <Widget size="m" icon="trophy" title="Trophy case" href="/trophies" more="Every award">
          {shelf.length ? (
            <div className={m.shelf}>
              {shelf.map(({ kind, list }) => (
                <div key={kind} className={m.slot}>
                  <span className={m.slotArt}>
                    <AwardIcon kind={kind} size={52} />
                    {list.length > 1 ? <span className={m.count}>&times;{list.length}</span> : null}
                  </span>
                  <span className={m.slotName}>{TROPHIES[kind].name}</span>
                  <span className={m.slotWeeks}>{list.map((a) => (a.week ? `W${a.week}` : 'Season')).join(', ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={m.emptyShelf}>
              <Squirt mood="calm" size={44} />
              <p className={w.empty}>
                <b>Empty shelf</b>
                No hardware yet.
              </p>
            </div>
          )}
        </Widget>

        {/* Points by week: wins solid, losses outlined, the playoffs washed. */}
        <Widget size="m">
          <WidgetHead icon="chart" title="Points by week" aside={<span className={w.sub}>{byWeek.length} played</span>} />
          <PointsChart
            points={byWeek.map((p) => ({ week: p.week, points: p.points, good: p.won }))}
            playoffWeekStart={league.playoffWeekStart}
            weeks={Math.max(1, ...byWeek.map((p) => p.week))}
            solid="Won"
            hollow="Lost"
          />
        </Widget>

        {/* His own decisions, across the season: the pattern is the thing a
            single week cannot show. */}
        <Widget size="m" icon="swap" title="Moves">
          {moves.length ? (
            <ul className={w.list}>
              {moves.slice(0, 10).map((e) => (
                <li key={e.id}>
                  <Link href={`/players/${e.playerId}`} className={m.moveRow}>
                    <span className={w.mark}>{MOVE_MARK[e.kind]}</span>
                    <span className={m.moveText}>
                      {sayMove(e)}
                      <span className={m.moveWhen}>
                        Week {e.week}, {timing(e.at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={w.empty}>No moves logged for {name} yet.</p>
          )}
        </Widget>

      </div>
    </Shell>
  );
}
