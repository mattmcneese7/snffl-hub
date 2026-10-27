'use client';

import { useEffect, useRef, useState } from 'react';
import { boxLine } from './boxLine';
import type { PlayerWeek } from './playerData';
import s from './v4.module.css';
import q from './players/p4.module.css';

type Data = {
  id: string;
  name: string;
  position: string;
  team: string | null;
  headshot: string;
  espnId: string | null;
  number: number | null;
  bio: string[];
  injury: string | null;
  owner: { team: string; manager: string; starts: number; points: number } | null;
  season: { points: number; games: number; ppg: number; snapPct: number | null };
  rostered: number | null;
  started: number | null;
  log: { week: number; opp: string; pts: number | null; proj: number | null; line: Record<string, number> }[];
  week: PlayerWeek | null;
};
const TONE = { soft: q.good, even: q.neutral, hard: q.bad } as const;
const LABEL = { soft: 'Soft', even: 'Even', hard: 'Hard' } as const;

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const logo = (team: string) => `https://a.espncdn.com/i/teamlogos/nfl/500/${team === 'WAS' ? 'wsh' : team.toLowerCase()}.png`;

/**
 * The player sheet. Any element with data-player opens it, so server pages
 * only mark their rows; the sheet fetches the rest. It rises from the bottom
 * on the glide curve and closes on the scrim, the close button or Escape.
 */
export default function PlayerSheet() {
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-player]');
      if (!el) return;
      e.preventDefault();
      setData(null);
      setId(el.dataset.player!);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setId(null);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let live = true;
    fetch(`/api/lab/player?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setData(d))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !sheet.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sheet.current.animate([{ transform: 'translate(-50%, 100%)' }, { transform: 'translate(-50%, 0)' }], { duration: 460, easing: EASE });
  }, [id]);

  if (!id) return null;
  const last = data?.log.filter((l) => l.pts != null).at(-1);
  const next = data?.log.find((l) => l.pts == null && l.opp !== 'BYE');
  const tc = 'var(--deep)';
  return (
    <>
      <div className={s.scrim} onClick={() => setId(null)} aria-hidden />
      <div ref={sheet} className={s.sheet} role="dialog" aria-modal="true" aria-label={data?.name ?? 'Player'}>
        <div className={s.grab} />
        <div className={s.shHead} style={{ ['--tc' as string]: tc }}>
          {data?.team ? <img className={s.shLogo} src={logo(data.team)} alt="" /> : null}
          {data ? <img className={s.shCut} src={data.espnId ? `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${data.espnId}.png&w=350&h=254` : data.headshot} alt="" /> : null}
          <div className={s.shWho}>
            <b>{data?.name ?? 'Loading'}</b>
            {data ? (
              <span>
                <i className={`${s.pos} ${s[`p${data.position}`] ?? ''}`}>{data.position}</i> {data.team ?? 'Free agent'}
                {data.number != null ? ` #${data.number}` : ''}
                {data.injury ? ` · ${data.injury}` : ''}
              </span>
            ) : null}
          </div>
          <button type="button" className={s.shClose} onClick={() => setId(null)} aria-label="Close">
            &times;
          </button>
        </div>
        {data ? (
          <>
            <div className={s.shBlock}>
              <small>In this league</small>
              {data.owner ? (
                <span>
                  <b style={{ color: 'var(--ink)' }}>{data.owner.team}</b> &middot; {data.owner.manager} &middot; {data.owner.starts} starts &middot; {data.owner.points.toFixed(2)} pts for them
                </span>
              ) : (
                <span>Free agent</span>
              )}
            </div>
            {last ? (
              <div className={s.shBlock}>
                <small>Week {last.week} &middot; {last.opp}</small>
                <span className={s.shBig}>
                  <b>{last.pts!.toFixed(2)}</b>
                  <span>Proj {(last.proj ?? 0).toFixed(2)}</span>
                </span>
                <span>{boxLine(data.position, last.line)}</span>
              </div>
            ) : null}
            {data.week?.game && data.week.game.state !== 'post' ? (
              <div className={s.shBlock}>
                <small>
                  Week {data.week.week}
                  {` \u00b7 ${data.week.game.home ? 'vs' : '@'} ${data.week.game.opp} \u00b7 ${data.week.game.state === 'pre' ? 'Proj' : data.week.game.status}`}
                </small>
                <span className={s.shBig}>
                  <b>{data.week.outlook.adjusted.toFixed(2)}</b>
                  <span>
                    Range {data.week.outlook.floor.toFixed(1)} to {data.week.outlook.ceiling.toFixed(1)}
                  </span>
                </span>
                {data.week.outlook.matchup ? (
                  <span className={q.chips}>
                    <span className={`${q.chip} ${TONE[data.week.outlook.matchup.label]}`}>
                      Matchup <b>{LABEL[data.week.outlook.matchup.label]}</b>
                    </span>
                    {data.week.cells
                      .filter((c) => ['Implied total', 'Spread', 'Total', 'Moneyline'].includes(c.label))
                      .map((c) => (
                        <span key={c.label} className={q.chip}>
                          {c.label} <b>{c.value}</b>
                        </span>
                      ))}
                  </span>
                ) : null}
              </div>
            ) : next ? (
              <div className={s.shBlock}>
                <small>Week {next.week} &middot; {next.opp}</small>
                <span className={s.shBig}>
                  <b>{(next.proj ?? 0).toFixed(2)}</b>
                  <span>Proj</span>
                </span>
              </div>
            ) : null}
            {data.week?.news[0] ? (
              <a className={s.shBlock} href={data.week.news[0].url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <small>Latest news</small>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{data.week.news[0].headline}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{data.week.news[0].source}</span>
              </a>
            ) : null}
            <div className={s.shBlock}>
              <small>Season</small>
              <div className={s.shGrid}>
                <span>
                  <b>{data.season.ppg.toFixed(2)}</b>PPG
                </span>
                <span>
                  <b>{data.season.snapPct != null ? `${data.season.snapPct}%` : '–'}</b>Snaps
                </span>
                <span>
                  <b>{data.rostered != null ? `${Math.round(data.rostered)}%` : '–'}</b>Rostered
                </span>
                <span>
                  <b>{data.started != null ? `${Math.round(data.started)}%` : '–'}</b>Started
                </span>
              </div>
            </div>
            <div className={s.shBlock}>
              <small>Game log</small>
              <table className={s.shLog}>
                <thead>
                  <tr>
                    <th>Wk</th>
                    <th>Opp</th>
                    <th>Pts</th>
                    <th>Proj</th>
                  </tr>
                </thead>
                <tbody>
                  {data.log.map((l) => (
                    <tr key={l.week}>
                      <td>{l.week}</td>
                      <td>{l.opp}</td>
                      <td style={{ fontWeight: 800 }}>{l.pts != null ? l.pts.toFixed(2) : l.opp === 'BYE' ? '' : '–'}</td>
                      <td>{l.proj != null ? l.proj.toFixed(2) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.bio.length ? (
              <div className={s.shBlock}>
                <small>Bio</small>
                <span>{data.bio.join(' · ')}</span>
              </div>
            ) : null}
            <a className={s.shLink} href={`/lab/app/players/${data.id}`}>
              Full profile
            </a>
          </>
        ) : (
          <div className={s.shBlock}>
            <span>Loading</span>
          </div>
        )}
      </div>
    </>
  );
}
