'use client';

import { motion } from 'motion/react';
import { useId } from 'react';
import { haptic } from './haptics';
import { SPRING } from './motion';
import s from './lab.module.css';

/**
 * The segmented control: the menu's powder pill, sliding between options on
 * the snap spring (a shared layout element, so it travels rather than fades).
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const id = useId();
  return (
    <div className={s.seg} role="tablist" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            className={`${s.segItem} ${on ? s.segOn : ''}`}
            onClick={() => {
              if (on) return;
              haptic('tick');
              onChange(o.value);
            }}
          >
            {on ? <motion.span layoutId={`seg-${id}`} className={s.segPill} transition={SPRING.snap} /> : null}
            <span className={s.segLabel}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
