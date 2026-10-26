'use client';

import type { LabGame } from '../kit/liveFeed';

/**
 * The matchup just tapped on the board, held for the moment between the tap
 * and the gamecast arriving, so the loading state can draw the real score
 * bug (and the card can morph into it) instead of a grey shape. Only ever
 * the numbers the board was already showing.
 */
let held: LabGame | null = null;

export const hold = (g: LabGame) => {
  held = g;
};
export const heldFor = (id: number): LabGame | null => (held?.matchupId === id ? held : null);
