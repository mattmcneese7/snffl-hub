'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FOLD_ALL } from './CollapseAll';
import { CaretDown } from '@phosphor-icons/react';
import k from './fold.module.css';

/**
 * A widget that opens and closes from its head. The body animates its
 * height (a grid row going from 0fr to 1fr, so it needs no measuring), the
 * caret turns with it, and reduced motion gets the change without the
 * movement.
 */
export default function Fold({
  head,
  children,
  defaultOpen = true,
  className,
  headClassName,
  label,
}: {
  head: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headClassName?: string;
  /** What the toggle opens, for screen readers. */
  label: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // The page's Collapse all reaches every fold through one event.
  useEffect(() => {
    const onAll = (e: Event) => setOpen((e as CustomEvent<{ open: boolean }>).detail.open);
    window.addEventListener(FOLD_ALL, onAll);
    return () => window.removeEventListener(FOLD_ALL, onAll);
  }, []);
  return (
    <section className={className} data-fold>
      <button
        type="button"
        className={`${k.head} ${headClassName ?? ''}`}
        aria-expanded={open}
        aria-label={`${open ? 'Close' : 'Open'} ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        {head}
        <CaretDown weight="bold" className={`${k.caret} ${open ? k.caretOpen : ''}`} aria-hidden />
      </button>
      <div className={k.body} data-open={open}>
        <div className={k.inner}>{children}</div>
      </div>
    </section>
  );
}
