import type { Metadata } from 'next';
import Form from 'next/form';
import { cookies } from 'next/headers';
import { allPlayers, league, teamByRoster } from '@/lib/league';
import { parseTeam, TEAM_COOKIE } from '@/lib/my-team';
import { outlookFor } from '@/lib/outlook';
import { weekProjections } from '../cached';
import { getRosters } from '@/lib/sleeper';
import { POSITIONS, type Pos as Position } from '@/lib/spine';
import { keepMoves, qv, swamiHref, type SwamiQuery } from '../../../swami/moves-query';
import { BASE, short, tabbed, weekLine, type Tab } from './parts';
import Trade from './Trade';
import Waivers from './Waivers';
import { getV4Data } from '../data';
import Shell, { SectionHead } from '../Shell';
import { Card, Chip, Empty, Face, List, Pill, Rail, Row, Section, Seg, ui as u } from '../ui';
import { SearchField } from '../ui/blocks/Field';
import { FilterSheet } from '../ui/blocks/FilterSheet';
import { Pos } from '../ui/blocks/Pos';
import w from './swami.module.css';

export const metadata: Metadata = { title: { absolute: 'Swami, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const OWN = [
  { key: 'all', label: 'Everyone' },
  { key: 'rostered', label: 'Rostered' },
  { key: 'free', label: 'Free Agents' },
] as const;
const PAGE = 25;

/** Which view: the URL's tab, else the view whose keys the URL carries. */
function tabOf(query: SwamiQuery): Tab {
  const t = qv(query, 'tab');
  if (t === 'players' || t === 'waivers' || t === 'trade') return t;
  if (qv(query, 'a') || qv(query, 'b')) return 'trade';
  if (qv(query, 'team') || qv(query, 'wpos')) return 'waivers';
  return 'players';
}

/**
 * Swami: three views under one switch. Players is this week's projections
 * on this league's rules, with a search and one row of position filters
 * (ownership sits in the sheet). Waivers ranks the pickups for a team or the
 * league; Trade checks a trade. A player row opens the player sheet.
 */
export default async function V4Swami({ searchParams }: { searchParams: Promise<SwamiQuery> }) {
  const params = await searchParams;
  const tab = tabOf(params);
  const jar = await cookies();
  const mine = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const data = await getV4Data(mine);
  const views: { key: Tab; label: string }[] = [
    { key: 'players', label: 'Players' },
    { key: 'waivers', label: 'Waivers' },
    { key: 'trade', label: 'Trade' },
  ];
  return (
    <Shell data={data} active="swami">
      <SectionHead icon="swami" word="swami" week={data.week} mine={data.myRoster} />
      <Seg label="Swami" items={views.map((v) => ({ label: v.label, href: tabbed(swamiHref(params, {}, BASE), v.key), on: v.key === tab }))} />
      {tab === 'trade' ? <Trade query={params} mine={mine} /> : tab === 'waivers' ? <Waivers query={params} mine={mine} /> : <Players params={params} mine={mine} />}
    </Shell>
  );
}

async function Players({ params, mine }: { params: SwamiQuery; mine: number | null }) {
  const posRaw = qv(params, 'pos') ?? '';
  const pos = (POSITIONS as readonly string[]).includes(posRaw) ? (posRaw as Position) : null;
  const ownRaw = qv(params, 'own');
  const own = OWN.some((o) => o.key === ownRaw) ? ownRaw! : 'all';
  const q = (qv(params, 'q') ?? '').trim().slice(0, 40);
  const asked = Number(qv(params, 'n'));
  const limit = Number.isInteger(asked) && asked > PAGE ? Math.min(asked, 100) : PAGE;
  const week = league.state.week;
  const [projections, rosters] = await Promise.all([weekProjections(league.state.season, week), getRosters().catch(() => [])]);
  const ownerOf = new Map<string, number>();
  for (const r of rosters) for (const id of r.players ?? []) ownerOf.set(id, r.roster_id);
  const needle = q.toLowerCase();
  const all = allPlayers()
    .filter((p) => !pos || p.position === pos)
    .filter((p) => (own === 'rostered' ? ownerOf.has(p.id) : own === 'free' ? !ownerOf.has(p.id) : true))
    .filter((p) => !needle || p.name.toLowerCase().includes(needle))
    .map((p) => ({ p, owner: ownerOf.get(p.id) ?? null, o: outlookFor(p.id, p.position, p.team, projections[p.id] ?? 0, week) }))
    .filter((r) => r.o.adjusted > 0)
    .sort((a, b) => b.o.adjusted - a.o.adjusted);
  const rows = all.slice(0, limit);

  // Every filter link keeps the others, the search and the trade and waiver keys.
  const href = (next: { pos?: string; own?: string; n?: number }) => {
    const s = keepMoves(params);
    const p = next.pos ?? pos ?? '';
    const o = next.own ?? own;
    if (p) s.set('pos', p);
    if (o !== 'all') s.set('own', o);
    if (q) s.set('q', q);
    if (next.n) s.set('n', String(next.n));
    s.set('tab', 'players');
    return `${BASE}?${s.toString()}`;
  };
  const keep = [...keepMoves(params).entries(), ...(pos ? [['pos', pos]] : []), ...(own !== 'all' ? [['own', own]] : [])];

  return (
    <Section title={`Week ${week} Projections`}>
      <Form action={BASE} role="search">
        <input type="hidden" name="tab" value="players" />
        {keep.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <SearchField label="Search players" name="q" defaultValue={q} placeholder="Search players" />
      </Form>
      <div className={w.taps}>
        <Rail label="Filters">
          {[{ key: '', label: 'All' }, ...POSITIONS.map((p) => ({ key: p, label: p }))].map((p) => (
            <Chip key={p.label} href={href({ pos: p.key })} on={(pos ?? '') === p.key}>
              {p.label}
            </Chip>
          ))}
          <FilterSheet id="swami-own" label={own === 'all' ? 'Everyone' : OWN.find((o) => o.key === own)!.label} title="Show">
            <Card>
              <Seg label="Ownership" items={OWN.map((o) => ({ label: o.label, href: href({ own: o.key }), on: own === o.key }))} />
            </Card>
          </FilterSheet>
        </Rail>
      </div>
      {rows.length ? (
        <List tap>
          {rows.map(({ p, owner, o }) => {
            const t = owner ? teamByRoster(owner) : null;
            return (
              <Row
                key={p.id}
                data={{ player: p.id }}
                lead={<Face id={p.id} team={p.team} defense={p.position === 'DEF'} />}
                title={short(p.name, p.position)}
                sub={
                  <>
                    <Pos position={p.position} /> {weekLine(o.matchup, p.team)} &middot; {owner != null && owner === mine ? 'Your team' : t ? t.teamName.trim() : 'Free agent'}
                  </>
                }
                value={o.adjusted.toFixed(1)}
                valueSub={`${o.floor.toFixed(1)} to ${o.ceiling.toFixed(1)}`}
              />
            );
          })}
        </List>
      ) : (
        <Empty>Nobody matches{q ? ` “${q}”` : ''}. Loosen a filter.</Empty>
      )}
      {all.length > rows.length && limit < 100 ? (
        <span className={w.more}>
          <Pill href={href({ n: Math.min(100, limit + PAGE) })} kind="secondary">
            Show {Math.min(PAGE, all.length - rows.length, 100 - limit)} more
          </Pill>
        </span>
      ) : null}
      <p className={`${u.sub} ${w.inset}`}>Proj on this league&rsquo;s rules; the range is the 10th to 90th percentile. Sources: Sleeper, DraftSharks.</p>
    </Section>
  );
}
