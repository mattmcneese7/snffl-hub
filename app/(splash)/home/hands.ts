/**
 * The hand: candidate script faces for Squirt's scribbles, all from Google
 * Fonts. Each is sized so its letters read about the same height as the
 * others (script faces vary a lot in x-height), via a scale on the base size.
 * Most come in one weight only, so they are set at it rather than faked bold.
 */
export type HandKey = 'marker' | 'sharpie' | 'ballpoint' | 'cartoon' | 'tag' | 'felt' | 'notebook' | 'caveat';

export const HANDS: Record<HandKey, { name: string; family: string; css: string; scale: number; weight: number; note: string }> = {
  marker: { name: 'Permanent Marker', family: 'Permanent+Marker', css: "'Permanent Marker'", scale: 0.86, weight: 400, note: 'A fat chisel marker. Loud, blocky, the one v2 used.' },
  sharpie: { name: 'Rock Salt', family: 'Rock+Salt', css: "'Rock Salt'", scale: 0.66, weight: 400, note: 'A scratchy Sharpie, fast and rough, ink skipping on the paper.' },
  ballpoint: { name: 'Reenie Beanie', family: 'Reenie+Beanie', css: "'Reenie Beanie'", scale: 1.18, weight: 400, note: 'A ballpoint scrawl in the margin. The most like a real person.' },
  cartoon: { name: 'Gochi Hand', family: 'Gochi+Hand', css: "'Gochi Hand'", scale: 0.95, weight: 400, note: 'Bouncy and round, like a comic strip letterer. Friendly.' },
  tag: { name: 'Sedgwick Ave Display', family: 'Sedgwick+Ave+Display', css: "'Sedgwick Ave Display'", scale: 1.06, weight: 400, note: 'A graffiti tag. Swagger, and the most attitude.' },
  felt: { name: 'Nanum Pen Script', family: 'Nanum+Pen+Script', css: "'Nanum Pen Script'", scale: 1.2, weight: 400, note: 'A thin felt tip, quick and light. Quiet, like a note on a photo.' },
  notebook: { name: 'Covered By Your Grace', family: 'Covered+By+Your+Grace', css: "'Covered By Your Grace'", scale: 1.06, weight: 400, note: 'Loose notebook printing, a little sloppy on purpose.' },
  caveat: { name: 'Caveat', family: 'Caveat:wght@700', css: "'Caveat'", scale: 1, weight: 700, note: 'The current one, for comparison.' },
};

export const handHref = (key: HandKey) => `https://fonts.googleapis.com/css2?family=${HANDS[key].family}&display=swap`;
