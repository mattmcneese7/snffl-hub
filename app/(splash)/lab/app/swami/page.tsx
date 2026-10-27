import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { firstNameOf } from '@/config/managers';
import { allPlayers, league, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { outlookFor } from '@/lib/outlook';
import { getWeekProjections } from '@/lib/projections';
import { getRosters } from '@/lib/sleeper';
import { POSITIONS, type Pos } from '@/lib/spine';
import { weekLine } from '../../../kit/PlayerRow';
import Trade from '../../../swami/Trade';
import Waivers from '../../../swami/Waivers';
import { keepMoves, type SwamiQuery } from '../../../swami/moves-query';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import s from '../v4.module.css';

export const metadata: Metadata = { title: { absolute: 'Swami, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Search = SwamiQuery & { pos?: string; own?: string };
const OWN = [
  { key: 'all', label: 'Everyone' },
  { key: 'rostered', label: 'Rostered' },
  { key: 'free', label: 'Free agents' },
] as const;

/**
 * Swami: the trade checker and waiver picks from 3.0, then the research list,
 * every player the league can reach ranked by this week's projection on this
 * league's rules. Tap a player for the sheet.
 */
export default async function V4Swami({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const pos = (POSITIONS as readonly string[]).includes(params.pos ?? '') ? (params.pos as Pos) : null;
  const own = OWN.some((o) => o.key === params.own) ? params.own! : 'all';
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const week = league.state.week;
  const [data, projections, rosters] = await Promise.all([getV4Data(mine), getWeekProjections(league.state.season, week), getRosters().catch(() => [])]);
  const ownerOf = new Map<string, number>();
  for (const r of rosters) for (const id of r.players ?? []) ownerOf.set(id, r.roster_id);
  const rows = allPlayers()
    .filter((p) => !pos || p.position === pos)
    .filter((p) => (own === 'rostered' ? ownerOf.has(p.id) : own === 'free' ? !ownerOf.has(p.id) : true))
    .map((p) => ({ p, owner: ownerOf.get(p.id) ?? null, o: outlookFor(p.id, p.position, p.team, projections[p.id] ?? 0, week) }))
    .filter((r) => r.o.adjusted > 0)
    .sort((a, b) => b.o.adjusted - a.o.adjusted)
    .slice(0, 50);
  const href = (next: { pos?: string; own?: string }) => {
    const q = keepMoves(params);
    const p = next.pos ?? pos ?? '';
    const o = next.own ?? own;
    if (p) q.set('pos', p);
    if (o !== 'all') q.set('own', o);
    const qs = q.toString();
    return qs ? `/lab/app/swami?${qs}` : '/lab/app/swami';
  };
  return (
    <Shell data={data} active="swami">
      <SectionHead icon="swami" word="swami" week={data.week} mine={data.myRoster} />
      <div className={s.legacy}>
        <Trade query={params} mine={mine} base="/lab/app/swami" />
        <Waivers query={params} mine={mine} base="/lab/app/swami" />
      </div>
      <div className={s.title}>
        <h2>Week {week} Projections</h2>
      </div>
      <nav className={s.chips} aria-label="Position">
        {[{ key: '', label: 'All' }, ...POSITIONS.map((p) => ({ key: p, label: p }))].map((p) => (
          <Link key={p.label} href={href({ pos: p.key })} scroll={false} className={`${s.chipA} ${(pos ?? '') === p.key ? s.chipOn : ''}`}>
            {p.label}
          </Link>
        ))}
      </nav>
      <nav className={s.chips} aria-label="Ownership">
        {OWN.map((o) => (
          <Link key={o.key} href={href({ own: o.key })} scroll={false} className={`${s.chipA} ${own === o.key ? s.chipOn : ''}`}>
            {o.label}
          </Link>
        ))}
      </nav>
      <div className={s.list}>
        {rows.map(({ p, owner, o }) => {
          const t = owner ? teamByRoster(owner) : null;
          return (
            <button key={p.id} type="button" data-player={p.id} className={`${s.prow} ${owner != null && owner === mine ? s.prowMine : ''}`}>
              <span className={s.face}>
                <img src={p.headshot} alt="" />
              </span>
              <span className={s.prowName}>
                <b>{p.name}</b>
                <small>
                  <i className={`${s.pos} ${s[`p${p.position}`] ?? ''}`}>{p.position}</i>
                  <span>{p.team ?? 'FA'}</span>
                  <span>&middot; {weekLine(o.matchup, p.team)}</span>
                  <span>&middot; {t ? (firstNameOf(t.rosterId) ?? t.manager) : 'Free agent'}</span>
                </small>
              </span>
              <span className={s.prowPts}>
                <b>{o.adjusted.toFixed(2)}</b>
                <small>
                  {o.floor.toFixed(1)} to {o.ceiling.toFixed(1)}
                </small>
              </span>
            </button>
          );
        })}
      </div>
      <p className={s.note} style={{ padding: '0 4px' }}>
        Proj on this league&rsquo;s rules; range is the 10th to 90th percentile. Sources: Sleeper, DraftSharks.
      </p>
    </Shell>
  );
}
