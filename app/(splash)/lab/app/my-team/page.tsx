import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getWeekGames, league, playerOf, STARTER_SLOTS, teamByRoster } from '@/lib/league';
import { movementFor, timing, type MovementEvent } from '@/lib/movement';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { outlookFor } from '@/lib/outlook';
import { getWeekProjections } from '@/lib/projections';
import { getRosters } from '@/lib/sleeper';
import { sleeperLink } from '@/lib/sleeper-links';
import { scoredThisWeek } from '../../../kit/PlayerRow';
import { bookFrom } from '../../../lib/odds-books';
import { weekLines } from '../../../swami/week-lines';
import { getV4Data } from '../data';
import Shell from '../Shell';
import XHead from '../modules/Head';
import { managerOf, MOVE_MARK, moveMarkClass, shortName } from '../modules/shared';
import m from '../modules/modules.module.css';
import s from '../v4.module.css';
import t from './mine.module.css';

export const metadata: Metadata = { title: { absolute: 'My Team, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const pts = (n: number) => n.toFixed(2);
/** Anything in the lineup that should not be. */
const SITTING = new Set(['Out', 'Doubtful', 'IR', 'Sus', 'PUP', 'NA', 'DNR']);
const FLEX = new Set(['RB', 'WR', 'TE']);
/** Injury tags as Sleeper prints them. */
const INJ: Record<string, string> = { Questionable: 'Q', Doubtful: 'D', Out: 'OUT', Sus: 'SUS' };

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
        <XHead icon="person" word="my team" week={data.week} mine={null} />
        <p className={s.empty}>
          Pick your team to see your lineup, what is wrong with it and your moves. <Link href="/lab/app/account">Account</Link>
        </p>
      </Shell>
    );
  }

  const week = league.state.week;
  const team = teamByRoster(rosterId);
  const [rosters, projections, moves, games, ctx] = await Promise.all([
    getRosters().catch(() => []),
    getWeekProjections(league.state.season, week).catch(() => ({}) as Record<string, number>),
    movementFor(rosterId, 12).catch(() => [] as MovementEvent[]),
    getWeekGames(week).catch(() => []),
    weekLines(league.state.season, week, undefined, bookFrom(jar)),
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

  const row = (x: ReturnType<typeof read>, sub?: string, right?: { b: string; small: string }) => {
    const actual = scoredThisWeek(x.player.team ? ctx.byTeam.get(x.player.team)?.game.state : null, ctx.actual[x.id]?.points);
    const opp = x.outlook.matchup;
    const meta = !x.player.team ? 'Free agent' : opp ? `${opp.home ? 'vs' : '@'} ${opp.opponent}` : 'No game';
    return (
      <button key={`${x.slot}-${x.id}`} type="button" data-player={x.id} className={`${s.prow} ${t.row}`} aria-label={`${x.player.name}, open player`}>
        <span className={t.slot}>{x.slot === 'SUPER_FLEX' ? 'SF' : x.slot}</span>
        <span className={m.shot}>
          <img src={x.player.headshot} alt="" loading="lazy" />
        </span>
        <span className={s.prowName}>
          <b>{shortName(x.player.name, x.player.position, x.player.team)}</b>
          <small>
            <i className={`${s.pos} ${s[`p${x.player.position}`] ?? ''}`}>{x.player.position}</i>
            {x.player.team ?? ''} &middot; {meta}
            {x.player.injuryStatus ? <i className={`${m.mk} ${m.mkBad} ${t.inj}`}>{INJ[x.player.injuryStatus] ?? x.player.injuryStatus.toUpperCase()}</i> : null}
          </small>
          {sub ? <span className={t.sub}>{sub}</span> : null}
        </span>
        <span className={s.prowPts}>
          <b>{right ? right.b : actual != null ? pts(actual) : '–'}</b>
          <small>{right ? right.small : `Proj ${pts(x.outlook.adjusted)}`}</small>
        </span>
      </button>
    );
  };

  return (
    <Shell data={data} active="">
      <XHead icon="person" word="my team" week={data.week} mine={data.myRoster} />

      <section className={t.hero} aria-label="Projected">
        <div className={t.heroTop}>
          <span>Week {week} Projected</span>
          <Link href="/lab/app/account">Change team</Link>
        </div>
        <div className={t.heroRow}>
          <span className={s.who}>
            <b>{team?.teamName.trim()}</b>
            <small>{managerOf(rosterId)}</small>
          </span>
          <span className={t.total}>{pts(total)}</span>
        </div>
        {opp && game ? (
          <Link href={`/lab/app/matchup`} className={t.vs}>
            vs <b>{oppTeam?.teamName.trim() ?? opp.team}</b> &middot; {managerOf(opp.rosterId)}
          </Link>
        ) : (
          <span className={t.vs}>No matchup this week</span>
        )}
        <span className={t.status}>{status}</span>
      </section>

      {problems.length ? (
        <>
          <div className={s.title}>
            <h2>Fix This</h2>
            <a href={sleeperLink('lineup')} target="_blank" rel="noopener noreferrer">
              Lineup in Sleeper
            </a>
          </div>
          <div className={s.list}>{problems.map((p) => row(p, why(p), { b: pts(p.outlook.adjusted), small: 'Proj' }))}</div>
        </>
      ) : null}

      {upgrades.length ? (
        <>
          <div className={s.title}>
            <h2>Worth a Swap</h2>
            <span className={s.wk}>3+ projected points</span>
          </div>
          <div className={s.list}>
            {upgrades.slice(0, 4).map((u) =>
              row(u.bench, `Replaces ${shortName(u.starter.player.name, u.starter.player.position, u.starter.player.team)} at ${u.starter.slot}`, {
                b: `+${u.gain.toFixed(1)}`,
                small: `Proj ${pts(u.bench.outlook.adjusted)}`,
              }),
            )}
            <a className={t.go} href={sleeperLink('lineup')} target="_blank" rel="noopener noreferrer">
              Make the swap in Sleeper
            </a>
          </div>
        </>
      ) : null}

      <div className={s.title}>
        <h2>Roster</h2>
        <Link href="/lab/app/swami">Swami</Link>
      </div>
      {starters.length ? (
        <div className={s.list}>
          <h3 className={t.subH}>Starters</h3>
          {starters.map((x) => row(x))}
          {bench.length ? <h3 className={t.subH}>Bench &middot; {bench.length}</h3> : null}
          {bench.map((x) => row(x))}
          {reserve.length ? <h3 className={t.subH}>Injured Reserve &middot; {reserve.length}</h3> : null}
          {reserve.map((x) => row(x))}
        </div>
      ) : (
        <p className={s.empty}>Sleeper did not return this lineup.</p>
      )}

      <div className={s.title}>
        <h2>Your Moves</h2>
      </div>
      {moves.length ? (
        <ul className={s.list} style={{ margin: 0, listStyle: 'none' }}>
          {moves.slice(0, 8).map((e) => (
            <li key={e.id} className={m.post}>
              <i className={moveMarkClass(e.kind)}>{MOVE_MARK[e.kind]}</i>
              <button type="button" data-player={e.playerId} className={`${m.postText} ${m.pBtn}`}>
                <b>{moveLine(e)}</b>
                <small>{timing(e.at)}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.empty}>No moves yet this season.</p>
      )}
    </Shell>
  );
}
