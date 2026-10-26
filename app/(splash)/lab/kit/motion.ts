/**
 * One motion for all of v4. Everything that moves in the lab moves on one of
 * these, so a sheet, a pill, a score and a page all feel like the same object.
 *
 *   snap    controls: pills, toggles, presses (fast, no wobble)
 *   glide   surfaces: sheets, cards, the island (a touch of settle)
 *   roll    numbers: scores and odds rolling to their new value
 *
 * CSS gets the same curves as linear() approximations of the springs, so CSS
 * only pieces (scroll driven headers, popovers) match the JS ones.
 */
export const SPRING = {
  snap: { type: 'spring', stiffness: 520, damping: 40, mass: 0.9 },
  glide: { type: 'spring', stiffness: 340, damping: 34, mass: 1 },
  roll: { type: 'spring', stiffness: 220, damping: 26, mass: 1 },
} as const;

/** The glide spring as a CSS easing, sampled; pair with 420ms. */
export const CSS_GLIDE =
  'linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938 16.7%, 1.017 19.4%, 1.067, 1.077 24.6%, 1.067 27.3%, 1.019 34.1%, 1.003 39.2%, 0.997 47.3%, 1)';

export const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
