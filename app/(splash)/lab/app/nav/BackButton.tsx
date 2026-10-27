'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Ms } from '../icons';
import { NAV_EVENT, previousEntry } from './store';
import s from '../ui/blocks/Frame.module.css';

/**
 * Back to where you actually were: the previous screen this session, named.
 * Opened straight from a link, it goes to the page's parent instead, so back
 * never leaves the app.
 */
export default function BackButton({ fallbackHref, fallbackLabel }: { fallbackHref: string; fallbackLabel: string }) {
  const router = useRouter();
  const [prev, setPrev] = useState<{ label: string } | null>(null);

  useEffect(() => {
    const read = () => {
      const p = previousEntry();
      setPrev(p ? { label: p.title || fallbackLabel } : null);
    };
    read();
    window.addEventListener(NAV_EVENT, read);
    return () => window.removeEventListener(NAV_EVENT, read);
  }, [fallbackLabel]);

  const label = prev?.label ?? fallbackLabel;
  return (
    <button
      type="button"
      className={s.backBtn}
      aria-label={`Back to ${label}`}
      onClick={() => {
        if (previousEntry()) router.back();
        else router.push(fallbackHref);
      }}
    >
      <Ms name="chevronLeft" size={22} />
      <span>{label}</span>
    </button>
  );
}
