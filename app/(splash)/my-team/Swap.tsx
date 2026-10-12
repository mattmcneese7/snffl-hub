'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { hasToken, updateStarters } from '@/lib/sleeper-write';
import home from '../home/home.module.css';
import m from './mine.module.css';

/**
 * The swap, in Pool. The same logic as v2's SwapButton, restyled so it sits
 * on a white card rather than v2's night glass.
 *
 * For almost everyone it's the handoff: a link to this league's lineup screen
 * in Sleeper, where the swap is the next tap. A device that did the desktop
 * token step gets the one tap write instead, and a failed write drops back to
 * the handoff rather than stranding anybody.
 */
export default function Swap({
  leagueId,
  rosterId,
  starters,
  slotIndex,
  playerId,
  playerName,
  deepLink,
}: {
  leagueId: string;
  rosterId: number;
  starters: string[];
  /** Index in the starters array being replaced. */
  slotIndex: number;
  playerId: string;
  playerName: string;
  deepLink: string;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setConnected(hasToken());
  }, []);

  if (done) return <span className={m.swapDone}>Started {playerName}</span>;

  const handoff = (
    <a className={home.pillBtn} href={deepLink} target="_blank" rel="noopener noreferrer">
      {failed ? 'Set it in Sleeper' : `Start ${playerName} in Sleeper`}
      <span aria-hidden>&nbsp;&#8599;</span>
    </a>
  );

  if (!connected || failed) return handoff;

  return (
    <button
      type="button"
      className={`${home.pillBtn} ${m.swapBtn}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          // The array is positional and replaces the lineup wholesale, so the
          // full list goes back with one element changed.
          const next = [...starters];
          next[slotIndex] = playerId;
          await updateStarters(leagueId, rosterId, next);
          setDone(true);
          router.refresh();
        } catch {
          setFailed(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Saving' : `Start ${playerName}`}
    </button>
  );
}
