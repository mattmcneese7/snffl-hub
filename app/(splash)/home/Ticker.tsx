'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Lanes, { type LeagueGame, type NflLine } from './Lanes';
import styles from './ticker.module.css';
import { SLEEPER_MARK } from '../kit/sleeperMark';
import { gameStatus } from '../kit/gameStatus';

/**
 * Four ways to keep the scores present, none of them hung off the menu, shown
 * on the real home page so they can be judged in place:
 *
 *   1 bottom   a slim line docked to the foot of the screen, like a
 *              broadcast's scroll line
 *   2 handoff  the ticker sits in the hero; scrolled past, it shrinks into a
 *              small live pill in a corner, and the pill opens every score
 *   3 bug      no running ticker: one floating score (your game, else the
 *              closest), which opens every score
 *   4 hero     the ticker is the foot of the hero and scrolls away with it
 */

const SLEEPER = SLEEPER_MARK;
const NFL = 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png';

function Drop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z" />
    </svg>
  );
}

/** Every score, in a sheet that slides up from the bottom, League or NFL. */
function Sheet({ league, nfl, onClose }: { league: LeagueGame[]; nfl: NflLine[]; onClose: () => void }) {
  const [tab, setTab] = useState<'league' | 'nfl'>('league');
  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-label="Every score" onClick={(e) => e.stopPropagation()}>
        <span className={styles.grabber} aria-hidden />
        <div className={styles.tabs} role="tablist">
          {(['league', 'nfl'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`${styles.tab} ${tab === t ? styles.tabOn : ''}`}
              onClick={() => setTab(t)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t === 'league' ? SLEEPER : NFL} alt="" className={styles.tabLogo} />
              {t === 'league' ? 'League' : 'NFL'}
            </button>
          ))}
        </div>
        <ul className={styles.list}>
          {tab === 'league'
            ? league.map((g) => {
                const awayUp = g.awayPts >= g.homePts;
                return (
                  <li key={g.id} className={styles.row}>
                    <span className={styles.rowTeam}>
                      {g.live ? <Drop className={styles.drop} /> : null}
                      {g.away}
                    </span>
                    <b className={awayUp ? styles.up : styles.down}>{g.awayPts.toFixed(2)}</b>
                    <b className={awayUp ? styles.down : styles.up}>{g.homePts.toFixed(2)}</b>
                    <span className={`${styles.rowTeam} ${styles.end}`}>{g.home}</span>
                  </li>
                );
              })
            : nfl.map((g) => {
                const awayUp = (g.awayScore ?? 0) >= (g.homeScore ?? 0);
                return (
                  <li key={g.id} className={styles.row}>
                    <span className={styles.rowTeam}>
                      {g.live ? <Drop className={styles.drop} /> : null}
                      {g.awayLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.awayLogo} alt="" className={styles.teamLogo} />
                      ) : null}
                      {g.away}
                    </span>
                    <b className={awayUp ? styles.up : styles.down}>{g.awayScore ?? ''}</b>
                    <b className={awayUp ? styles.down : styles.up}>{g.homeScore ?? ''}</b>
                    <span className={`${styles.rowTeam} ${styles.end}`}>
                      {g.home}
                      {g.homeLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.homeLogo} alt="" className={styles.teamLogo} />
                      ) : null}
                    </span>
                    <span className={styles.clock}>{gameStatus(g.status)}</span>
                  </li>
                );
              })}
        </ul>
        <button type="button" className={styles.done} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

/* ---------- 1. The bottom line ---------- */

