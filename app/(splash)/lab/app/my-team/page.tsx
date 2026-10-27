import type { Metadata } from 'next';
import { weekProjections } from '../cached';
import { cookies } from 'next/headers';
import { getWeekGames, league, playerOf, STARTER_SLOTS, teamByRoster } from '@/lib/league';
import { movementFor, timing, type MovementEvent } from '@/lib/movement';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { outlookFor, roleOf } from '@/lib/outlook';
import { getRosters } from '@/lib/sleeper';
import { sleeperLink } from '@/lib/sleeper-links';
import CopyMove from '../swami/CopyMove';
import { injAbbr } from '../injury';
import { scoredThisWeek } from './scored';
import { recentUsage } from '../../../lib/deep/nflverse';
import { bookFrom } from '../../../lib/odds-books';
import { readSleeperProps, type SleeperProp } from '../../../lib/sleeper-props';
import { weekLines } from '../../../swami/week-lines';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { managerOf, MOVE_MARK, moveMarkTone, shortName } from '../modules/shared';
import { Empty, Face, Hero, Section, Tag, ui } from '../ui';
import { ExpandRow } from '../ui/blocks/ExpandRow';
import { Pos } from '../ui/blocks/Pos';
import t from './mine.module.css';
import PlayerRead from './Read';

