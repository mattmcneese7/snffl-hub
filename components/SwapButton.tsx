'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SleeperConnect from './SleeperConnect';
import { hasToken, SleeperError, updateStarters } from '@/lib/sleeper-write';

/**
 * Make the change, from here.
 *
 * The whole point of v3 in one control: the app already knows the bench player
 * is worth four more points than the starter, so the next thing it should do
 * is offer to fix it rather than send somebody to another app to do it by
 * hand.
 *
 * Three states, and the third is the one that matters. Not connected offers
 * the connection. Connected makes the change. And a failure falls back to the
 * Sleeper link rather than leaving a dead button, because this is built on an
 * unsupported endpoint that could stop working mid season, and when it does
 * the manager still has a lineup to set.
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
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    setConnected(hasToken());
    setReady(true);
  }, []);

  if (!ready) return null;

  if (connecting) {
    return (
      <SleeperConnect
        onDone={() => {
          setConnected(hasToken());
          setConnecting(false);
        }}
      />
    );
  }

  if (done) return <span className="snffl-swap-done">Swapped</span>;

  // The endpoint is unsupported, so this is not a hypothetical branch. A
  // manager whose token expired on a Sunday morning needs the way out that
  // has always worked, not an apology.
  if (failed) {
    return (
      <a className="snffl-swap-fallback" href={deepLink} target="_blank" rel="noopener noreferrer">
        {failed} Open Sleeper &rsaquo;
      </a>
    );
  }

  if (!connected) {
    return (
      <button type="button" className="snffl-swap" onClick={() => setConnecting(true)}>
        Connect
      </button>
    );
  }

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
        } catch (error) {
          const sleeper = error as SleeperError;
          setFailed(sleeper?.unauthorized ? 'Session expired.' : 'That did not save.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Saving' : `Start ${playerName}`}
    </button>
  );
}
