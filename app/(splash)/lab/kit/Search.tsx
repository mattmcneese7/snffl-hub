'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { haptic } from './haptics';
import { SPRING } from './motion';
import s from './search.module.css';

export type SearchItem = { kind: 'Lab' | 'Page' | 'Manager' | 'Player'; label: string; sub?: string; href: string; image?: string | null };

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Rank: whole word start beats inside a word; shorter names first. */
function score(item: SearchItem, q: string): number {
  const label = norm(item.label);
  const sub = norm(item.sub ?? '');
  if (label.startsWith(q)) return 0;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 1;
  if (label.includes(q)) return 2;
  if (sub.includes(q)) return 3;
  return -1;
}

/**
 * Search everything: one field for players, managers and pages, from the
 * lockup line on every page. It drops down from the top on the glide spring,
 * results filter as you type (deferred, so typing never stutters), arrow keys
 * and Enter work on a keyboard, and "/" opens it from anywhere.
 */
export default function Search({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const [mounted, setMounted] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const dq = useDeferredValue(norm(q.trim()));
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea');
      if (!typing && (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey)))) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (open) {
      setQ('');
      setAt(0);
      window.setTimeout(() => input.current?.focus(), 60);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!dq) return items.filter((i) => i.kind === 'Lab' || i.kind === 'Manager').slice(0, 20);
    return items
      .map((i) => ({ i, sc: score(i, dq) }))
      .filter((x) => x.sc >= 0)
      .sort((a, b) => a.sc - b.sc || a.i.label.length - b.i.label.length)
      .slice(0, 30)
      .map((x) => x.i);
  }, [items, dq]);

  const go = (item: SearchItem | undefined) => {
    if (!item) return;
    haptic('tick');
    setOpen(false);
    router.push(item.href);
  };

  return (
    <>
      <button type="button" className={s.trigger} aria-label="Search" onClick={() => { haptic('tick'); setOpen(true); }}>
        <MagnifyingGlass weight="bold" />
      </button>
      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <div className={s.layer} key="search">
                  <motion.button
                    type="button"
                    aria-label="Close search"
                    className={s.scrim}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <motion.div
                    role="dialog"
                    aria-label="Search"
                    className={s.panel}
                    initial={{ opacity: 0, y: -16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.16 } }}
                    transition={SPRING.glide}
                  >
                    <div className={s.field}>
                      <MagnifyingGlass weight="bold" className={s.fieldIcon} aria-hidden />
                      <input
                        id="lab-search"
                        ref={input}
                        value={q}
                        placeholder="Players, managers, pages"
                        autoComplete="off"
                        enterKeyHint="go"
                        onChange={(e) => { setQ(e.target.value); setAt(0); }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') { e.preventDefault(); setAt((a) => Math.min(results.length - 1, a + 1)); }
                          if (e.key === 'ArrowUp') { e.preventDefault(); setAt((a) => Math.max(0, a - 1)); }
                          if (e.key === 'Enter') go(results[at]);
                        }}
                      />
                      <button type="button" className={s.close} aria-label="Close" onClick={() => setOpen(false)}>
                        <X weight="bold" />
                      </button>
                    </div>
                    <ul className={s.list} role="listbox">
                      {results.length ? (
                        results.map((r, i) => (
                          <li key={`${r.kind}-${r.href}`} role="option" aria-selected={i === at}>
                            <button type="button" className={`${s.row} ${i === at ? s.rowOn : ''}`} onClick={() => go(r)} onPointerEnter={() => setAt(i)}>
                              <span className={s.face}>
                                {r.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={r.image} alt="" loading="lazy" />
                                ) : (
                                  <span className={s.kindMark}>{r.kind === 'Lab' ? '4' : r.kind.charAt(0)}</span>
                                )}
                              </span>
                              <span className={s.text}>
                                <b>{r.label}</b>
                                {r.sub ? <span>{r.sub}</span> : null}
                              </span>
                              <span className={s.kind}>{r.kind}</span>
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className={s.none}>Nothing matches &ldquo;{q}&rdquo;</li>
                      )}
                    </ul>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}
