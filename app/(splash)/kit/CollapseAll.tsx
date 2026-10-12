'use client';

import { useEffect, useState } from 'react';
import { CaretDoubleDown, CaretDoubleUp } from '@phosphor-icons/react';
import w from '../home/widgets.module.css';
import k from './kit.module.css';

/** Sent to every Fold on the page with the state to take. */
export const FOLD_ALL = 'splash:fold-all';

/**
 * Collapse all, beside a long page's title: every widget folds to its head,
 * or all open again. Folds (kit/Fold) animate shut through FOLD_ALL; plain
 * widgets with a widget head fold by hiding everything under the head, and
 * each one's head folds or unfolds just that widget with a tap.
 */
export default function CollapseAll() {
  const [closed, setClosed] = useState(false);

  // Plain widgets on the page that can fold: a widget whose first child is
  // its head. Folds manage themselves.
  const plain = () =>
    [...document.querySelectorAll<HTMLElement>(`.${w.widget}`)].filter(
      (el) => !el.hasAttribute('data-fold') && el.firstElementChild?.classList.contains(w.head),
    );

  const set = (close: boolean) => {
    setClosed(close);
    window.dispatchEvent(new CustomEvent(FOLD_ALL, { detail: { open: !close } }));
    for (const el of plain()) {
      if (close) el.setAttribute('data-folded', '');
      else el.removeAttribute('data-folded');
    }
  };

  // Every plain widget on the page folds and unfolds from its head, both
  // ways, with a caret saying which way a tap goes. Links and buttons in a
  // head still do their own thing.
  useEffect(() => {
    for (const el of plain()) el.setAttribute('data-foldable', '');
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const widget = target.closest<HTMLElement>(`.${w.widget}[data-foldable]`);
      if (!widget || !widget.firstElementChild?.contains(target)) return;
      if (target.closest('a, button')) return;
      widget.toggleAttribute('data-folded');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
    // plain() reads the page once it has rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button type="button" className={k.collapse} onClick={() => set(!closed)} aria-pressed={closed}>
      {closed ? <CaretDoubleDown weight="bold" aria-hidden /> : <CaretDoubleUp weight="bold" aria-hidden />}
      {closed ? 'Expand all' : 'Collapse all'}
    </button>
  );
}
