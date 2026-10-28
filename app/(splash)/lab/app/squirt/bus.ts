/**
 * Squirt's ears: anything in the app can tell him what happened, and every
 * Squirt on screen hears it. Moods are standing states; moments play once.
 */
export type Mood = 'calm' | 'smug' | 'sweat' | 'gloom' | 'sleep';
export type Moment = 'flinch' | 'win' | 'shart' | 'chug' | 'crown' | 'trophy';
export type Award = 'blowout' | 'squeaker' | 'heartbreaker' | 'lucky' | 'bench' | 'plunger' | 'motw' | 'champion' | 'shart';

export type SquirtSignal = { kind: 'mood'; mood: Mood } | { kind: 'moment'; moment: Moment } | { kind: 'tap' };

const EVT = 'splash:squirt';

export function tellSquirt(signal: SquirtSignal) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SquirtSignal>(EVT, { detail: signal }));
}

export function hearSquirt(fn: (s: SquirtSignal) => void) {
  const h = (e: Event) => fn((e as CustomEvent<SquirtSignal>).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

/** The mood a matchup puts him in, by the same lines the score bar uses. */
export function moodFor(state: 'final' | 'preview' | 'live', me: number | null, them: number | null, late = false): Mood {
  if (me == null || them == null) return late ? 'sleep' : 'calm';
  const lead = me - them;
  if (state === 'final') return lead >= 0 ? 'smug' : 'gloom';
  if (state === 'preview') return late ? 'sleep' : 'calm';
  if (lead >= 15) return 'smug';
  if (lead <= -15) return 'gloom';
  return 'sweat';
}
