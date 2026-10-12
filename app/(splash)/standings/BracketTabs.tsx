'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { BracketGame, BracketRound, BracketSide } from '@/lib/postseason';
import s from './standings.module.css';

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

/** 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th. */
function ordinal(n: number) {
  const tail = n % 100;
  if (tail >= 11 && tail <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

/**
 * A bracket a round at a time, the way v2 reads it: a 14 team bracket does
 * not fit a phone sideways. Tabs for the rounds, then each game as a small
 * card with its seeds, its byes and whether it is on or done.
 *
 * Sleeper names an unfilled slot by match number ("Winner of 3"), which
 * means nothing to a reader, so the slot names the game it comes from
 * instead, by the managers in it.
 */
export default function BracketTabs({
  rounds,
  byes = [],
  mine,
  names,
  kind,
  empty,
}: {
  rounds: BracketRound[];
  byes?: number[];
  mine: number | null;
  /** Roster id to first name. */
  names: Record<number, string>;
  /** The winners bracket, or the Shart Bowl (the losers bracket). */
  kind: 'winners' | 'shart';
  empty: string;
}) {
  const liveRound = rounds.findIndex((r) => r.games.some((g) => g.status === 'live'));
  const lastPlayed = rounds.map((r) => r.games.some((g) => g.status === 'final')).lastIndexOf(true);
  const [active, setActive] = useState(Math.max(0, liveRound >= 0 ? liveRound : lastPlayed));

  if (!rounds.length) return <p className={s.note}>{empty}</p>;

  const byId = new Map<number, BracketGame>();
  for (const r of rounds) for (const g of r.games) byId.set(g.matchId, g);
  const nameOf = (id: number | null) => (id != null ? (names[id] ?? '') : '');

  const describe = (match: number): string => {
    const g = byId.get(match);
    if (!g) return `game ${match}`;
    const a = nameOf(g.home.rosterId);
    const b = nameOf(g.away.rosterId);
    if (a && b) return `${a} v ${b}`;
    if (a || b) return `${a || b}’s game`;
    return `game ${match}`;
  };
  const slot = (side: BracketSide) => {
    const m = side.from?.match(/^(Winner|Loser) of (\d+)$/);
    if (m) return `${m[1]} of ${describe(Number(m[2]))}`;
    return side.from ?? 'To be decided';
  };
  const label = (g: BracketGame, roundName: string) => {
    if (kind === 'shart') return g.placement === 1 ? 'Shart Bowl final' : roundName;
    if (g.placement === 1) return 'Championship';
    if (g.placement) return `${ordinal(g.placement)} place game`;
    return roundName;
  };

  const round = rounds[Math.min(active, rounds.length - 1)];

  return (
    <div className={s.bracket}>
      <div className={s.tabs} role="group" aria-label="Round">
        {rounds.map((r, i) => (
          <button
            key={r.round}
            type="button"
            className={`${s.tab} ${i === active ? s.tabOn : ''}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            {r.name}
          </button>
        ))}
      </div>

      <ul className={s.games}>
        {round.games.map((g) => (
          <li key={g.matchId} className={s.bGame}>
            <div className={s.bHead}>
              <span className={s.bLabel}>{label(g, round.name)}</span>
              {g.status === 'live' ? (
                <span className={s.bLive}>
                  <svg viewBox="0 0 64 64" aria-hidden>
                    <path d={DROP} />
                  </svg>
                  Live
                </span>
              ) : g.status === 'final' ? (
                <span className={s.bFinal}>Final</span>
              ) : null}
            </div>
            {[g.home, g.away].map((side, i) => {
              const known = side.rosterId != null;
              const bye = known && byes.includes(side.rosterId as number);
              const cls = `${s.bSide} ${side.won ? s.bWon : ''} ${known && side.rosterId === mine ? s.bMine : ''}`;
              const body = (
                <>
                  <span className={s.bSeed}>{side.seed ?? ''}</span>
                  <span className={s.bTeam}>
                    <span className={s.bName}>{known ? side.team : slot(side)}</span>
                    {known ? <span className={s.bWho}>{nameOf(side.rosterId) || side.manager}</span> : null}
                  </span>
                  {bye ? <span className={s.bye}>Bye</span> : null}
                </>
              );
              return known ? (
                <Link key={i} href={`/managers/${side.rosterId}`} className={cls}>
                  {body}
                </Link>
              ) : (
                <div key={i} className={`${cls} ${s.bOpen}`}>
                  {body}
                </div>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
