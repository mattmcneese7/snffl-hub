import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { firstNameOf } from '@/config/managers';
import { allPlayers, league, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { outlookFor, roleOf } from '@/lib/outlook';
import { getWeekProjections } from '@/lib/projections';
import { getRosters, TEAM_LOGO } from '@/lib/sleeper';
import { dvpConfidence, POSITIONS, spine, type Pos } from '@/lib/spine';
import Shell from '../kit/Shell';
import PageHead from '../kit/PageHead';
import k from '../kit/kit.module.css';
import Widget, { WidgetHead } from '../home/Widget';
import Squirt from '../home/Squirt';
import w from '../home/widgets.module.css';
import s from './swami.module.css';
import { playerWeek, weekLines } from './week-lines';
import PlayerRow, { PlayerDeep, PlayerMeta, weekLine } from '../kit/PlayerRow';
import { readSleeperProps } from '../lib/sleeper-props';
import { recentUsage } from '../lib/deep/nflverse';
import { bookFrom, mainBook } from '../lib/odds-books';
import Trade from './Trade';
import Waivers from './Waivers';
import { keepMoves } from './moves-query';

export const metadata: Metadata = { title: { absolute: 'The Swami, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * The research bench, in Splash. Every player the league can reach, with the
 * projection on this league's rules, the range he could land in, the defense
 * he is walking into, and the usage that says whether the projection is a
 * role or a fluke. The same reads and the same 60 player cut as v2.
 *
 * Filters run through the URL, as in v2, so a filtered view is a link a
 * manager can paste into the group chat. Your own players are washed in
 * powder, which is why this reads the team cookie.
 */

type Search = { pos?: string; own?: string; dpos?: string };

const OWNERSHIP = [
  { key: 'all', label: 'Everyone' },
  { key: 'rostered', label: 'Rostered' },
  { key: 'free', label: 'Free agents' },
] as const;

const pts = (n: number) => n.toFixed(2);


export default async function SwamiPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const pos = (POSITIONS as readonly string[]).includes(params.pos ?? '') ? (params.pos as Pos) : null;
  const own = OWNERSHIP.some((o) => o.key === params.own) ? params.own! : 'all';
  const week = league.state.week;
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);

  const [projections, rosters, ctx, props] = await Promise.all([
    getWeekProjections(league.state.season, week),
    getRosters().catch(() => []),
    weekLines(league.state.season, week, undefined, bookFrom(jar)),
    readSleeperProps(),
  ]);

  // Named for the lines rows actually show: none once a game is final.
  const showing = new Set([...ctx.byTeam.values()].filter((tg) => tg.game.state !== 'post').map((tg) => tg.game.id));
  const lineBook = mainBook(Object.entries(ctx.lines).filter(([id]) => showing.has(id)).map(([, l]) => l));

  /** Who owns whom, so a free agent can be told from a starter. */
  const ownerOf = new Map<string, number>();
  for (const roster of rosters) {
    for (const id of roster.players ?? []) ownerOf.set(id, roster.roster_id);
  }

  const rows = allPlayers()
    .filter((player) => !pos || player.position === pos)
    .filter((player) => {
      if (own === 'rostered') return ownerOf.has(player.id);
      if (own === 'free') return !ownerOf.has(player.id);
      return true;
    })
    .map((player) => {
      const base = projections[player.id] ?? 0;
      return {
        player,
        owner: ownerOf.get(player.id) ?? null,
        outlook: outlookFor(player.id, player.position, player.team, base, week),
        role: roleOf(player.id, player.position),
      };
    })
    // Somebody projected for nothing is not research, he is the rest of the
    // player database.
    .filter((row) => row.outlook.adjusted > 0 || row.outlook.usage)
    .sort((a, b) => b.outlook.adjusted - a.outlook.adjusted)
    .slice(0, 60);

  // One scale for every bar, so ranges compare down the list.
  const top = Math.max(1, ...rows.map((r) => r.outlook.ceiling));
  const at = (n: number) => `${Math.min(100, Math.max(0, (n / top) * 100))}%`;

  // The defense table for whichever position is being looked at. Receivers by
  // default, because that is the position a lineup has most of.
  // The widget picks its own position (dpos); without one it follows the
  // page's filter, receivers when that is All or Defense.
  const DEF_GRID = POSITIONS.filter((p) => p !== 'DEF');
  const dpos = (DEF_GRID as readonly string[]).includes(params.dpos ?? '') ? (params.dpos as Pos) : null;
  const grid = dpos ?? (pos && pos !== 'DEF' ? pos : 'WR');
  const defenses = Object.entries(spine.dvp)
    .filter(([, byPos]) => byPos[grid])
    .map(([team, byPos]) => ({ team, entry: byPos[grid]! }))
    .sort((a, b) => a.entry.rank - b.entry.rank);

  const href = (next: Partial<Search>) => {
    // The trade and waiver widgets' state rides along, so a filter never resets them.
    const q = keepMoves(params);
    const p = next.pos ?? pos ?? '';
    const o = next.own ?? own;
    const d = next.dpos ?? dpos ?? '';
    if (p) q.set('pos', p);
    if (o !== 'all') q.set('own', o);
    if (d) q.set('dpos', d);
    const qs = q.toString();
    return qs ? `/swami?${qs}` : '/swami';
  };

  const posPills = [{ key: '', label: 'All' }, ...POSITIONS.map((p) => ({ key: p, label: p }))];

  return (
    <Shell active="swami">
      <PageHead title="The Swami" collapse />

      <div className={w.grid}>
        <Trade query={params} mine={mine} />
        <Waivers query={params} mine={mine} />

        <Widget size="m">
          <WidgetHead icon="binoculars" title="Players" aside={<span className={w.sub}>{rows.length} shown</span>} />
          {/* The filters belong to the list they filter. */}
          <div className={s.filters}>
            <nav className={k.weeks} aria-label="Position">
              {posPills.map((p) => {
                const on = (pos ?? '') === p.key;
                return (
                  <Link key={p.label} href={href({ pos: p.key })} scroll={false} className={`${k.week} ${on ? k.weekOn : ''}`} aria-current={on ? 'page' : undefined}>
                    {p.label}
                  </Link>
                );
              })}
            </nav>
            <nav className={k.weeks} aria-label="Ownership">
              {OWNERSHIP.map((o) => {
                const on = own === o.key;
                return (
                  <Link key={o.key} href={href({ own: o.key })} scroll={false} className={`${k.week} ${on ? k.weekOn : ''}`} aria-current={on ? 'page' : undefined}>
                    {o.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          {rows.length ? (
            <ul className={w.list}>
              {rows.map(({ player, outlook, role, owner }) => {
                const team = owner ? teamByRoster(owner) : null;
                const ownerName = team ? (firstNameOf(team.rosterId) ?? team.manager) : null;
                const m = outlook.matchup;
                const pw = playerWeek(ctx, player.id, player.position, player.team);
                return (
                  <li key={player.id} className={owner != null && owner === mine ? w.mineRow : undefined}>
                    <PlayerRow
                      id={player.id}
                      name={player.name}
                      headshot={player.headshot}
                      meta={<PlayerMeta position={player.position} team={player.team} />}
                      sub={
                        <>
                          {ownerName ? <span className={s.owner}>{ownerName}</span> : <span className={s.free}>FA</span>}
                          <span>, {weekLine(m, player.team)}</span>
                        </>
                      }
                      value={pts(outlook.adjusted)}
                      projected
                    >
                      <PlayerDeep
                        outlook={outlook}
                        role={role}
                        pw={pw}
                        props={props[player.id] ?? []}
                        usage={recentUsage(player.id)}
                        position={player.position}
                        scaleTop={top}
                      />
                    </PlayerRow>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={s.emptyState}>
              <Squirt mood="sleep" size={48} />
              <p className={w.empty}>Nobody matches that.</p>
            </div>
          )}
          <p className={s.note}>
            Range: model 10th to 90th percentile, else the position&rsquo;s measured spread. Sources: Sleeper,
            {lineBook ? ` ${lineBook},` : ''} DraftSharks, Squirt.
          </p>
        </Widget>

        <Widget size="m">
          <WidgetHead
            icon="ranking"
            title={
              <>
                Defenses vs<span className={w.openOnly}> {grid}</span>
              </>
            } aside={<span className={w.sub}>Through W{spine.throughWeek}</span>} />
          <nav className={`${k.weeks} ${s.inCard}`} aria-label="Defenses against">
            {DEF_GRID.map((p) => {
              const on = grid === p;
              return (
                <Link key={p} href={href({ dpos: p })} scroll={false} className={`${k.week} ${on ? k.weekOn : ''}`} aria-current={on ? 'true' : undefined}>
                  {p}
                </Link>
              );
            })}
          </nav>
          {defenses.length ? (
            <div className={s.dvp}>
              {defenses.map(({ team, entry }) => (
                <span key={team} className={s.def}>
                  <span className={s.defTop}>
                    <span className={s.defRank}>{entry.rank}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={TEAM_LOGO(team)} alt="" className={s.logo} />
                    <span className={s.defTeam}>{team}</span>
                  </span>
                  <span className={s.defPts}>{pts(entry.adjusted)}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className={w.empty}>No defense numbers yet</p>
          )}
          <p className={s.note}>Points per game allowed to {grid}s, shrunk toward the league average. 1 allows the most.</p>
          {dvpConfidence() === 'thin' ? (
            <p className={s.caveat}>
              Shrunk hard toward the league average, because {spine.throughWeek} games isn&rsquo;t a read on a defense. The
              raw spread is wider than this and less honest.
            </p>
          ) : null}
        </Widget>
      </div>
    </Shell>
  );
}
