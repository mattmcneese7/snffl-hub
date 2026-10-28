'use client';

import { useEffect, useRef, useState } from 'react';
import { boxLine } from './boxLine';
import { useOverlayHistory } from './nav/overlay';
import type { PlayerWeek } from './playerData';
import { Ms } from './icons';
import { Stats, Tag, ui, ticketInk } from './ui';
import { Pos } from './ui/blocks/Pos';
import s from './ui/blocks/Sheet.module.css';

type Data = {
  id: string;
  name: string;
  position: string;
  team: string | null;
  /** His club's color from ESPN, for the head band. */
  color?: string | null;
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
const TONE = { soft: 'good', even: 'neutral', hard: 'bad' } as const;
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
  const dismiss = useOverlayHistory('player', id != null, () => setId(null));
  const drag = useRef<{ y: number; dy: number } | null>(null);

  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-player]');
      if (!el) return;
      e.preventDefault();
      setData(null);
      setId(el.dataset.player!);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissRef.current();
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
  return (
    <>
      <div className={s.scrim} onClick={dismiss} aria-hidden />
      <div
        ref={sheet}
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={data?.name ?? 'Player'}
        onTouchStart={(e) => {
          // Swipe down to close, only from the top of the sheet's scroll.
          if (sheet.current && sheet.current.scrollTop <= 0) drag.current = { y: e.touches[0].clientY, dy: 0 };
        }}
        onTouchMove={(e) => {
          const d = drag.current;
          if (!d || !sheet.current) return;
          d.dy = Math.max(0, e.touches[0].clientY - d.y);
          sheet.current.style.transform = `translate(-50%, ${d.dy}px)`;
        }}
        onTouchEnd={() => {
          const d = drag.current;
          drag.current = null;
          if (!d || !sheet.current) return;
          sheet.current.style.transform = '';
          if (d.dy > 90) dismiss();
        }}
      >
        <div className={s.grab} />
        {/* His club's color band, darkened like the tickets so white type clears 4.5:1. */}
        <div className={`${s.head} ${data?.color ? s.headClub : ''}`} style={data?.color ? { ['--tk' as string]: ticketInk(data.color) } : undefined}>
          {data?.team ? <img className={s.logo} src={logo(data.team)} alt="" /> : null}
          {data ? <img className={s.cut} src={data.espnId ? `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${data.espnId}.png&w=350&h=254` : data.headshot} alt="" /> : null}
          <div className={s.who}>
            <b className={ui.value}>{data?.name ?? 'Loading'}</b>
            {data ? (
              <span className={ui.sub}>
                <Pos position={data.position} /> {data.team ?? 'Free agent'}
                {data.number != null ? ` #${data.number}` : ''}
                {data.injury ? ` · ${data.injury}` : ''}
              </span>
            ) : null}
          </div>
          <button type="button" className={s.close} onClick={dismiss} aria-label="Close">
            <Ms name="close" size={20} />
          </button>
        </div>
        {data ? (
          <>
            <div className={s.block}>
              <small className={ui.label}>In this league</small>
              {data.owner ? (
                <span className={ui.sub}>
                  <b className={ui.title}>{data.owner.team}</b> &middot; {data.owner.manager} &middot; {data.owner.starts} starts &middot; {data.owner.points.toFixed(2)} pts for them
                </span>
              ) : (
                <span className={ui.sub}>Free agent</span>
              )}
            </div>
            {last ? (
              <div className={s.block}>
                <small className={ui.label}>Week {last.week} &middot; {last.opp}</small>
                <span className={s.big}>
                  <b className={ui.value}>{last.pts!.toFixed(2)}</b>
                  <span className={ui.sub}>Proj {(last.proj ?? 0).toFixed(2)}</span>
                </span>
                <span className={ui.sub}>{boxLine(data.position, last.line)}</span>
              </div>
            ) : null}
            {data.week?.game && data.week.game.state !== 'post' ? (
              <div className={s.block}>
                <small className={ui.label}>
                  Week {data.week.week}
                  {` \u00b7 ${data.week.game.home ? 'vs' : '@'} ${data.week.game.opp} \u00b7 ${data.week.game.state === 'pre' ? 'Proj' : data.week.game.status}`}
                </small>
                <span className={s.big}>
                  <b className={ui.value}>{data.week.outlook.adjusted.toFixed(2)}</b>
                  <span className={ui.sub}>
                    Range {data.week.outlook.floor.toFixed(1)} to {data.week.outlook.ceiling.toFixed(1)}
                  </span>
                </span>
                {data.week.outlook.matchup ? (
                  <span className={s.chips}>
                    <Tag tone={TONE[data.week.outlook.matchup.label]}>Matchup {LABEL[data.week.outlook.matchup.label]}</Tag>
                    {data.week.cells
                      .filter((c) => ['Implied total', 'Spread', 'Total', 'Moneyline'].includes(c.label))
                      .map((c) => (
                        <Tag key={c.label}>
                          {c.label} {c.value}
                        </Tag>
                      ))}
                  </span>
                ) : null}
              </div>
            ) : next ? (
              <div className={s.block}>
                <small className={ui.label}>Week {next.week} &middot; {next.opp}</small>
                <span className={s.big}>
                  <b className={ui.value}>{(next.proj ?? 0).toFixed(2)}</b>
                  <span className={ui.sub}>Proj</span>
                </span>
              </div>
            ) : null}
            {data.week?.news[0] ? (
              <a className={s.block} href={data.week.news[0].url} target="_blank" rel="noopener noreferrer">
                <small className={ui.label}>Latest news</small>
                <span className={ui.title}>{data.week.news[0].headline}</span>
                <span className={ui.valueSub}>{data.week.news[0].source}</span>
              </a>
            ) : null}
            <div className={s.block}>
              <small className={ui.label}>Season</small>
              <Stats
                items={[
                  { value: data.season.ppg.toFixed(2), label: 'PPG' },
                  { value: data.season.snapPct != null ? `${data.season.snapPct}%` : '–', label: 'Snaps' },
                  { value: data.rostered != null ? `${Math.round(data.rostered)}%` : '–', label: 'Rostered' },
                  { value: data.started != null ? `${Math.round(data.started)}%` : '–', label: 'Started' },
                ]}
              />
            </div>
            <div className={s.block}>
              <small className={ui.label}>Game log</small>
              <table className={s.log}>
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
                      <td>{l.pts != null ? l.pts.toFixed(2) : l.opp === 'BYE' ? '' : '–'}</td>
                      <td>{l.proj != null ? l.proj.toFixed(2) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.bio.length ? (
              <div className={s.block}>
                <small className={ui.label}>Bio</small>
                <span className={ui.sub}>{data.bio.join(' · ')}</span>
              </div>
            ) : null}
            <div className={s.foot}>
              <a className={`${ui.pill} ${ui.pillSecondary}`} href={`/players/${data.id}`}>
                Full profile
              </a>
            </div>
          </>
        ) : (
          <div className={s.block}>
            <span className={ui.sub}>Loading</span>
          </div>
        )}
      </div>
    </>
  );
}
