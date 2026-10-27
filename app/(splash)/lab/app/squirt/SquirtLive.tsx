'use client';

import { useEffect, useRef } from 'react';
import { useLiveSnapshot } from '../live/Live';
import { moodFor, tellSquirt } from './bus';

/**
 * The score bar's line to Squirt: your matchup's points, live where the
 * poller has them, set his mood. A lead changing hands is a flinch first.
 */
export default function SquirtLive({ week, state, me, them, base }: { week: number; state: 'final' | 'preview' | 'live'; me: number; them: number; base: [number, number] }) {
  const snap = useLiveSnapshot();
  const live = snap.week === week;
  const a = live ? (snap.teams[me] ?? base[0]) : base[0];
  const b = live ? (snap.teams[them] ?? base[1]) : base[1];
  const lead = useRef<number | null>(null);

  useEffect(() => {
    const hour = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false });
    const late = Number(hour) >= 23 || Number(hour) < 6;
    const sign = Math.sign(a - b);
    if (state === 'live' && lead.current != null && sign !== 0 && sign !== lead.current) tellSquirt({ kind: 'moment', moment: 'flinch' });
    if (sign !== 0) lead.current = sign;
    tellSquirt({ kind: 'mood', mood: moodFor(state, a, b, late && state !== 'live') });
  }, [a, b, state]);

  return null;
}
