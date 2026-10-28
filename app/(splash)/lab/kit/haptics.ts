'use client';

/**
 * A tap you can feel, where the platform allows it. Android Chrome takes
 * navigator.vibrate. iOS Safari has no vibration API, and the hidden switch
 * trick (firing a native switch from script) was closed in iOS 26.5, so on
 * iOS the only real haptic is a person tapping a visible native switch:
 * v4 uses those for on/off settings (see the kit) and nothing pretends
 * otherwise. Respects reduced motion.
 */
export function haptic(kind: 'tick' | 'thud' | 'success' = 'tick') {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
    navigator.vibrate(kind === 'tick' ? 8 : kind === 'thud' ? 18 : [10, 40, 14]);
  }
}
