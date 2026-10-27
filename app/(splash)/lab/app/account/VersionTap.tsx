'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';

const TAPS = 7;
const WINDOW_MS = 3000;

/**
 * The app's version at the foot of Account, as plain text. Seven taps inside
 * three seconds open the versions page. No hint, no link semantics: screen
 * readers read it as the version, and the layout is the span's own.
 */
export default function VersionTap({ className, children }: { className?: string; children: string }) {
  const router = useRouter();
  const taps = useRef<number[]>([]);

  const onTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now];
    if (taps.current.length >= TAPS) {
      taps.current = [];
      router.push('/versions');
    }
  };

  return (
    <span className={className} onClick={onTap}>
      {children}
    </span>
  );
}