/** One row of the bottom line: its source's logo pinned, its scores running. */
function Row({ logo, label, shield = false, secs, children }: { logo: string; label: string; shield?: boolean; secs: number; children: React.ReactNode }) {
  const [held, setHeld] = useState(false);
  return (
    <div className={styles.bRow}>
      {/* The source, as one button: its logo and its name, in the app's own paper. */}
      <span className={styles.source}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" className={`${styles.sourceLogo} ${shield ? styles.shield : ''}`} />
        {label}
      </span>
      <div className={`${styles.bottomTrack} ${held ? styles.held : ''}`} onPointerDown={() => setHeld(true)}>
        <div className={styles.run} style={{ '--secs': `${secs}s` } as CSSProperties}>
          {children}
          <span className={styles.copy} aria-hidden>
            {children}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * The scores along the foot of the screen, both leagues at once: the league
 * on top, the NFL beneath, each row drifting at its own pace.
 */
export function BottomLine({ league, nfl }: { league: LeagueGame[]; nfl: NflLine[] }) {
  return (
    <div className={styles.bottom}>
      {league.length ? (
        <Row logo={SLEEPER} label="Sleeper" secs={Math.max(34, league.length * 8)}>
          {league.map((g) => {
            const awayUp = g.awayPts >= g.homePts;
            return (
              <span key={g.id} className={styles.item}>
                {g.live ? <Drop className={styles.drop} /> : null}
                <span className={styles.name}>{g.away}</span>
                <b className={awayUp ? styles.up : styles.down}>{g.awayPts.toFixed(2)}</b>
                <b className={awayUp ? styles.down : styles.up}>{g.homePts.toFixed(2)}</b>
                <span className={styles.name}>{g.home}</span>
              </span>
            );
          })}
        </Row>
      ) : null}
      {nfl.length ? (
        <Row logo={NFL} label="NFL" shield secs={Math.max(28, nfl.length * 5)}>
          {nfl.map((g) => {
            const awayUp = (g.awayScore ?? 0) >= (g.homeScore ?? 0);
            return (
              <span key={g.id} className={styles.item}>
                {g.live ? <Drop className={styles.drop} /> : null}
                {g.awayLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.awayLogo} alt="" className={styles.teamLogo} />
                ) : null}
                <span className={styles.abbr}>{g.away}</span>
                {g.awayScore != null ? <b className={awayUp ? styles.up : styles.down}>{g.awayScore}</b> : null}
                {g.homeScore != null ? <b className={awayUp ? styles.down : styles.up}>{g.homeScore}</b> : null}
                <span className={styles.abbr}>{g.home}</span>
                {g.homeLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.homeLogo} alt="" className={styles.teamLogo} />
                ) : null}
                <span className={styles.clock}>{gameStatus(g.status)}</span>
              </span>
            );
          })}
        </Row>
      ) : null}
    </div>
  );
}

/* ---------- 2. Hand-off ---------- */

export function HandOff({ league, nfl }: { league: LeagueGame[]; nfl: NflLine[] }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  const [open, setOpen] = useState(false);
  const live = league.filter((g) => g.live).length;

  useEffect(() => {
    const el = anchor.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < 0), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={anchor}>
        <Lanes league={league} nfl={nfl} />
      </div>
      <button
        type="button"
        className={`${styles.pill} ${styles.corner} ${gone ? styles.pillIn : ''}`}
        onClick={() => setOpen(true)}
        aria-hidden={!gone}
        tabIndex={gone ? 0 : -1}
      >
        <Drop className={styles.pillDrop} />
        {live ? `${live} live` : 'Scores'}
      </button>
      {open ? <Sheet league={league} nfl={nfl} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/* ---------- 3. The score bug ---------- */

export function ScoreBug({
  league,
  nfl,
  bug,
}: {
  league: LeagueGame[];
  nfl: NflLine[];
  bug: { label: string; away: string; awayPts: number; home: string; homePts: number; live: boolean } | null;
}) {
  const [open, setOpen] = useState(false);
  if (!bug) return null;
  const awayUp = bug.awayPts >= bug.homePts;
  return (
    <>
      <button type="button" className={`${styles.pill} ${styles.bug} ${styles.pillIn}`} onClick={() => setOpen(true)}>
        {bug.live ? <Drop className={styles.pillDrop} /> : null}
        <span className={styles.bugText}>
          <span className={styles.bugLabel}>{bug.label}</span>
          <span className={styles.bugScore}>
            <span className={styles.bugTeam}>{bug.away}</span>
            <b className={awayUp ? styles.up : styles.down}>{bug.awayPts.toFixed(2)}</b>
            <b className={awayUp ? styles.down : styles.up}>{bug.homePts.toFixed(2)}</b>
            <span className={styles.bugTeam}>{bug.home}</span>
          </span>
        </span>
      </button>
      {open ? <Sheet league={league} nfl={nfl} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
