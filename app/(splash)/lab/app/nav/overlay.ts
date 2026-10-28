'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * An overlay that back can close. Opening it adds a history entry on the same
 * address, so the back button, Android's back gesture and the browser's back
 * all close the overlay instead of leaving the page. Closing it from the UI
 * steps back over that entry, so history stays clean.
 */
export function useOverlayHistory(name: string, open: boolean, close: () => void) {
  const pushed = useRef(false);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open || pushed.current) return;
    window.history.pushState({ ...(window.history.state ?? {}), splashOverlay: name }, '');
    pushed.current = true;
  }, [open, name]);

  useEffect(() => {
    const onPop = () => {
      if (!pushed.current) return;
      if ((window.history.state as { splashOverlay?: string } | null)?.splashOverlay === name) return;
      pushed.current = false;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [name]);

  /** Close from the UI: step back over our entry, which closes it. */
  return useCallback(() => {
    if (pushed.current && (window.history.state as { splashOverlay?: string } | null)?.splashOverlay === name) {
      window.history.back();
    } else {
      pushed.current = false;
      closeRef.current();
    }
  }, [name]);
}
