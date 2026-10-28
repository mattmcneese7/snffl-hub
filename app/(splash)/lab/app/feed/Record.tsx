'use client';

import { useMemo, useState } from 'react';
import { applyFilter, byDay, EMPTY_FILTER, type Facet, type Facets, type FeedFilter, type FeedItem } from '@/lib/feed-view';
import { MomentRow, type NameEntry } from './Rows';
import { Label, ui } from '../ui';
import f from './feed.module.css';

/**
 * History: the full record, folded behind one button because it is a
 * reference, not a feed. Open, it filters by what, who and when, each chip
 * counting what it holds; a row with one option is not drawn. Rows fall into days.
 */
export default function Record({ items, facets, names, now, mine }: { items: FeedItem[]; facets: Facets; names: NameEntry[]; now: number; mine: string | null }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>(EMPTY_FILTER);
  const shown = useMemo(() => applyFilter(items, filter), [items, filter]);
  const days = useMemo(() => byDay(shown, new Date(now)), [shown, now]);

  return (
    <>
      <div className={ui.card}>
        <button type="button" className={`${ui.pill} ${ui.pillSecondary}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide history' : `Show all ${items.length} ${items.length === 1 ? 'moment' : 'moments'}`}
        </button>
        {open ? (
          <div className={f.filters}>
            <Chips label="What" facets={facets.kinds} active={filter.kind} onPick={(kind) => setFilter((x) => ({ ...x, kind }))} />
            <Chips label="Who" facets={facets.managers} active={filter.manager} onPick={(manager) => setFilter((x) => ({ ...x, manager }))} />
            <Chips label="When" facets={facets.weeks} active={filter.week} onPick={(week) => setFilter((x) => ({ ...x, week }))} />
          </div>
        ) : null}
      </div>
      {open ? (
        shown.length ? (
          days.map((day) => (
            <section key={day.key} className={f.pane}>
              <h3 className={`${ui.label} ${f.day}`}>
                <span>{day.label}</span>
                <span>{day.items.length}</span>
              </h3>
              <ol className={`${ui.list} ${f.ol}`}>
                {day.items.map((item) => (
                  <MomentRow key={`${item.kind}-${item.id}`} item={item} names={names} now={now} mine={mine != null && item.managerIds.includes(mine)} />
                ))}
              </ol>
            </section>
          ))
        ) : (
          <div className={ui.empty}>
            <p className={ui.bodyText}>Nothing matches these filters.</p>
            <button type="button" className={`${ui.pill} ${ui.pillSecondary}`} onClick={() => setFilter(EMPTY_FILTER)}>
              Clear filters
            </button>
          </div>
        )
      ) : null}
    </>
  );
}

function Chips({ label, facets, active, onPick }: { label: string; facets: Facet[]; active: string | null; onPick: (value: string | null) => void }) {
  if (facets.length < 2) return null;
  return (
    <div className={f.pane}>
      <Label>{label}</Label>
      <div className={ui.rail} role="group" aria-label={label}>
        <button type="button" className={`${ui.chip} ${active === null ? ui.chipOn : ''}`} aria-pressed={active === null} onClick={() => onPick(null)}>
          All
        </button>
        {facets.map((facet) => (
          <button
            key={facet.value}
            type="button"
            className={`${ui.chip} ${active === facet.value ? ui.chipOn : ''}`}
            aria-pressed={active === facet.value}
            onClick={() => onPick(active === facet.value ? null : facet.value)}
          >
            {facet.label} {facet.count}
          </button>
        ))}
      </div>
    </div>
  );
}
