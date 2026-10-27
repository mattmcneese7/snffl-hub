'use client';

import { useMemo, useState } from 'react';
import { injAbbr } from '../injury';
import { Card, Empty, Face, List, Rail, Row as KitRow, Section, ui as u } from '../ui';
import { SearchField, SelectField } from '../ui/blocks/Field';
import { FilterSheet } from '../ui/blocks/FilterSheet';
import { Pos } from '../ui/blocks/Pos';
import l from './layout.module.css';

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
type Show = 'rostered' | 'all' | 'free';

const PAGE = 25;
const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const SORTS: { key: SortKey; label: (week: number) => string; unit: string }[] = [
  { key: 'points', label: () => 'Points', unit: 'PTS' },
  { key: 'projected', label: (w) => `Week ${w} Proj`, unit: 'PROJ' },
  { key: 'posRank', label: () => 'Position Rank', unit: 'RANK' },
  { key: 'yards', label: () => 'Yards', unit: 'YD' },
  { key: 'touchdowns', label: () => 'Touchdowns', unit: 'TD' },
  { key: 'snapPct', label: () => 'Snap Share', unit: 'SNAPS' },
];
const SHOW: { key: Show; label: string }[] = [
  { key: 'rostered', label: 'Rostered' },
  { key: 'all', label: 'Everyone' },
  { key: 'free', label: 'Free Agents' },
];
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

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

/** A filter chip as a button, the kit chip's look. */
function ChipButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" className={cx(u.chip, on && u.chipOn)} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

/**
 * The players browser: a search and one row of position chips on screen;
 * the sort, the NFL team, the league team and who to show sit in the sheet.
 * Fifty rows at a time; a row opens the player sheet, which leads to the
 * full profile.
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
  const [show, setShow] = useState<Show>('rostered');
  const [limit, setLimit] = useState(PAGE);
  const reset = (apply: () => void) => {
    apply();
    setLimit(PAGE);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (show === 'rostered' && r.owner == null) return false;
      if (show === 'free' && r.owner != null) return false;
      if (pos !== 'All' && r.position !== pos) return false;
      if (nfl !== 'all' && r.team !== nfl) return false;
      if (owner !== 'all' && String(r.owner) !== owner) return false;
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
  }, [rows, q, pos, nfl, owner, sort, show]);
  const shown = filtered.slice(0, limit);
  const current = SORTS.find((x) => x.key === sort)!;
  const sheetOn = sort !== 'points' || nfl !== 'all' || owner !== 'all' || show !== 'rostered';

  return (
    <Section title={current.label(week)}>
      <SearchField label="Search players" value={q} placeholder="Search players" onChange={(e) => reset(() => setQ(e.target.value))} />
      <div className={l.taps}>
        <Rail label="Filters">
          {POSITIONS.map((v) => (
            <ChipButton key={v} on={pos === v} onClick={() => reset(() => setPos(v))}>
              {v}
            </ChipButton>
          ))}
          <FilterSheet id="players-more" label="More" title="Sort and Filter" on={sheetOn}>
            <Card>
              <span className={u.label}>Sort by</span>
              <div className={u.chips} role="group" aria-label="Sort by">
                {SORTS.map((x) => (
                  <ChipButton key={x.key} on={sort === x.key} onClick={() => reset(() => setSort(x.key))}>
                    {x.label(week)}
                  </ChipButton>
                ))}
              </div>
              <span className={u.label}>Show</span>
              <div className={u.seg} role="group" aria-label="Show">
                {SHOW.map((x) => (
                  <button key={x.key} type="button" className={cx(u.segBtn, show === x.key && u.segOn)} aria-pressed={show === x.key} onClick={() => reset(() => setShow(x.key))}>
                    {x.label}
                  </button>
                ))}
              </div>
              <SelectField label="NFL team" value={nfl} onChange={(e) => reset(() => setNfl(e.target.value))}>
                <option value="all">All teams</option>
                {nflTeams.map((t) => (
                  <option key={t.abbr} value={t.abbr}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="League team"
                value={owner}
                onChange={(e) =>
                  reset(() => {
                    setOwner(e.target.value);
                    // A league team's players are all rostered.
                    if (e.target.value !== 'all') setShow('all');
                  })
                }
              >
                <option value="all">Every team</option>
                {owners.map((o) => (
                  <option key={o.rosterId} value={String(o.rosterId)}>
                    {o.team}
                  </option>
                ))}
              </SelectField>
              {!complete ? <p className={`${u.sub} ${l.note}`}>Sleeper did not answer, so ownership shows starters only until the next refresh.</p> : null}
            </Card>
          </FilterSheet>
        </Rail>
      </div>
      {shown.length ? (
        <List tap>
          {shown.map((r) => {
            const f = figure(r, sort);
            const who = mine != null && r.owner === mine ? 'Your team' : (r.ownerTeam ?? 'Free agent');
            return (
              <KitRow
                key={r.id}
                data={{ player: r.id }}
                lead={<Face id={r.id} team={r.team || null} defense={r.position === 'DEF'} />}
                title={r.short}
                sub={
                  <>
                    <Pos position={r.position} />
                    {r.injury ? ` ${injAbbr(r.injury)} ·` : ''} {who}
                  </>
                }
                value={f || '–'}
                valueSub={current.unit}
              />
            );
          })}
        </List>
      ) : (
        <Empty>Nobody matches. Loosen a filter.</Empty>
      )}
      {shown.length < filtered.length ? (
        <button type="button" className={cx(u.pill, u.pillSecondary, l.more)} onClick={() => setLimit(limit + PAGE)}>
          Show {Math.min(PAGE, filtered.length - shown.length)} more
        </button>
      ) : null}
      <p className={`${u.sub} ${l.inset}`}>
        {shown.length} of {filtered.length} players
      </p>
    </Section>
  );
}
