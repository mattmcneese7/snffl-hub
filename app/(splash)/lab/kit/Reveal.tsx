'use client';

import { useId, useState, type ReactNode } from 'react';
import { haptic } from './haptics';
import s from './reveal.module.css';

/**
 * A section that opens and closes with its height animating, where 3.0's
 * folds snap. The grid row trick (0fr to 1fr) animates to the content's
 * real height in every browser, Safari included, with no measuring.
 */
export default function Reveal({ head, children, defaultOpen = false }: { head: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={s.reveal} data-open={open || undefined}>
      <button
        type="button"
        className={s.head}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          haptic('tick');
          setOpen((o) => !o);
        }}
      >
        <span className={s.headText}>{head}</span>
        <span className={s.chev} aria-hidden />
      </button>
      <div className={s.body} id={id}>
        <div className={s.inner}>{children}</div>
      </div>
    </div>
  );
}
