'use client';

import { useState } from 'react';
import { Ms } from '../icons';
import u from '../ui/ui.module.css';
import w from './swami.module.css';

const LEAGUE = 'https://sleeper.com/leagues/1394336593518546944';

/**
 * The hand off to Sleeper. Splash works the move out; Sleeper makes it. One
 * button copies the move exactly as it should be made, the other opens
 * Sleeper (on a phone that is the Sleeper app's home, so the move is in hand
 * by the time you get to the right screen).
 */
export default function CopyMove({ text, label = 'Copy move' }: { text: string; label?: string }) {
  const [done, setDone] = useState<'copied' | 'failed' | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone('copied');
    } catch {
      // Some browsers refuse the clipboard API; a selected textarea still copies.
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      setDone(ok ? 'copied' : 'failed');
    }
    window.setTimeout(() => setDone(null), 2200);
  };

  return (
    <div className={w.copy}>
      <p className={u.bodyText}>{text}</p>
      <div className={w.copyRow}>
        <button type="button" className={`${u.pill} ${u.pillPrimary}`} onClick={() => void copy()}>
          <Ms name={done === 'copied' ? 'check' : 'copy'} size={18} />
          {done === 'copied' ? 'Copied' : done === 'failed' ? 'Copy failed' : label}
        </button>
        <a className={`${u.pill} ${u.pillSecondary}`} href={LEAGUE} target="_blank" rel="noreferrer">
          <Ms name="open" size={18} />
          Open Sleeper
        </a>
      </div>
    </div>
  );
}
