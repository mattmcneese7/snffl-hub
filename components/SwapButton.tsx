'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { hasToken, updateStarters } from '@/lib/sleeper-write';

/**
 * Make the change, or hand off to the one screen where it is made.
 *
 * The app already knows the bench player is worth more than the starter. The
 * next thing it should do is close the gap between knowing and doing, in as
 * few taps as possible.
 *
 * For almost everyone that is the deep link: Sleeper's login enforces a
 * captcha that cannot be solved from our origin (docs/DECISIONS.md), so the
 * in app write only works on a device that did the desktop token step once,
 * which in practice is nobody but Matt. So the default, honest action is a
 * clean handoff that lands on the exact lineup screen for this week, one tap
 * away from the swap. The direct write is the bonus for a connected device,
 * not the thing a dead end "Connect" button dangles in front of a phone that
 * can never use it.
 */
export default function SwapButton({
  leagueId,
  rosterId,
  starters,
  /** Index in the starters array being replaced. */
  slotIndex,
  playerId,
  playerName,
  deepLink,
}: {
  leagueId: string;
  rosterId: number;
  starters: string[];
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

  if (done) return <span className="snffl-swap-done">Started {playerName}</span>;

  // The deep link, and by default the whole control. It lands on this week's
  // lineup screen, so the swap is the next tap. This is what a phone sees,
  // because a phone cannot connect.
  const handoff = (
    <a className="snffl-swap" href={deepLink} target="_blank" rel="noopener noreferrer">
      {failed ? 'Set it in Sleeper' : `Start ${playerName} in Sleeper`}
      <span className="snffl-swap-arrow" aria-hidden> &#8599;</span>
    </a>
  );

  // Only a connected device gets the one tap write, and even then a failure
  // drops straight back to the handoff rather than stranding the manager.
  if (!connected || failed) return handoff;

  return (
    <button
      type="button"
      className="snffl-swap"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          // The array is positional and replaces the lineup wholesale, so the
          // full list goes back with one element changed. Sending only the
          // change would field a team of one.
          const next = [...starters];
          next[slotIndex] = playerId;
          await updateStarters(leagueId, rosterId, next);
          setDone(true);
          // The page is a server component reading Sleeper, so a refresh is
          // what makes the rest of it agree with what just happened.
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
