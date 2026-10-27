'use client';

import { useMemo, useState } from 'react';
import s from '../v4.module.css';
import p from './p4.module.css';

export type Row = {
  id: string;
  name: string;
  short: string;
  position: string;
  team: string;
  headshot: string;
  injury: string | null;
  owner: number | null;
  ownerTeam: string | null;
  points: number;
  projected: number | null;
  posRank: number | null;
  yards: number;
  touchdowns: number;
  snapPct: number;
};
type SortKey = 'points' | 'projected' | 'posRank' | 'yards' | 'touchdowns' | 'snapPct';

const PAGE = 50;
const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const SORTS: { key: SortKey; label: (week: number) => string; unit: string }[] = [
  { key: 'points', label: () => 'Points', unit: 'PTS' },
  { key: 'projected', label: (w) => `Week ${w} proj`, unit: 'PROJ' },
  { key: 'posRank', label: () => 'Position rank', unit: 'RANK' },
  { key: 'yards', label: () => 'Yards', unit: 'YD' },
  { key: 'touchdowns', label: () => 'Touchdowns', unit: 'TD' },
  { key: 'snapPct', label: () => 'Snap share', unit: 'SNAPS' },
];

function figure(r: Row, k: SortKey): string {
  switch (k) {
    case 'points':
      return r.points.toFixed(2);
    case 'projected':
      return r.projected == null ? '' : r.projected.toFixed(2);
    case 'posRank':
      return r.posRank == null ? '' : `${r.position}${r.posRank}`;
    case 'yards':
      return r.yards.toLocaleString('en-US');
    case 'touchdowns':
      return String(r.touchdowns);
    case 'snapPct':
      return `${r.snapPct}%`;
  }
}

/**
 * The players browser: search, six sorts, position chips, NFL team and
 * league team, and the free agent switch, fifty rows at a time. A row opens
 * the player sheet; the sheet leads to the full profile.
 */
export default function Browser({
  rows,
  owners,
  nflTeams,
  week,
  complete,
  mine,
}: {
  rows: Row[];
  owners: { rosterId: number; team: string }[];
  nflTeams: { abbr: string; name: string }[];
  week: number;
  complete: boolean;
  mine: number | null;
}) {
  const [q, setQ] = useState('');
  const [pos, setPos] = useState('All');
  const [nfl, setNfl] = useState('all');
  const [owner, setOwner] = useState('all');
  const [sort, setSort] = useState<SortKey>('points');
  const [free, setFree] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const reset = (apply: () => void) => {
    apply();
    setLimit(PAGE);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (!free && r.owner == null) return false;
      if (pos !== 'All' && r.position !== pos) return false;
      if (nfl !== 'all' && r.team !== nfl) return false;
      if (owner === 'free' && r.owner != null) return false;
      if (owner !== 'all' && owner !== 'free' && String(r.owner) !== owner) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
    // Rank counts up, everything else down; a missing figure sorts last.
    out.sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sort === 'posRank' ? av - bv : bv - av;
    });
    return out;
  }, [rows, q, pos, nfl, owner, sort, free]);
  const shown = filtered.slice(0, limit);
  const unit = SORTS.find((x) => x.key === sort)!.unit;

  return (
    <>
      <section className={s.card}>
        <label>
          <span className={p.srOnly}>Search players</span>
          <input className={p.search} type="search" value={q} placeholder="Search by name" autoComplete="off" onChange={(e) => reset(() => setQ(e.target.value))} />
        </label>
        <div className={p.field}>
          <span className={p.label}>Position</span>
          <div className={p.scroller} role="group" aria-label="Position">
            {POSITIONS.map((v) => (
              <button key={v} type="button" className={`${p.opt} ${pos === v ? p.optOn : ''}`} aria-pressed={pos === v} onClick={() => reset(() => setPos(v))}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className={p.field}>
          <span className={p.label}>Sort by</span>
          <div className={p.scroller} role="group" aria-label="Sort by">
            {SORTS.map((x) => (
              <button key={x.key} type="button" className={`${p.opt} ${sort === x.key ? p.optOn : ''}`} aria-pressed={sort === x.key} onClick={() => reset(() => setSort(x.key))}>
                {x.label(week)}
              </button>
            ))}
          </div>
        </div>
        <div className={p.selects}>
          <label className={p.field}>
            <span className={p.label}>NFL team</span>
            <select className={p.select} value={nfl} onChange={(e) => reset(() => setNfl(e.target.value))}>
              <option value="all">All teams</option>
              {nflTeams.map((t) => (
                <option key={t.abbr} value={t.abbr}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className={p.field}>
            <span className={p.label}>League team</span>
            <select
              className={p.select}
              value={owner}
              onChange={(e) =>
                reset(() => {
                  setOwner(e.target.value);
                  // Asking for free agents while hiding them would show nobody.
                  if (e.target.value === 'free') setFree(true);
                })
              }
            >
              <option value="all">Everyone</option>
              <option value="free">Free agents</option>
              {owners.map((o) => (
                <option key={o.rosterId} value={String(o.rosterId)}>
                  {o.team}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={p.toggle}>
          <span>Include free agents</span>
          <input type="checkbox" checked={free} onChange={(e) => reset(() => setFree(e.target.checked))} />
        </label>
        {!complete ? <p className={p.via}>Sleeper did not answer, so ownership shows starters only until the next refresh.</p> : null}
      </section>

      <div className={s.title}>
        <h2>{SORTS.find((x) => x.key === sort)!.label(week)}</h2>
        <span className={p.count}>
          {shown.length} of {filtered.length}
        </span>
      </div>
      {shown.length ? (
        <div className={s.list}>
          {shown.map((r) => {
            const f = figure(r, sort);
            return (
              <button key={r.id} type="button" data-player={r.id} className={`${p.row} ${mine != null && r.owner === mine ? p.rowMine : ''}`} aria-label={`${r.name}, open player`}>
                <span className={`${p.face} ${r.position === 'DEF' ? p.faceDef : ''}`}>
                  <img src={r.headshot} alt="" loading="lazy" />
                </span>
                <span className={p.rowName}>
                  <b>{r.short}</b>
                  <small>
                    <i className={`${s.pos} ${s[`p${r.position}`] ?? ''}`}>{r.position}</i>
                    {r.position === 'DEF' ? null : <span>{r.team || 'FA'}</span>}
                    <span>{r.ownerTeam ?? 'Free agent'}</span>
                    {r.injury ? <span className={p.inj}>{r.injury}</span> : null}
                  </small>
                </span>
                <span className={p.rowPts}>
                  <b>{f || '–'}</b>
                  <small>{unit}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className={s.empty}>Nobody matches. Loosen a filter.</p>
      )}
      {shown.length < filtered.length ? (
        <button type="button" className={p.more} onClick={() => setLimit(limit + PAGE)}>
          Show {Math.min(PAGE, filtered.length - shown.length)} more
        </button>
      ) : null}
    </>
  );
}
