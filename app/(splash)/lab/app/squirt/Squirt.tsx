'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AWARD_ARRIVE, AWARD_ART, AWARD_LOOPS, MOMENT_STILL, MOVES, awardClip, clip, still } from './assets';
import { hearSquirt, type Mood, type Moment } from './bus';
import s from './squirt.module.css';

/**
 * Squirt, the league's living drop. One component everywhere he appears:
 *
 *   mood     the standing state (calm, smug, sweat, gloom, sleep), looping
 *   moment   one-shot clips (win, shart, chug, crown, trophy, flinch) that
 *            play once and settle back into the mood
 *   award    a fixed pose with its prop, looping where it has a clip
 *
 * The acting is video (transparent clips, two stacked players that
 * crossfade); the reactions between clips are springs (tap wobble, squash
 * into a change). Small sizes, reduced motion and data saver get the still
 * only. Off screen, nothing plays.
 */
type Props = {
  mood?: Mood;
  award?: string;
  size?: number;
  /** Hear app-wide signals (score bar, moments). Off for decorative copies. */
  listen?: boolean;
  /** Stills only, for rows and tiles. */
  still?: boolean;
  className?: string;
  label?: string;
};

const K = 210;
const D = 14;

export default function Squirt({ mood: moodProp = 'calm', award, size = 160, listen = false, still: stillOnly = false, className, label }: Props) {
  const rig = useRef<HTMLDivElement>(null);
  const vids = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const front = useRef(0);
  const [mood, setMood] = useState<Mood>(moodProp);
  const [pose, setPose] = useState<string>(award ? AWARD_ART[award] ?? 'calm' : moodProp);
  const [lite, setLite] = useState(true);
  const visible = useRef(false);
  const spring = useRef({ sx: [1, 0], sy: [1, 0], r: [0, 0], y: [0, 0] } as Record<string, [number, number]>);
  const hold = useRef<number | null>(null);
  const seq = useRef(0);

  // Video only where it can be seen well: big enough, motion allowed, data allowed.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    setLite(stillOnly || reduce || saver || size < 96);
  }, [stillOnly, size]);

  const kick = useCallback((sx: number, sy: number, r: number, y: number) => {
    const sp = spring.current;
    sp.sx[1] += sx; sp.sy[1] += sy; sp.r[1] += r; sp.y[1] += y;
  }, []);

  /** Play a clip on the back player, then bring it to the front. */
  const play = useCallback((name: string, loop: boolean, then?: () => void) => {
    if (lite) return;
    const ticket = ++seq.current;
    const next = 1 - front.current;
    const v = vids[next].current;
    const cur = vids[front.current].current;
    if (!v) return;
    const c = clip(name);
    v.loop = loop;
    v.onended = loop ? null : () => then?.();
    if (v.dataset.name !== name) {
      v.dataset.name = name;
      v.innerHTML = `<source src="${c.hevc}" type='video/mp4; codecs="hvc1"'><source src="${c.webm}" type="video/webm">`;
      v.load();
    }
    v.currentTime = 0;
    const go = () => {
      // A newer clip was asked for while this one loaded: it wins.
      if (ticket !== seq.current) return;
      v.style.opacity = '1';
      if (cur) cur.style.opacity = '0';
      front.current = next;
      window.setTimeout(() => cur?.pause(), 200);
    };
    v.play().then(go).catch(() => undefined);
  }, [lite, vids]);

  const idle = useCallback((m: Mood) => {
    setPose(m);
    play(`idle-${m}`, true);
  }, [play]);

  // Mood changes: a move clip when one exists, then the new idle.
  const changeMood = useCallback((m: Mood) => {
    setMood((prev) => {
      if (prev === m) return prev;
      kick(0.9, -1.4, 0, 30);
      if (MOVES.has(`${prev}-${m}`)) play(`move-${prev}-${m}`, false, () => idle(m));
      else idle(m);
      setPose(m);
      return m;
    });
  }, [idle, kick, play]);

  const moment = useCallback((k: Moment) => {
    if (hold.current) window.clearTimeout(hold.current);
    if (k === 'flinch') { kick(-0.6, 1.2, 22, -60); return; }
    if (k === 'win') kick(-1.2, 2.2, 0, -180);
    if (k === 'crown') kick(0, 0, 0, -120);
    setPose(MOMENT_STILL[k] ?? mood);
    play(`event-${k}`, false, () => {
      hold.current = window.setTimeout(() => idle(mood), 1800);
    });
    if (lite) hold.current = window.setTimeout(() => setPose(mood), 3200);
  }, [idle, kick, lite, mood, play]);

  // Props drive the mood too, so a page can set it from server data.
  useEffect(() => { if (!award) changeMood(moodProp); }, [moodProp, award, changeMood]);

  // Awards hold their pose: a loop where the award has one, its arrival clip
  // (held on the last frame) where it has that, else the still alone. He
  // stays put; only the clip changes.
  useEffect(() => {
    if (!award) return;
    setPose(AWARD_ART[award] ?? 'calm');
    if (AWARD_LOOPS.has(award)) play(awardClip(award), true);
    else if (AWARD_ARRIVE[award]) play(AWARD_ARRIVE[award], false);
    else for (const r of vids) { if (r.current) { r.current.style.opacity = '0'; r.current.pause(); } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [award, play, kick]);

  // First paint: start the idle once the players exist and he is on screen.
  useEffect(() => {
    const el = rig.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      const v = vids[front.current].current;
      if (!e.isIntersecting) { v?.pause(); return; }
      if (lite) return;
      if (v?.dataset.name) void v.play().catch(() => undefined);
      else if (award && AWARD_LOOPS.has(award)) play(awardClip(award), true);
      else if (award && AWARD_ARRIVE[award]) play(AWARD_ARRIVE[award], false);
      else if (!award) play(`idle-${mood}`, true);
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite]);

  useEffect(() => (listen ? hearSquirt((sig) => {
    if (sig.kind === 'mood') changeMood(sig.mood);
    else if (sig.kind === 'moment') moment(sig.moment);
    else kick(1.4, -2.2, (Math.random() > 0.5 ? 1 : -1) * 26, 40);
  }) : undefined), [listen, changeMood, moment, kick]);

  // Springs: breathing at rest, squash and wobble on kicks. Transform only.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    const t0 = last;
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (visible.current && rig.current) {
        const t = (now - t0) / 1000;
        const breathe = lite ? Math.sin(t * Math.PI * (pose === 'sweat' ? 2.4 : pose === 'sleep' ? 0.55 : 1.1)) * 0.012 : 0;
        const rest: Record<string, number> = { sx: 1 - breathe * 0.6, sy: 1 + breathe, r: 0, y: 0 };
        const sp = spring.current;
        for (const k of Object.keys(sp)) {
          const [x, v] = sp[k];
          const nv = v + (-K * (x - rest[k]) - D * v) * dt;
          sp[k] = [x + nv * dt, nv];
        }
        rig.current.style.transform = `translateY(${sp.y[0].toFixed(2)}px) rotate(${sp.r[0].toFixed(2)}deg) scale(${sp.sx[0].toFixed(4)},${sp.sy[0].toFixed(4)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lite, pose]);

  return (
    <div
      ref={rig}
      className={`${s.rig} ${className ?? ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `Squirt, ${award ? 'with his award' : mood}`}
      onClick={() => kick(1.4, -2.2, (Math.random() > 0.5 ? 1 : -1) * 26, 40)}
    >
      <img className={s.still} src={still(pose, size > 240 ? 960 : 480)} alt="" draggable={false} />
      {lite ? null : (
        <>
          <video ref={vids[0]} className={s.clip} muted playsInline preload="none" aria-hidden />
          <video ref={vids[1]} className={s.clip} muted playsInline preload="none" aria-hidden />
        </>
      )}
    </div>
  );
}
