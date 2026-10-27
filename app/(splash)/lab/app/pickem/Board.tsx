'use client';

import { useEffect, useState } from 'react';
import { Avatar, Empty, Label, ui } from '../ui';
import { PinField } from '../ui/blocks/Field';
import p from '../ui/blocks/Pick.module.css';

export type BoardTeam = { rosterId: number; team: string; manager: string; avatar: string | null; color: string };
export type BoardGame = { matchupId: number; a: BoardTeam; b: BoardTeam; winner: number | null };

const keyOf = (rosterId: number) => `splash4.pickem.${rosterId}`;
const readToken = (rosterId: number) => {
  try {
    return localStorage.getItem(keyOf(rosterId));
  } catch {
    return null;
  }
};

/**
 * The picking side of Pick'em, on this device. Before the lock: your PIN
 * once, then tap a team in each game; every tap saves. After the lock the
 * same rows show how the league picked, with your pick marked and, once
 * decided, the winner heavy and the loser gray.
 */
export default function Board({ week, mine, games, locked, decided, all, teams }: { week: number; mine: number | null; games: BoardGame[]; locked: boolean; decided: boolean; all: { roster_id: number; matchup_id: number; pick: number }[] | null; teams: Record<number, BoardTeam> }) {
  const [token, setToken] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [pin, setPin] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // This team's own picks, whichever phone made them.
  const loadOwn = (t: string) =>
    fetch(`/api/lab/pickem?week=${week}`, { headers: { 'x-pickem-token': t } })
      .then((r) => r.json())
      .then((d: { rosterId: number | null; picks: { matchup_id: number; pick: number }[] }) => {
        if (d.rosterId !== mine) {
          // The PIN changed or the token is stale: ask again.
          setToken(null);
          return;
        }
        setPicks(Object.fromEntries(d.picks.map((x) => [x.matchup_id, x.pick])));
      })
      .catch(() => undefined);

  useEffect(() => {
    if (mine == null) return;
    const t = readToken(mine);
    if (!t) return;
    setToken(t);
    void loadOwn(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, week]);

  // After the lock, your picks come from everyone's.
  const shown: Record<number, number> = all && mine != null ? Object.fromEntries(all.filter((r) => r.roster_id === mine).map((r) => [r.matchup_id, r.pick])) : picks;

  const claim = async () => {
    if (mine == null || !/^\d{4}$/.test(pin)) return setNote('Four digits.');
    setBusy(true);
    const res = await fetch('/api/lab/pickem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'claim', rosterId: mine, pin }) }).catch(() => null);
    const d = res ? ((await res.json().catch(() => null)) as { token?: string; error?: string } | null) : null;
    setBusy(false);
    if (!d?.token) return setNote(d?.error ?? 'Could not reach Pick’em. Try again.');
    try {
      localStorage.setItem(keyOf(mine), d.token);
    } catch {
      // Without storage the PIN is asked again next visit.
    }
    setToken(d.token);
    setPin('');
    setNote(null);
    void loadOwn(d.token);
  };

  const pick = async (matchupId: number, rosterId: number) => {
    if (!token || locked) return;
    const before = picks[matchupId];
    setPicks((x) => ({ ...x, [matchupId]: rosterId }));
    const res = await fetch('/api/lab/pickem', { method: 'POST', headers: { 'content-type': 'application/json', 'x-pickem-token': token }, body: JSON.stringify({ action: 'pick', week, matchupId, pick: rosterId }) }).catch(() => null);
    if (!res?.ok) {
      const d = res ? ((await res.json().catch(() => null)) as { error?: string } | null) : null;
      setPicks((x) => ({ ...x, [matchupId]: before }));
      setNote(d?.error ?? 'Could not save. Try again.');
    }
  };

  if (!games.length) return <Empty>No league games posted for week {week} yet.</Empty>;

  const count = Object.keys(shown).length;
  return (
    <div className={ui.card}>
      {!locked && mine != null && !token ? (
        <div className={p.gate}>
          <PinField label="Your team PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(e) => e.key === 'Enter' && claim()} />
          <button type="button" className={`${ui.pill} ${ui.pillSecondary}`} onClick={claim} disabled={busy}>
            {busy ? 'Checking' : 'Start picking'}
          </button>
          <span className={ui.sub}>Your first pick sets it. Keep it to yourself: it&rsquo;s what stops anyone picking as you.</span>
        </div>
      ) : null}
      {note ? (
        <p className={ui.sub} role="status">
          {note}
        </p>
      ) : null}
      {!locked && token ? <Label>{count === games.length ? `All ${games.length} picked` : `${count} of ${games.length} picked`}</Label> : null}
      <div>
        {games.map((g) => {
          const yours = shown[g.matchupId];
          const pickers = (side: number) => (all ?? []).filter((r) => r.matchup_id === g.matchupId && r.pick === side).map((r) => teams[r.roster_id]).filter(Boolean);
          return (
            <div key={g.matchupId} className={p.game}>
              <div className={p.sides}>
                {[g.a, g.b].map((t) => {
                  const on = yours === t.rosterId;
                  const result = decided && g.winner != null ? (g.winner === t.rosterId ? p.won : p.lost) : '';
                  return locked ? (
                    <div key={t.rosterId} className={`${p.side} ${on ? p.on : ''}`}>
                      <Avatar src={t.avatar} color={t.color} size={28} />
                      <span className={p.result}>
                        <span className={`${p.name} ${result}`}>{t.team}</span>
                        <span className={p.faces} aria-label={`${pickers(t.rosterId).length} picked ${t.team}`}>
                          {pickers(t.rosterId).map((x) => (
                            <Avatar key={x.rosterId} src={x.avatar} color={x.color} size={26} />
                          ))}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <button key={t.rosterId} type="button" className={`${p.side} ${on ? p.on : ''}`} aria-pressed={on} disabled={!token} onClick={() => pick(g.matchupId, t.rosterId)}>
                      <Avatar src={t.avatar} color={t.color} size={28} />
                      <span className={p.name}>{t.team}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
