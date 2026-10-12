'use client';

import { useEffect, useState } from 'react';

/**
 * Game-day theatre: a score counts up to itself the first time it is seen,
 * the way a broadcast graphic lands. Reduced motion shows it settled.
 */
export default function CountUp({ value, digits = 2, ms = 900 }: { value: number; digits?: number; ms?: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setShown(value * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <>{shown.toFixed(digits)}</>;
}
