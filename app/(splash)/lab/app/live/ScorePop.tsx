'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveSnapshot } from './Live';
import { ui } from '../ui';
import s from '../ui/blocks/ScoreBar.module.css';

type Starter = { id: string; name: string };
type Pop = { key: number; id: string; name: string; team: string; gain: number; what: string | null; clock: string | null };

const SHOW_MS = 3500;

/**
 * The play pop-up (Step 3): when a starter in your matchup scores, a card
 * pops out of the score bar for about 3.5 s while the numbers roll. It says
 * who and how much at once, then fills in the play itself (what, and the
 * game clock) from ESPN's play-by-play. One at a time, oldest first; tap it
 * for the player. Screen readers already hear the change from the bar.
 */
export default function ScorePop({ week, sides }: { week: number; sides: { team: string; starters: Starter[] }[] }) {
  const live = useLiveSnapshot();
  const prev = useRef<Record<string, number> | null>(null);
  const queue = useRef<Pop[]>([]);
  const [pop, setPop] = useState<Pop | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (live.week !== week) return;
    const was = prev.current;
    prev.current = { ...live.players };
    if (!was) return;
    for (const side of sides) {
      for (const st of side.starters) {
        const now = live.players[st.id];
        const before = was[st.id];
        if (now == null || before == null || now <= before) continue;
        queue.current.push({ key: ++seq.current, id: st.id, name: st.name, team: side.team, gain: Number((now - before).toFixed(2)), what: null, clock: null });
      }
    }
    if (!pop && queue.current.length) setPop(queue.current.shift()!);
  }, [live, week, sides, pop]);

  useEffect(() => {
    if (!pop) return;
    let on = true;
    fetch(`/api/lab/play?id=${encodeURIComponent(pop.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p: { what: string; clock: string } | null) => on && p && setPop((cur) => (cur && cur.key === pop.key ? { ...cur, what: p.what, clock: p.clock } : cur)))
      .catch(() => undefined);
    const t = window.setTimeout(() => setPop(queue.current.shift() ?? null), SHOW_MS);
    return () => {
      on = false;
      window.clearTimeout(t);
    };
    // Only a new pop restarts the clock; its play filling in does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pop?.key]);

  if (!pop) return null;
  return (
    <button key={pop.key} type="button" data-player={pop.id} className={s.pop} aria-label={`${pop.name}, open player`}>
      <span className={ui.label}>
        {pop.team} &middot; +{pop.gain.toFixed(2)}
      </span>
      <span className={ui.title}>{pop.what ?? pop.name}</span>
      {pop.clock ? <span className={ui.sub}>{pop.clock}</span> : null}
    </button>
  );
}
