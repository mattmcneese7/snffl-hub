'use client';

import { useEffect, useRef, useState } from 'react';
import s from './v4.module.css';

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
};

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const logo = (team: string) => `https://a.espncdn.com/i/teamlogos/nfl/500/${team === 'WAS' ? 'wsh' : team.toLowerCase()}.png`;

/** The box score line, as Sleeper prints it. */
function boxLine(pos: string, l: Record<string, number>): string {
  const out: string[] = [];
  const n = (k: string) => l[k] ?? 0;
  if (pos === 'QB' && n('pass_att')) out.push(`${n('pass_cmp')}/${n('pass_att')} CMP`, `${n('pass_yd')} YD`, ...(n('pass_td') ? [`${n('pass_td')} TD`] : []), ...(n('pass_int') ? [`${n('pass_int')} INT`] : []));
  if (n('rush_att')) out.push(`${n('rush_att')} CAR`, `${n('rush_yd')} YD`, ...(n('rush_td') ? [`${n('rush_td')} TD`] : []));
  if (n('rec_tgt') || n('rec')) out.push(`${n('rec')}/${n('rec_tgt')} REC`, `${n('rec_yd')} YD`, ...(n('rec_td') ? [`${n('rec_td')} TD`] : []));
  if (pos === 'K') out.push(`${n('fgm')}/${n('fga')} FG`, `${n('xpm')}/${n('xpa')} XP`);
  return out.join(', ');
}

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
            {next ? (
              <div className={s.shBlock}>
                <small>Week {next.week} &middot; {next.opp}</small>
                <span className={s.shBig}>
                  <b>{(next.proj ?? 0).toFixed(2)}</b>
                  <span>Proj</span>
                </span>
              </div>
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
            <a className={s.shLink} href={`/players/${data.id}`}>
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
