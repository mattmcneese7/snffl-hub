import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react/dist/ssr';
import SleeperConnect from '@/components/SleeperConnect';
import { firstNameOf } from '@/config/managers';
import { getWeekGames, league, playerOf, STARTER_SLOTS, teamByRoster, teams } from '@/lib/league';
import { movementFor, timing, type MovementEvent } from '@/lib/movement';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { outlookFor, roleOf } from '@/lib/outlook';
import { getWeekProjections } from '@/lib/projections';
import { getRosters, LEAGUE_ID } from '@/lib/sleeper';
import { sleeperLink } from '@/lib/sleeper-links';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import Widget, { WidgetHead } from '../home/Widget';
import Squirt, { type Mood } from '../home/Squirt';
import w from '../home/widgets.module.css';
import TeamSelect from './TeamSelect';
import Swap from './Swap';
import m from './mine.module.css';
import { playerWeek, weekLines } from '../swami/week-lines';
import { bookFrom } from '../lib/odds-books';
import PlayerRow, { PlayerDeep, PlayerMeta, scoredThisWeek, weekLine } from '../kit/PlayerRow';
import { readSleeperProps } from '../lib/sleeper-props';
import { recentUsage } from '../lib/deep/nflverse';

export const metadata: Metadata = {
  title: { absolute: 'My Team, Splash' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * Your team, and what to do about it, in Splash. The same reads as v2's My
 * Team: what is broken in the lineup, which bench player is worth a swap and
 * the button that makes it, the lineup with each matchup, the Sleeper
 * connection, and your own moves. A list of decisions, not a dashboard: a
 * manager opening this on a Sunday morning wants to know what is wrong.
 *
 * Server rendered from the team cookie, so it is yours before it draws.
 */

const pts = (n: number) => n.toFixed(2);

/** Anything in the lineup that should not be, as v2 reads it. */
const SITTING = new Set(['Out', 'Doubtful', 'IR', 'Sus', 'PUP', 'NA', 'DNR']);
const FLEX = new Set(['RB', 'WR', 'TE']);



/**
 * A move on your own page: the mark says what kind, so the line is just who,
 * by full name. lib/movement writes its sentences with short names, so this
 * reads the ids instead.
 */
function moveLine(event: MovementEvent): string {
  const player = playerOf(event.playerId).name;
  const other = event.otherId ? playerOf(event.otherId).name : null;
  switch (event.kind) {
    case 'start':
      return other ? `${player} over ${other}` : player;
    default:
      return player;
  }
}

const KIND_MARK: Record<MovementEvent['kind'], string> = {
  start: 'START',
  bench: 'BENCH',
  add: 'ADD',
  drop: 'DROP',
};

export default async function MyTeamPage() {
  const jar = await cookies();
  const rosterId = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const pickable = teams.map((t) => ({
    rosterId: t.rosterId,
    teamName: t.teamName,
    manager: firstNameOf(t.rosterId) ?? t.manager,
  }));

  if (!rosterId) {
    return (
      <Shell active="more">
        <PageHead title="My Team" />
        <div className={w.grid}>
          <Widget size="m" icon="jersey" title="Pick your team">
            <div className={m.pick}>
              <Squirt mood="calm" size={64} />
              <p className={m.pickIntro}>Pick your team and this page shows your lineup, what&rsquo;s wrong with it, and your moves.</p>
            </div>
            <TeamSelect teams={pickable} current={null} />
            <p className={m.note}>Remembered on this device. No account.</p>
          </Widget>
        </div>
      </Shell>
    );
  }

  const week = league.state.week;
  const team = teamByRoster(rosterId);
  const [rosters, projections, moves, games, ctx, props] = await Promise.all([
    getRosters().catch(() => []),
    getWeekProjections(league.state.season, week),
    movementFor(rosterId, 12),
    getWeekGames(week).catch(() => []),
    weekLines(league.state.season, week, undefined, bookFrom(jar)),
    readSleeperProps(),
  ]);

  const mine = rosters.find((r) => r.roster_id === rosterId);
  const starterIds = (mine?.starters ?? []).filter((id) => id && id !== '0');
  // Injured reserve stands apart from the bench, as Sleeper keeps it: an IR
  // player can't be started, so he is never offered as a swap.
  const reserveIds = ((mine as { reserve?: string[] | null } | undefined)?.reserve ?? []).filter(Boolean);
  const benchIds = (mine?.players ?? []).filter((id) => id && !starterIds.includes(id) && !reserveIds.includes(id));

  const read = (id: string, slot?: string) => {
    const player = playerOf(id);
    const outlook = outlookFor(id, player.position, player.team, projections[id] ?? 0, week);
    return { id, player, slot, outlook, role: roleOf(id, player.position) };
  };

  const starters = starterIds.map((id, i) => read(id, STARTER_SLOTS[i] ?? 'FLEX'));
  const bench = benchIds.map((id) => read(id, 'BN'));
  const reserve = reserveIds.map((id) => read(id, 'IR'));

  const problems = starters.filter((s) => SITTING.has(s.player.injuryStatus ?? '') || s.outlook.adjusted === 0);

  /**
   * A bench player worth more than a starter he could legally replace. Three
   * points of margin, the same threshold as v2 and Squirt Says, because a
   * projection is not precise enough for a one point swap to be advice.
   */
  const canFill = (slot: string, position: string) => slot === position || (slot === 'FLEX' && FLEX.has(position));
  const upgrades = bench
    .flatMap((b) => {
      const target = starters.filter((s) => canFill(s.slot ?? '', b.player.position)).sort((a, c) => a.outlook.adjusted - c.outlook.adjusted)[0];
      if (!target) return [];
      const gain = b.outlook.adjusted - target.outlook.adjusted;
      // The write is a positional array, so the swap needs the slot's index.
      const slotIndex = starterIds.indexOf(target.id);
      return gain >= 3 && slotIndex >= 0 ? [{ bench: b, starter: target, gain, slotIndex }] : [];
    })
    .sort((a, b) => b.gain - a.gain);

  const game = games.find((g) => g.home.rosterId === rosterId || g.away.rosterId === rosterId);
  const opp = game ? (game.home.rosterId === rosterId ? game.away : game.home) : null;
  const total = starters.reduce((sum, s) => sum + s.outlook.adjusted, 0);

  /** Why a starter is on the fix list, in the row's words. */
  const why = (p: (typeof problems)[number]) =>
    p.player.injuryStatus && SITTING.has(p.player.injuryStatus)
      ? `${p.player.injuryStatus}${p.player.injuryPart ? ` (${p.player.injuryPart})` : ''}`
      : p.outlook.matchup
        ? 'No projection'
        : 'No game';

  // Squirt on what is broken, in one scribble beside the total. The rows
  // below carry the names and numbers, so he says only the count.
  const swaps = upgrades.length;
  const squirt: { mood: Mood; say: string } | null = !starters.length
    ? null
    : problems.length
      ? {
          mood: 'gloom',
          say: problems.length === 1 ? '1 starter can’t score' : `${problems.length} starters can’t score`,
        }
      : swaps
        ? { mood: 'sweat', say: 'Your bench beats your lineup' }
        : { mood: 'smug', say: 'Lineup’s clean' };

  /** One lineup row: slot, face, name, team and matchup, his week, his projection. */
  /**
   * One roster row, the app's shared player row: slot, face, name, position
   * and team, who he plays, and his points once his game has kicked off (a
   * dash with his projection under it before then). The caret opens the
   * deep read.
   */
  const lineRow = (s: ReturnType<typeof read>) => {
    const actual = scoredThisWeek(s.player.team ? ctx.byTeam.get(s.player.team)?.game.state : null, ctx.actual[s.id]?.points);
    return (
      <li key={`${s.slot}-${s.id}`}>
        <PlayerRow
          id={s.id}
          name={s.player.name}
          headshot={s.player.headshot}
          slot={s.slot}
          meta={<PlayerMeta position={s.player.position} team={s.player.team} />}
          sub={weekLine(s.outlook.matchup, s.player.team)}
          value={actual != null ? pts(actual) : '\u2013'}
          projected={actual == null}
          note={actual == null && s.outlook.adjusted > 0 ? `Proj: ${pts(s.outlook.adjusted)}` : undefined}
        >
          <PlayerDeep
            outlook={s.outlook}
            role={s.role}
            pw={playerWeek(ctx, s.id, s.player.position, s.player.team)}
            props={props[s.id] ?? []}
            usage={recentUsage(s.id)}
            position={s.player.position}
          />
        </PlayerRow>
      </li>
    );
  };

  return (
    <Shell active="more">
      <PageHead title={team?.teamName ?? 'My Team'} collapse />
      <div className={w.grid}>
        <Widget size="m">
          <WidgetHead
            icon="jersey"
            title="Projected"
            aside={
              <Link href="/settings" className={m.change}>
                Change team
              </Link>
            }
          />
          <div className={m.top}>
            <span className={m.total}>{pts(total)}</span>
            {opp && game ? (
              <Link href={`/scoreboard/${week}/${game.matchupId}`} className={m.opp}>
                vs {firstNameOf(opp.rosterId) ?? opp.manager}
                <CaretRight weight="bold" className={m.caret} aria-hidden />
              </Link>
            ) : null}
            <span className={m.totalLabel}>{opp ? opp.team : 'No matchup yet'}</span>
          </div>
          {squirt ? (
            <span className={m.scribble}>
              <Squirt mood={squirt.mood} size={30} />
              {squirt.say}
            </span>
          ) : null}
        </Widget>

        {problems.length ? (
          <Widget size="m" icon="siren" title="Fix this">
            <ul className={w.list}>
              {problems.map((p) => (
                <li key={p.id}>
                  <PlayerRow
                    id={p.id}
                    name={p.player.name}
                    headshot={p.player.headshot}
                    slot={p.slot}
                    meta={<PlayerMeta position={p.player.position} team={p.player.team} />}
                    sub={<span className={`${w.chip} ${w.chipHot}`}>{why(p)}</span>}
                    value={pts(p.outlook.adjusted)}
                    projected
                  >
                    <PlayerDeep
                      outlook={p.outlook}
                      role={p.role}
                      pw={playerWeek(ctx, p.id, p.player.position, p.player.team)}
                      props={props[p.id] ?? []}
                      usage={recentUsage(p.id)}
                      position={p.player.position}
                    />
                  </PlayerRow>
                </li>
              ))}
            </ul>
          </Widget>
        ) : null}

        {upgrades.length ? (
          <Widget size="m" icon="swap" title="Worth a swap">
            <ul className={w.list}>
              {upgrades.slice(0, 4).map((u) => (
                <li key={u.bench.id}>
                  <PlayerRow
                    id={u.bench.id}
                    name={u.bench.player.name}
                    headshot={u.bench.player.headshot}
                    slot="BN"
                    meta={<PlayerMeta position={u.bench.player.position} team={u.bench.player.team} />}
                    sub={`Replaces ${u.starter.player.name} at ${u.starter.slot}`}
                    value={`+${u.gain.toFixed(1)}`}
                  >
                    <PlayerDeep
                      outlook={u.bench.outlook}
                      role={u.bench.role}
                      pw={playerWeek(ctx, u.bench.id, u.bench.player.position, u.bench.player.team)}
                      props={props[u.bench.id] ?? []}
                      usage={recentUsage(u.bench.id)}
                      position={u.bench.player.position}
                    />
                  </PlayerRow>
                </li>
              ))}
            </ul>
            {/* The app already knows this swap is worth points, so the next
                thing it does is offer to make it. */}
            <div className={m.act}>
              <Swap
                leagueId={LEAGUE_ID}
                rosterId={rosterId}
                starters={starterIds}
                slotIndex={upgrades[0].slotIndex}
                playerId={upgrades[0].bench.id}
                playerName={upgrades[0].bench.player.name}
                deepLink={sleeperLink('lineup')}
              />
            </div>
          </Widget>
        ) : null}

        <Widget size="m" icon="jersey" title="Roster" href="/swami" more="Research">
          {starters.length ? (
            <>
              <div className={`${w.subHead} ${m.rosterHead}`}>Starting</div>
              <ul className={w.list}>{starters.map(lineRow)}</ul>
            </>
          ) : (
            <p className={w.empty}>Lineup unavailable from Sleeper</p>
          )}
          {bench.length ? (
            <>
              <div className={`${w.subHead} ${m.rosterHead}`}>Bench | {bench.length}</div>
              <ul className={w.list}>{bench.map(lineRow)}</ul>
            </>
          ) : null}
          {reserve.length ? (
            <>
              <div className={`${w.subHead} ${m.rosterHead}`}>Injured reserve | {reserve.length}</div>
              <ul className={w.list}>{reserve.map(lineRow)}</ul>
            </>
          ) : null}
          {/* v2's Sleeper connect, as v2 has it, folded away at the foot of
              the lineup it would change. */}
          <details className={m.details}>
            <summary>Set your lineup from here</summary>
            <div className={m.connect}>
              <SleeperConnect />
            </div>
          </details>
        </Widget>

        <Widget size="m" icon="swap" title="Your moves">
          {moves.length ? (
            <ul className={w.list}>
              {moves.slice(0, 6).map((event) => (
                <li key={event.id}>
                  <Link href={`/players/${event.playerId}`} className={m.move}>
                    <span className={w.mark}>{KIND_MARK[event.kind]}</span>
                    <span className={m.moveText}>{moveLine(event)}</span>
                    <span className={m.when}>{timing(event.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={w.empty}>No moves yet</p>
          )}
        </Widget>
      </div>
    </Shell>
  );
}
