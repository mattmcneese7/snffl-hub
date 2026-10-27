'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ui } from '../ui';
import f from '../feed/feed.module.css';

export type FeedTab = 'all' | 'clips' | 'league';
const TABS: [FeedTab, string][] = [
  ['all', 'All'],
  ['clips', 'NFL Clips'],
  ['league', 'League'],
];

/**
 * The Feed's type toggle. Children mark what they belong to with
 * data-show="all clips league"; the toggle hides the rest, so each clip
 * player stays mounted once and nothing renders twice. The last choice is
 * remembered on this device.
 */
export default function FeedTabs({ id, children }: { id: string; children: ReactNode }) {
  const [tab, setTab] = useState<FeedTab>('all');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`splash4.feedtab.${id}`) as FeedTab | null;
      if (saved && TABS.some(([k]) => k === saved)) setTab(saved);
    } catch {
      // No storage: start on All.
    }
  }, [id]);
  const pick = (k: FeedTab) => {
    setTab(k);
    try {
      localStorage.setItem(`splash4.feedtab.${id}`, k);
    } catch {
      // Not remembered this time.
    }
  };
  return (
    <div className={f.tabs} data-tab={tab}>
      <div className={ui.seg} role="tablist" aria-label="Feed type">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`${ui.segBtn} ${tab === k ? ui.segOn : ''}`} onClick={() => pick(k)}>
            {label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
