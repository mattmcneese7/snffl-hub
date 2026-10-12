'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import styles from './home.module.css';
import { SLEEPER_MARK } from '../kit/sleeperMark';
import { gameStatus } from '../kit/gameStatus';

/**
 * The ticker, reworked after v2's: two lanes, each labelled with its source's
 * own logo (Sleeper for the league, the NFL shield for the NFL), each drifting
 * at its own pace with no box around it, fading out at both edges.
 *
 *   League   every game this week; the score that is ahead bold in deep blue,
 *            a live game marked with the league's drop
 *   NFL      the real slate from ESPN, team logos, the clock or the result
 *
 * A touch on a lane stops it and hands it to the finger; with reduced motion
 * both lanes stand still and simply scroll.
 */

export type LeagueGame = { id: number; away: string; awayPts: number; home: string; homePts: number; live: boolean };
export type NflLine = {
  id: string;
  away: string;
  awayLogo: string | null;
  awayScore: number | null;
  home: string;
  homeLogo: string | null;
  homeScore: number | null;
  status: string;
  live: boolean;
};

function Drop() {
  return (
    <svg viewBox="0 0 64 64" className={styles.laneDrop} aria-hidden>
      <path d="M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z" />
    </svg>
  );
}

const LOGO = {
  league: SLEEPER_MARK,
  nfl: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
};

function Lane({ label, tone, secs, children }: { label: string; tone: 'league' | 'nfl'; secs: number; children: ReactNode }) {
  const [held, setHeld] = useState(false);
  return (
    <div className={styles.lane}>
      <span className={styles.laneLabel}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO[tone]} alt="" className={`${styles.laneLogo} ${tone === 'league' ? styles.laneRound : ''}`} />
        <span className={styles.hidden}>{label}</span>
      </span>
      <div className={`${styles.laneTrack} ${held ? styles.held : ''}`} onPointerDown={() => setHeld(true)}>
        <div className={styles.laneRun} style={{ '--secs': `${secs}s` } as CSSProperties}>
          {children}
          <span className={styles.laneCopy} aria-hidden>
            {children}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Lanes({ league, nfl }: { league: LeagueGame[]; nfl: NflLine[] }) {
  return (
    <div className={styles.lanes}>
      {league.length ? (
        <Lane label="League" tone="league" secs={Math.max(30, league.length * 8)}>
          {league.map((g) => {
            const awayUp = g.awayPts >= g.homePts;
            return (
              <span key={g.id} className={styles.laneItem}>
                {g.live ? <Drop /> : null}
                <span className={styles.laneTeam}>{g.away}</span>
                <b className={awayUp ? styles.up : styles.down}>{g.awayPts.toFixed(2)}</b>
                <b className={awayUp ? styles.down : styles.up}>{g.homePts.toFixed(2)}</b>
                <span className={styles.laneTeam}>{g.home}</span>
              </span>
            );
          })}
        </Lane>
      ) : null}
      {nfl.length ? (
        <Lane label="NFL" tone="nfl" secs={Math.max(26, nfl.length * 5)}>
          {nfl.map((g) => {
            const awayUp = (g.awayScore ?? 0) >= (g.homeScore ?? 0);
            return (
              <span key={g.id} className={styles.laneItem}>
                {g.live ? <Drop /> : null}
                {g.awayLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.awayLogo} alt="" className={styles.logo} />
                ) : null}
                <span className={styles.abbr}>{g.away}</span>
                {g.awayScore != null ? <b className={awayUp ? styles.up : styles.down}>{g.awayScore}</b> : null}
                {g.homeScore != null ? <b className={awayUp ? styles.down : styles.up}>{g.homeScore}</b> : null}
                <span className={styles.abbr}>{g.home}</span>
                {g.homeLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.homeLogo} alt="" className={styles.logo} />
                ) : null}
                <span className={styles.clock}>{gameStatus(g.status)}</span>
              </span>
            );
          })}
        </Lane>
      ) : null}
    </div>
  );
}
