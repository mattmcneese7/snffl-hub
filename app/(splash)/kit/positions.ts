/** Positions spelled out, for hero cards and player pages. */
export const POSITION: Record<string, string> = {
  QB: 'Quarterback',
  RB: 'Running back',
  WR: 'Wide receiver',
  TE: 'Tight end',
  K: 'Kicker',
  DEF: 'Defense',
};

export const positionName = (p: string) => POSITION[p] ?? p;
