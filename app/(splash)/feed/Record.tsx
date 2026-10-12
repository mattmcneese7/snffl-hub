'use client';

import { useMemo, useState } from 'react';
import { applyFilter, byDay, EMPTY_FILTER, type Facet, type Facets, type FeedFilter, type FeedItem } from '@/lib/feed-view';
import Squirt from '../home/Squirt';
import { MomentRow, type NameEntry } from './Rows';
import w from '../home/widgets.module.css';
import f from './feed.module.css';

/**
 * The full record, folded away behind one button: it is a reference, not a
 * feed. Open, it filters by what, who and when, each chip counting what it
 * holds, and a row with only one option is never drawn because one option is
 * not a choice. The rows fall into days, so a weekend reads as a weekend.
 */
export default function Record({
  items,
  facets,
  names,
  now,
  mine,
}: {
  items: FeedItem[];
  facets: Facets;
  names: NameEntry[];
  /** The server's clock at render, so the times match the HTML it sent. */
  now: number;
  /** Your roster id as text, for the powder wash on your moments. */
  mine: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>(EMPTY_FILTER);
  const shown = useMemo(() => applyFilter(items, filter), [items, filter]);
  const days = useMemo(() => byDay(shown, new Date(now)), [shown, now]);

  return (
    <>
      <button type="button" className={f.toggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide the full record' : `The full record, ${items.length} ${items.length === 1 ? 'moment' : 'moments'}`}
      </button>

      {open ? (
        <div className={f.record}>
          <div className={f.filters}>
            <Chips label="What" facets={facets.kinds} active={filter.kind} onPick={(kind) => setFilter((x) => ({ ...x, kind }))} />
            <Chips label="Who" facets={facets.managers} active={filter.manager} onPick={(manager) => setFilter((x) => ({ ...x, manager }))} />
            <Chips label="When" facets={facets.weeks} active={filter.week} onPick={(week) => setFilter((x) => ({ ...x, week }))} />
          </div>

          {shown.length ? (
            days.map((day) => (
              <section key={day.key} className={f.day}>
                <h3 className={f.dayHead}>
                  <span className={w.subHead}>{day.label}</span>
                  <span className={f.dayCount}>{day.items.length}</span>
                </h3>
                <ol className={w.list}>
                  {day.items.map((item) => (
                    <MomentRow key={`${item.kind}-${item.id}`} item={item} names={names} now={now} mine={mine != null && item.managerIds.includes(mine)} />
                  ))}
                </ol>
              </section>
            ))
          ) : (
            <div className={f.nothing}>
              <Squirt mood="calm" size={44} />
              <span>
                <b>Nothing matches</b>
                <button type="button" className={f.clear} onClick={() => setFilter(EMPTY_FILTER)}>
                  Clear filters
                </button>
              </span>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

function Chips({
  label,
  facets,
  active,
  onPick,
}: {
  label: string;
  facets: Facet[];
  active: string | null;
  onPick: (value: string | null) => void;
}) {
  if (facets.length < 2) return null;
  return (
    <div className={f.filterRow}>
      <span className={w.subHead}>{label}</span>
      <div className={`${f.chips} ${w.inRail}`}>
        <button type="button" className={`${f.fchip} ${active === null ? f.fchipOn : ''}`} aria-pressed={active === null} onClick={() => onPick(null)}>
          All
        </button>
        {facets.map((facet) => (
          <button
            key={facet.value}
            type="button"
            className={`${f.fchip} ${active === facet.value ? f.fchipOn : ''}`}
            aria-pressed={active === facet.value}
            onClick={() => onPick(active === facet.value ? null : facet.value)}
          >
            {facet.label}
            <span className={f.count}>{facet.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
