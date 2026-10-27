/** Where Squirt's cut-out stills and clips live, all under /squirt in public. */
const BASE = '/squirt';

export const still = (name: string, size: 480 | 960 = 480) => `${BASE}/${name}-${size}.webp`;

/** A transparent clip in both formats: HEVC with alpha for Safari, VP9 with alpha for the rest. */
export const clip = (name: string) => ({ hevc: `${BASE}/${name}-hevc.mp4`, webm: `${BASE}/${name}.webm`, poster: `${BASE}/${name}-poster.webp` });

/** Mood changes that have their own clip; any other change crossfades. */
export const MOVES = new Set(['smug-sweat', 'sweat-smug', 'sweat-gloom', 'gloom-calm']);

/** The still that ends each moment, held after the clip plays. */
export const MOMENT_STILL: Record<string, string> = { win: 'smug', shart: 'shart', chug: 'stein', crown: 'crown', trophy: 'trophy', flinch: 'sweat' };

/** Award art, by trophy key. Three awards share the moment stills. */
export const AWARD_ART: Record<string, string> = {
  motw: 'crown', champion: 'trophy', shart: 'shart', blowout: 'blowout', squeaker: 'squeaker',
  heartbreaker: 'heartbreaker', lucky: 'lucky', bench: 'bench', plunger: 'plunger', chug: 'stein',
};

/** Awards with their own looping clip; the rest hold their still. */
export const AWARD_LOOPS = new Set(['blowout', 'squeaker', 'heartbreaker', 'lucky', 'bench', 'plunger', 'chug']);

/** The looping clip for an award pose; the chug reuses its moment clip. */
export const awardClip = (award: string) => (award === 'chug' ? 'event-chug' : `award-${award}`);
