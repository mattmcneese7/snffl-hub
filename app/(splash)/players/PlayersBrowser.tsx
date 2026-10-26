'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { nflTeamName } from '../kit/nflTeams';
import Widget, { WidgetHead } from '../home/Widget';
import w from '../home/widgets.module.css';
import home from '../home/home.module.css';
import p from './players.module.css';

/**
 * The players browser: search, six sorts, three filters and the free agent
 * switch, fifty rows at a time. Every sort key arrives worked out by the
 * server, so this only arranges; it never reads a stat file of its own.
 */
export type PlayerRow = {
  id: string;
  name: string;
  position: string;
  nflTeam: string;
  headshot: string;
  injury: string | null;
  ownerRosterId: number | null;
  ownerName: string | null;
  points: number;
  projected: number | null;
  posRank: number | null;
  yards: number;
  touchdowns: number;
  snapPct: number;
};

type Owner = { rosterId: number; name: string };
type SortKey = 'points' | 'projected' | 'posRank' | 'yards' | 'touchdowns' | 'snapPct';

const PAGE = 50;
const SORTS: SortKey[] = ['points', 'projected', 'posRank', 'yards', 'touchdowns', 'snapPct'];

const label = (k: SortKey, week: number) =>
  ({
    points: 'Season points',
    projected: `Projected, week ${week}`,
    posRank: 'Position rank',
    yards: 'Total yards',
    touchdowns: 'Touchdowns',
    snapPct: 'Snap share',
  })[k];

/** The sorted figure as it reads on the row, with its unit under it. */
function figure(row: PlayerRow, k: SortKey): { value: string; unit: string } {
  switch (k) {
    case 'points':
      return { value: row.points.toFixed(2), unit: 'points' };
    case 'projected':
      return { value: row.projected == null ? '' : row.projected.toFixed(2), unit: 'projected' };
    case 'posRank':
      return { value: row.posRank == null ? '' : `${row.position}${row.posRank}`, unit: 'position rank' };
    case 'yards':
      return { value: row.yards.toLocaleString('en-US'), unit: 'yards' };
    case 'touchdowns':
      return { value: String(row.touchdowns), unit: row.touchdowns === 1 ? 'touchdown' : 'touchdowns' };
    case 'snapPct':
      return { value: `${row.snapPct}%`, unit: 'snap share' };
  }
}

