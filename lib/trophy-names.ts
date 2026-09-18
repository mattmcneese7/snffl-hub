// The league's awards by key, with names and one line on what earns each.
// Pure, so the medal art and the Rag's fact packets can both import it.

/** Every award the league hands out. The art lives in components/Trophy.tsx. */
export type TrophyKey =
  | 'motw'
  | 'shart'
  | 'blowout'
  | 'squeaker'
  | 'heartbreaker'
  | 'lucky'
  | 'bench'
  | 'champion'
  | 'plunger';

export const TROPHY_NAMES: Record<TrophyKey, { name: string; blurb: string }> = {
  motw: { name: 'Manager of the Week', blurb: 'Highest score of the week' },
  shart: { name: 'The Shart', blurb: 'Lowest score of the week. Owes a chug.' },
  blowout: { name: 'Blowout', blurb: 'Biggest margin of victory' },
  squeaker: { name: 'Squeaker', blurb: 'Narrowest win of the week' },
  heartbreaker: { name: 'Heartbreaker', blurb: 'Highest score in a loss' },
  lucky: { name: 'Lucky Dog', blurb: 'Lowest score in a win' },
  bench: { name: 'Bench Rot', blurb: 'Most points left on the bench' },
  champion: { name: 'Champion', blurb: 'Won the whole thing' },
  plunger: { name: 'The Golden Plunger', blurb: 'Lost the Shart Bowl. Last place.' },
};