export const metadata: Metadata = { title: { absolute: 'My Team, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const pts = (n: number) => n.toFixed(2);
/** Anything in the lineup that should not be. */
const SITTING = new Set(['Out', 'Doubtful', 'IR', 'Sus', 'PUP', 'NA', 'DNR']);
const FLEX = new Set(['RB', 'WR', 'TE']);
/** Injury tags as Sleeper prints them. */

/** A move on your own page: the mark says what kind, so the line is just who. */
function moveLine(e: MovementEvent): string {
  const p = playerOf(e.playerId);
  const o = e.otherId ? playerOf(e.otherId) : null;
  const a = shortName(p.name, p.position, p.team);
  return e.kind === 'start' && o ? `${a} over ${shortName(o.name, o.position, o.team)}` : a;
}

/**
 * My Team: what is wrong with your lineup and what to do about it. Fix This,
 * Worth a Swap with the way into Sleeper's lineup screen, the projected
 * total against this week's opponent, the full roster and your moves.
 * Changes happen in Sleeper; this page only links there.
 */
export default async function V4MyTeam() {
  const jar = await cookies();
  const rosterId = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(rosterId);

  if (!rosterId) {
    return (
      <Shell data={data} active="">
        <SectionHead icon="person" word="my team" week={data.week} mine={null} back={{ href: '/lab/app/account', label: 'Account' }} />
        <Empty action={{ href: '/lab/app/account', label: 'Pick Your Team' }}>Pick your team to see your lineup, what is wrong with it and your moves.</Empty>
      </Shell>
    );
  }

  const week = league.state.week;
  const team = teamByRoster(rosterId);
  const [rosters, projections, moves, games, ctx, props] = await Promise.all([
    getRosters().catch(() => []),
    weekProjections(league.state.season, week).catch(() => ({}) as Record<string, number>),
    movementFor(rosterId, 12).catch(() => [] as MovementEvent[]),
    getWeekGames(week).catch(() => []),
    weekLines(league.state.season, week, undefined, bookFrom(jar)),
    readSleeperProps().catch(() => ({}) as Record<string, SleeperProp[]>),
  ]);

  const roster = rosters.find((r) => r.roster_id === rosterId);
  const starterIds = (roster?.starters ?? []).filter((id) => id && id !== '0');
  const reserveIds = ((roster as { reserve?: string[] | null } | undefined)?.reserve ?? []).filter(Boolean);
  const benchIds = (roster?.players ?? []).filter((id) => id && !starterIds.includes(id) && !reserveIds.includes(id));

  const read = (id: string, slot: string) => {
    const player = playerOf(id);
    const outlook = outlookFor(id, player.position, player.team, projections[id] ?? 0, week);
    return { id, player, slot, outlook };
  };
  const starters = starterIds.map((id, i) => read(id, STARTER_SLOTS[i] ?? 'FLEX'));
  const bench = benchIds.map((id) => read(id, 'BN'));
  const reserve = reserveIds.map((id) => read(id, 'IR'));
  const problems = starters.filter((x) => SITTING.has(x.player.injuryStatus ?? '') || x.outlook.adjusted === 0);

  // A bench player worth three or more projected points over a starter he can legally replace.
  const canFill = (slot: string, pos: string) => slot === pos || (slot === 'FLEX' && FLEX.has(pos));
  const upgrades = bench
    .flatMap((b) => {
      const target = starters.filter((x) => canFill(x.slot, b.player.position)).sort((a, c) => a.outlook.adjusted - c.outlook.adjusted)[0];
      if (!target) return [];
      const gain = b.outlook.adjusted - target.outlook.adjusted;
      return gain >= 3 ? [{ bench: b, starter: target, gain }] : [];
    })
    .sort((a, b) => b.gain - a.gain);

  const game = games.find((g) => g.home.rosterId === rosterId || g.away.rosterId === rosterId);
  const opp = game ? (game.home.rosterId === rosterId ? game.away : game.home) : null;
  const oppTeam = opp ? teamByRoster(opp.rosterId) : undefined;
  const total = starters.reduce((sum, x) => sum + x.outlook.adjusted, 0);
  const status = problems.length
    ? `${problems.length} ${problems.length === 1 ? 'starter' : 'starters'} can’t score`
    : upgrades.length
      ? 'Your bench beats your lineup'
      : 'Lineup is clean';

  const why = (p: (typeof problems)[number]) =>
    p.player.injuryStatus && SITTING.has(p.player.injuryStatus)
      ? `${p.player.injuryStatus}${p.player.injuryPart ? ` (${p.player.injuryPart})` : ''}`
      : p.outlook.matchup
        ? 'No projection'
        : 'No game';

  /** A player's summary: slot, face, name with position and game, points on the right. */
  const meta = (x: ReturnType<typeof read>) => {
    const opp = x.outlook.matchup;
    const game = !x.player.team ? 'Free agent' : opp ? `${opp.home ? 'vs' : '@'} ${opp.opponent}` : 'No game';
    return (
      <span className={t.meta}>
        <Pos position={x.player.position} />
        {x.player.injuryStatus ? <Tag tone="bad">{injAbbr(x.player.injuryStatus)}</Tag> : null}
        <span>
          {x.player.team ?? ''} &middot; {game}
        </span>
      </span>
    );
  };
  const scored = (x: ReturnType<typeof read>) => scoredThisWeek(x.player.team ? ctx.byTeam.get(x.player.team)?.game.state : null, ctx.actual[x.id]?.points);
  const slotOf = (x: ReturnType<typeof read>) => (x.slot === 'SUPER_FLEX' ? 'SF' : x.slot);

  /** A row that opens the player sheet. */
  const row = (x: ReturnType<typeof read>, why: string | null, right: { b: string; small: string }) => (
    <button key={`${x.slot}-${x.id}`} type="button" data-player={x.id} className={`${ui.row} ${t.reset}`} aria-label={`${x.player.name}, open player`}>
      <Face id={x.id} team={x.player.team} size={40} defense={x.player.position === 'DEF'} />
      <span className={ui.body}>
        <span className={ui.label}>{slotOf(x)}</span>
        <span className={ui.title}>{shortName(x.player.name, x.player.position, x.player.team)}</span>
        <span className={ui.sub}>{meta(x)}</span>
        {why ? <span className={ui.sub}>{why}</span> : null}
      </span>
      <span className={ui.trail}>
        <span className={ui.value}>{right.b}</span>
        <span className={ui.valueSub}>{right.small}</span>
      </span>
    </button>
  );

  /** A roster row that opens to his read: the summary is the row, the read sits under it. */
  const openRow = (x: ReturnType<typeof read>) => {
    const actual = scored(x);
    return (
      <ExpandRow
        key={`${x.slot}-${x.id}`}
        lead={<Face id={x.id} team={x.player.team} size={40} defense={x.player.position === 'DEF'} />}
        label={slotOf(x)}
        title={shortName(x.player.name, x.player.position, x.player.team)}
        sub={meta(x)}
        value={actual != null ? pts(actual) : '\u2013'}
        valueSub={`Proj ${pts(x.outlook.adjusted)}`}
      >
        <PlayerRead
          id={x.id}
          name={x.player.name}
          position={x.player.position}
          team={x.player.team ?? null}
          outlook={x.outlook}
          role={roleOf(x.id, x.player.position)}
          ctx={ctx}
          props={props[x.id] ?? []}
          usage={recentUsage(x.id)}
        />
      </ExpandRow>
    );
  };

  return (
    <Shell data={data} active="">
      <SectionHead icon="person" word="my team" week={data.week} mine={data.myRoster} back={{ href: '/lab/app/account', label: 'Account' }} />

      <Hero
        href={opp && game ? '/lab/app/matchup' : undefined}
        label={`Week ${week} Projected`}
        state={<span className={ui.label}>{status}</span>}
        sides={[{ avatar: team?.avatarUrl, color: team?.colors?.primary, team: team?.teamName.trim() ?? '', manager: managerOf(rosterId), score: pts(total) }]}
        foot={opp && game ? `vs ${oppTeam?.teamName.trim() ?? opp.team} · ${managerOf(opp.rosterId)}` : 'No matchup this week'}
      />

      {problems.length ? (
        <Section title="Fix This">
          <div className={ui.list}>{problems.map((p) => row(p, why(p), { b: pts(p.outlook.adjusted), small: 'Proj' }))}</div>
          <div className={ui.card}>
            <a href={sleeperLink('lineup')} target="_blank" rel="noopener noreferrer" className={`${ui.pill} ${ui.pillSecondary} ${t.start}`}>
              Open Sleeper
            </a>
          </div>
        </Section>
      ) : null}

      {upgrades.length ? (
        <Section title="Worth a Swap" label="Worth a swap, 3 or more projected points">
          <div className={ui.list}>
            {upgrades.slice(0, 4).map((u) =>
              row(u.bench, null, {
                b: `+${u.gain.toFixed(1)}`,
                small: `Proj ${pts(u.bench.outlook.adjusted)}`,
              }),
            )}
          </div>
          <div className={ui.card}>
            <CopyMove
              label="Copy swaps"
              text={upgrades
                .slice(0, 4)
                .map((u) => `Start ${shortName(u.bench.player.name, u.bench.player.position, u.bench.player.team)} over ${shortName(u.starter.player.name, u.starter.player.position, u.starter.player.team)} at ${u.starter.slot}`)
                .join('. ')}
            />
          </div>
        </Section>
      ) : null}

      {starters.length ? (
        <>
          <Section title="Starters">
            <div className={ui.list}>{starters.map((x) => openRow(x))}</div>
          </Section>
          {bench.length ? (
            <Section title={`Bench · ${bench.length}`}>
              <div className={ui.list}>{bench.map((x) => openRow(x))}</div>
            </Section>
          ) : null}
          {reserve.length ? (
            <Section title={`Injured Reserve · ${reserve.length}`}>
              <div className={ui.list}>{reserve.map((x) => openRow(x))}</div>
            </Section>
          ) : null}
        </>
      ) : (
        <Section title="Roster">
          <Empty>Sleeper did not return this lineup.</Empty>
        </Section>
      )}

      <Section title="Your Moves">
        {moves.length ? (
          <div className={ui.list}>
            {moves.slice(0, 8).map((e) => (
              <button key={e.id} type="button" data-player={e.playerId} className={`${ui.row} ${t.reset}`}>
                <Tag tone={moveMarkTone(e.kind)}>{MOVE_MARK[e.kind]}</Tag>
                <span className={ui.body}>
                  <span className={ui.title}>{moveLine(e)}</span>
                  <span className={ui.sub}>{timing(e.at)}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Empty>No moves yet this season.</Empty>
        )}
      </Section>
    </Shell>
  );
}