export default function PlayersBrowser({
  rows,
  owners,
  nflTeams,
  upcomingWeek,
  ownershipComplete,
  mine,
}: {
  rows: PlayerRow[];
  owners: Owner[];
  nflTeams: string[];
  upcomingWeek: number;
  ownershipComplete: boolean;
  mine: number | null;
}) {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('all');
  const [nflTeam, setNflTeam] = useState('all');
  const [owner, setOwner] = useState('all');
  const [sort, setSort] = useState<SortKey>('points');
  const [includeFreeAgents, setIncludeFreeAgents] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const positions = useMemo(() => [...new Set(rows.map((r) => r.position).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (!includeFreeAgents && r.ownerRosterId == null) return false;
      if (position !== 'all' && r.position !== position) return false;
      if (nflTeam !== 'all' && r.nflTeam !== nflTeam) return false;
      if (owner === 'free' && r.ownerRosterId != null) return false;
      if (owner !== 'all' && owner !== 'free' && String(r.ownerRosterId) !== owner) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
    out.sort((a, b) => {
      // Rank counts up, 1 is best. Everything else counts down. A missing
      // figure sorts last rather than sorting as a zero.
      if (sort === 'posRank') {
        if (a.posRank == null && b.posRank == null) return 0;
        if (a.posRank == null) return 1;
        if (b.posRank == null) return -1;
        return a.posRank - b.posRank;
      }
      const av = a[sort];
      const bv = b[sort];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
    return out;
  }, [rows, search, position, nflTeam, owner, sort, includeFreeAgents]);

  const shown = filtered.slice(0, limit);
  // Any change to what is asked for starts the list again from the top.
  const reset = (apply: () => void) => {
    apply();
    setLimit(PAGE);
  };

  return (
    <div className={w.grid}>
      <Widget size="m" icon="binoculars" title="Find a player">
        <div className={p.controls}>
          <label className={p.searchWrap}>
            <span className={p.srOnly}>Search players</span>
            <input
              className={p.search}
              type="search"
              value={search}
              placeholder="Player name"
              autoComplete="off"
              onChange={(e) => reset(() => setSearch(e.target.value))}
            />
          </label>

          <div className={p.field}>
            <span className={w.subHead}>Sort by</span>
            <div className={`${p.sorts} ${w.inRail}`} role="group" aria-label="Sort by">
              {SORTS.map((k) => (
                <button key={k} type="button" className={`${p.sort} ${sort === k ? p.sortOn : ''}`} aria-pressed={sort === k} onClick={() => reset(() => setSort(k))}>
                  {label(k, upcomingWeek)}
                </button>
              ))}
            </div>
          </div>

          <div className={p.selects}>
            <label className={p.field}>
              <span className={w.subHead}>Position</span>
              <select className={p.select} value={position} onChange={(e) => reset(() => setPosition(e.target.value))}>
                <option value="all">All</option>
                {positions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className={p.field}>
              <span className={w.subHead}>NFL team</span>
              <select className={p.select} value={nflTeam} onChange={(e) => reset(() => setNflTeam(e.target.value))}>
                <option value="all">All</option>
                {nflTeams.map((v) => (
                  <option key={v} value={v}>
                    {nflTeamName(v)}
                  </option>
                ))}
              </select>
            </label>
            <label className={p.field}>
              <span className={w.subHead}>Manager</span>
              <select
                className={p.select}
                value={owner}
                onChange={(e) =>
                  reset(() => {
                    const next = e.target.value;
                    setOwner(next);
                    // Asking for free agents while hiding them would show nobody.
                    if (next === 'free') setIncludeFreeAgents(true);
                  })
                }
              >
                <option value="all">Everyone</option>
                <option value="free">Free agents</option>
                {owners.map((o) => (
                  <option key={o.rosterId} value={String(o.rosterId)}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={p.toggle}>
            <input type="checkbox" checked={includeFreeAgents} onChange={(e) => reset(() => setIncludeFreeAgents(e.target.checked))} />
            <span className={p.switch} aria-hidden />
            <span>Include free agents</span>
          </label>

          {!ownershipComplete ? (
            <p className={p.notice}>
              Sleeper didn&rsquo;t answer. Ownership shows starters only, so bench players may read as free agents until the next refresh.
            </p>
          ) : null}
        </div>
      </Widget>

      <Widget size="l">
        <WidgetHead
          icon="jersey"
          title={label(sort, upcomingWeek)}
          aside={
            <span className={`${w.sub} ${w.num}`}>
              Showing {shown.length} of {filtered.length}
            </span>
          }
        />
        {shown.length ? (
          <ul className={w.list}>
            {shown.map((r) => {
              const f = figure(r, sort);
              return (
                <li key={r.id} className={mine != null && r.ownerRosterId === mine ? w.mineRow : undefined}>
                  <Link href={`/players/${r.id}`} className={p.row}>
                    <span className={p.face}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.headshot} alt="" loading="lazy" />
                    </span>
                    <span className={p.text}>
                      <span className={p.name}>{r.name}</span>
                      <span className={p.meta}>
                        {[r.position, r.position === 'DEF' ? null : nflTeamName(r.nflTeam), r.ownerName ?? 'free agent'].filter(Boolean).join(', ')}
                        {r.injury ? <span className={p.inj}>{r.injury}</span> : null}
                      </span>
                    </span>
                    <span className={p.fig}>
                      {/* Nothing to show is shown as nothing, not "None". */}
                      {f.value ? (
                        <>
                          <b>{f.value}</b>
                          <span>{f.unit}</span>
                        </>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={w.empty}>Nobody matches. Loosen a filter.</p>
        )}
        {shown.length < filtered.length ? (
          <div className={p.moreRow}>
            <button type="button" className={`${home.pillBtn} ${home.pillSmall} ${p.moreBtn}`} onClick={() => setLimit(limit + PAGE)}>
              Show {Math.min(PAGE, filtered.length - shown.length)} more
            </button>
          </div>
        ) : null}
      </Widget>
    </div>
  );
}
