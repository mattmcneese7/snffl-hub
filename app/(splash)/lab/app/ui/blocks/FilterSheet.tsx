import type { ReactNode } from 'react';
import u from '../ui.module.css';
import f from './FilterSheet.module.css';

/**
 * A chip that opens a bottom sheet holding the filters that do not fit the
 * one row on screen. Native popover, so it works without script; a tap on
 * the scrim or Done closes it.
 */
export function FilterSheet({ id, label, title, on, children }: { id: string; label: string; title: string; on?: boolean; children: ReactNode }) {
  return (
    <>
      <button type="button" popoverTarget={id} className={`${u.chip} ${on ? u.chipOn : ''}`} aria-haspopup="dialog">
        {label}
      </button>
      <div id={id} popover="auto" className={f.sheet} role="dialog" aria-label={title}>
        <div className={u.sectionHead}>
          <h2>{title}</h2>
          <button type="button" popoverTarget={id} popoverTargetAction="hide" className={`${u.pill} ${u.pillSecondary}`}>
            Done
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
