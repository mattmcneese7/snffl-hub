'use client';

import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { haptic } from './haptics';
import { SPRING } from './motion';
import s from './lab.module.css';

export type Toast = {
  id: string;
  /** Face or logo on the left. */
  image?: string | null;
  title: ReactNode;
  body?: ReactNode;
  /** The number on the right, "+6.00". */
  value?: string;
  tone?: 'good' | 'bad' | 'plain';
};

const Ctx = createContext<(t: Omit<Toast, 'id'> & { id?: string }) => void>(() => {});
export const useToast = () => useContext(Ctx);

/**
 * Toasts: scoring news dropping in from the top, stacked like iOS
 * notifications (the newest in front, the older ones tucked behind, scaled),
 * gone after five seconds or flicked up. Each one ticks the haptic.
 */
export function Toaster({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef(new Map<string, number>());
  useEffect(() => setMounted(true), []);

  const drop = useCallback((id: string) => {
    setList((l) => l.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) window.clearTimeout(tm);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'> & { id?: string }) => {
      const id = t.id ?? Math.random().toString(36).slice(2);
      setList((l) => [{ ...t, id }, ...l.filter((x) => x.id !== id)].slice(0, 4));
      haptic(t.tone === 'bad' ? 'thud' : 'tick');
      timers.current.set(id, window.setTimeout(() => drop(id), 5000));
    },
    [drop]
  );

  return (
    <Ctx.Provider value={push}>
      {children}
      {mounted
        ? createPortal(
            <div className={s.toasts} aria-live="polite">
              <AnimatePresence initial={false}>
                {list.map((t, i) => (
                  <motion.div
                    key={t.id}
                    layout
                    className={`${s.toast} ${t.tone === 'good' ? s.toastGood : t.tone === 'bad' ? s.toastBad : ''}`}
                    style={{ zIndex: 10 - i, pointerEvents: i === 0 ? 'auto' : 'none' }}
                    initial={{ opacity: 0, y: -40, scale: 0.96 }}
                    animate={{ opacity: i > 2 ? 0 : 1, y: i * 9, scale: 1 - i * 0.045 }}
                    exit={{ opacity: 0, y: -50, scale: 0.94, transition: { duration: 0.2 } }}
                    transition={SPRING.glide}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0.8, bottom: 0.1 }}
                    onDragEnd={(_, info) => (info.offset.y < -30 || info.velocity.y < -300) && drop(t.id)}
                  >
                    {t.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={s.toastFace} src={t.image} alt="" />
                    ) : null}
                    <span className={s.toastText}>
                      <b>{t.title}</b>
                      {t.body ? <span>{t.body}</span> : null}
                    </span>
                    {t.value ? <span className={s.toastValue}>{t.value}</span> : null}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>,
            document.body
          )
        : null}
    </Ctx.Provider>
  );
}
