'use client';

import { useEffect, useRef, useState } from 'react';
import type { CheckClip } from '../../lib/embed-clips';
import { autoplayVars, loadYouTube, STATE, YT_HOST, type YTPlayer } from '../../lib/yt-player';
import c from './check.module.css';

type Outcome = 'waiting' | 'testing' | 'ok' | 'error' | 'timeout';
type Result = CheckClip & { outcome: Outcome; code: number | null; lastState: number | null; ms: number | null };

type Summary = { channel: string; handle: string; ok: number; failed: number; tested: number; codes: number[] };

declare global {
  interface Window {
    videoCheck?: {
      done: boolean;
      origin: string;
      startedAt: string;
      finishedAt: string | null;
      results: Result[];
      byChannel: Summary[];
    };
  }
}

const AT_ONCE = 3;
const TIMEOUT_MS = 20000;
/** Playing for this long with the clock moving counts as playing. */
const PROOF_MS = 1500;

function summarize(results: Result[]): Summary[] {
  const by = new Map<string, Summary>();
  for (const r of results) {
    const s = by.get(r.channel) ?? { channel: r.channel, handle: r.handle, ok: 0, failed: 0, tested: 0, codes: [] };
    if (r.outcome === 'ok' || r.outcome === 'error' || r.outcome === 'timeout') s.tested++;
    if (r.outcome === 'ok') s.ok++;
    if (r.outcome === 'error' || r.outcome === 'timeout') s.failed++;
    if (r.code != null && !s.codes.includes(r.code)) s.codes.push(r.code);
    by.set(r.channel, s);
  }
  return [...by.values()];
}

/** One clip, mounted muted; resolves with what it did. */
function test(slot: HTMLElement, clip: CheckClip): Promise<Pick<Result, 'outcome' | 'code' | 'lastState' | 'ms'>> {
  return new Promise((resolve) => {
    const began = performance.now();
    let player: YTPlayer | null = null;
    let lastState: number | null = null;
    let settled = false;
    const mount = document.createElement('div');
    slot.replaceChildren(mount);

    const finish = (outcome: Outcome, code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        player?.destroy();
      } catch {
        // Already gone.
      }
      slot.replaceChildren();
      resolve({ outcome, code, lastState, ms: Math.round(performance.now() - began) });
    };
    const timer = window.setTimeout(() => finish('timeout', null), TIMEOUT_MS);

    loadYouTube()
      .then((YT) => {
        player = new YT.Player(mount, {
          host: YT_HOST,
          videoId: clip.videoId,
          width: clip.vertical ? 202 : 356,
          height: clip.vertical ? 360 : 200,
          playerVars: autoplayVars(window.location.origin),
          events: {
            onReady: (e) => {
              e.target.mute();
              e.target.playVideo();
            },
            onError: (e) => finish('error', e.data),
            onStateChange: (e) => {
              lastState = e.data;
              if (e.data === STATE.PLAYING) {
                const startedAt = e.target.getCurrentTime();
                window.setTimeout(() => {
                  try {
                    if (e.target.getCurrentTime() > startedAt) finish('ok', null);
                  } catch {
                    // The player went away; the timeout settles it.
                  }
                }, PROOF_MS);
              }
            },
          },
        });
      })
      .catch(() => finish('error', null));
  });
}

export default function Check({ clips }: { clips: CheckClip[] }) {
  const [results, setResults] = useState<Result[]>(() => clips.map((clip) => ({ ...clip, outcome: 'waiting', code: null, lastState: null, ms: null })));
  const [done, setDone] = useState(false);
  const slots = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    const current: Result[] = clips.map((clip) => ({ ...clip, outcome: 'waiting', code: null, lastState: null, ms: null }));
    const startedAt = new Date().toISOString();
    const publish = (finished: boolean) => {
      window.videoCheck = {
        done: finished,
        origin: window.location.origin,
        startedAt,
        finishedAt: finished ? new Date().toISOString() : null,
        results: current.map((r) => ({ ...r })),
        byChannel: summarize(current),
      };
      setResults(current.map((r) => ({ ...r })));
      if (finished) setDone(true);
    };
    publish(false);

    let next = 0;
    const lane = async (index: number) => {
      while (!cancelled && next < current.length) {
        const i = next++;
        const slot = slots.current[index];
        if (!slot) return;
        current[i] = { ...current[i], outcome: 'testing' };
        publish(false);
        const outcome = await test(slot, current[i]);
        if (cancelled) return;
        current[i] = { ...current[i], ...outcome };
        publish(false);
      }
    };
    Promise.all(Array.from({ length: AT_ONCE }, (_, i) => lane(i))).then(() => {
      if (!cancelled) publish(true);
    });
    return () => {
      cancelled = true;
    };
  }, [clips]);

  const summary = summarize(results);

  return (
    <>
      <p className={c.status} role="status">
        {done ? 'Done' : 'Testing'} | {results.filter((r) => r.outcome === 'ok').length} played, {results.filter((r) => r.outcome === 'error' || r.outcome === 'timeout').length} failed, {results.filter((r) => r.outcome === 'waiting' || r.outcome === 'testing').length} to go
      </p>
      <div className={c.stage} aria-hidden>
        {Array.from({ length: AT_ONCE }, (_, i) => (
          <div
            key={i}
            className={c.slot}
            ref={(el) => {
              slots.current[i] = el;
            }}
          />
        ))}
      </div>

      <h2 className={c.h2}>By channel</h2>
      <table className={c.table}>
        <thead>
          <tr>
            <th>Channel</th>
            <th>Played</th>
            <th>Failed</th>
            <th>Codes</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((s) => (
            <tr key={s.channel} className={s.tested && !s.failed ? c.good : s.failed ? c.bad : ''}>
              <td>{s.channel}</td>
              <td>{s.ok}</td>
              <td>{s.failed}</td>
              <td>{s.codes.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className={c.h2}>Every clip</h2>
      <table className={c.table}>
        <thead>
          <tr>
            <th>Channel</th>
            <th>Clip</th>
            <th>Shape</th>
            <th>API</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={`${r.channel}-${r.videoId}`} className={r.outcome === 'ok' ? c.good : r.outcome === 'error' || r.outcome === 'timeout' ? c.bad : ''}>
              <td>{r.channel}</td>
              <td>
                <a href={`https://www.youtube.com/watch?v=${r.videoId}`} target="_blank" rel="noopener noreferrer">
                  {r.title || r.videoId}
                </a>
              </td>
              <td>{r.vertical ? 'Short' : 'Wide'}</td>
              <td>{r.apiEmbeddable == null ? 'Unknown' : r.apiEmbeddable ? 'Embeddable' : 'Not embeddable'}</td>
              <td>
                {r.outcome === 'ok'
                  ? `Played (${r.ms} ms)`
                  : r.outcome === 'error'
                    ? `Error ${r.code ?? ''}`
                    : r.outcome === 'timeout'
                      ? `Timed out (state ${r.lastState ?? 'none'})`
                      : r.outcome === 'testing'
                        ? 'Testing'
                        : 'Waiting'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
