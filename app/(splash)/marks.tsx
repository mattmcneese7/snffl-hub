/**
 * Mark options for the league, drawn as vectors so they stay sharp from a
 * 16px tab to an app icon. Each is one shape in one color, so it can sit in
 * the menu as plain ink, and takes the logo's blue to teal when it stands
 * alone. Laces and the like are cut out of the shape, never drawn on top.
 *
 * Shared definitions use fixed ids; every copy of a mark defines them
 * identically, so repeats on one page agree.
 */

type Tone = 'ink' | 'brand';

function Fill({ tone }: { tone: Tone }) {
  return tone === 'brand' ? (
    <linearGradient id="mk-brand" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stopColor="#0a5ad0" />
      <stop offset="1" stopColor="#1ec3a6" />
    </linearGradient>
  ) : null;
}
const paint = (tone: Tone) => (tone === 'brand' ? 'url(#mk-brand)' : 'currentColor');

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

/** A. The drop, kept and cleaned: truer geometry, laces cut through, no face. */
export function MarkDrop({ tone = 'ink' }: { tone?: Tone }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <Fill tone={tone} />
        <mask id="mk-drop-cut" maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="#fff" />
          <g stroke="#000" strokeLinecap="round">
            <path d="M32 28.5 V 53" strokeWidth="3.6" />
            <path d="M27 33 H 37 M27 38 H 37 M27 43 H 37 M27 48 H 37" strokeWidth="3.2" />
          </g>
        </mask>
      </defs>
      <path d={DROP} fill={paint(tone)} mask="url(#mk-drop-cut)" />
    </svg>
  );
}

/** B. The squirt: a drop leaning into the throw, three droplets flying off. */
export function MarkSpray({ tone = 'ink' }: { tone?: Tone }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <Fill tone={tone} />
      </defs>
      <g fill={paint(tone)}>
        <path d={DROP} transform="translate(26 40) rotate(32) scale(0.74) translate(-32 -41)" />
        <circle cx="47" cy="17.5" r="4.6" />
        <circle cx="55" cy="10" r="3.2" />
        <circle cx="60" cy="3.8" r="1.9" />
      </g>
    </svg>
  );
}

/** C. An S drawn as a lace: one stroke, stitched across. */
export function MarkLaceS({ tone = 'ink' }: { tone?: Tone }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <Fill tone={tone} />
        <mask id="mk-s-cut" maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="#fff" />
          <path
            d="M30.7 16.1 L28.8 5.9 M25.5 21.9 L17.9 29 M30 24.8 L25.2 34.1 M37.4 28.5 L32.5 37.7 M45.1 34 L37.5 41.1 M36.3 59.1 L33.6 49.1"
            stroke="#000"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <path
        d="M45 15 C 40 9 22 8 20 20 C 18 31 44 31 44 44 C 44 56 24 58 18 50"
        fill="none"
        stroke={paint(tone)}
        strokeWidth="9"
        strokeLinecap="round"
        mask="url(#mk-s-cut)"
      />
    </svg>
  );
}

/** D. The wet ball: a football on the tilt, laces cut through, dripping off its tip. */
export function MarkBall({ tone = 'ink' }: { tone?: Tone }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <Fill tone={tone} />
        <mask id="mk-ball-cut" maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="#fff" />
          <g stroke="#000" strokeLinecap="round">
            <path d="M24.9 37.5 L39.1 26.5" strokeWidth="2.8" />
            <path
              d="M25.1 32.8 L29.5 38.5 M28.2 30.4 L32.6 36.1 M31.4 27.9 L35.8 33.6 M34.5 25.5 L38.9 31.2"
              strokeWidth="2.4"
            />
          </g>
        </mask>
      </defs>
      <g fill={paint(tone)}>
        <path d="M12 47 A 31 31 0 0 1 52 17 A 31 31 0 0 1 12 47 Z" mask="url(#mk-ball-cut)" />
        <path d="M11 51.5 C 13.2 54.6 15.4 56.8 15.4 59.4 A 4.4 4.4 0 0 1 6.6 59.4 C 6.6 56.8 8.8 54.6 11 51.5 Z" />
      </g>
    </svg>
  );
}

/** A1. Drop, refined: more air, three stitches, a shorter spine sitting low
 * in the body where the drop is widest. */
/** The football's two end seams, on the drop's 64 grid. */
export const SEAM_TOP = 'M20 14 Q 32 23 44 14';
export const SEAM_FOOT = 'M16 59 Q 32 49 48 59';
/**
 * The laces, "Even" (Matt's pick): centered between the two seams with the
 * same clear gap to each (5.9 on the 64 grid), the way laces sit on a ball.
 * The seams run past the drop's edges so they cut it edge to edge.
 */
export const LACE_SPINE = 'M32 26.75 V 45.75';
export const LACE_STITCHES = 'M27.8 31.3 H 36.2 M27.8 36.25 H 36.2 M27.8 41.2 H 36.2';
/** Stroke weights, lightened: spine, stitches, seams. */
export const CUT_WIDTH = { spine: 2.6, stitch: 2.3, seam: 2.1 } as const;

export function MarkDropRefined({ tone = 'ink' }: { tone?: Tone }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <Fill tone={tone} />
        <mask id="mk-drop1-cut" maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="#fff" />
          <g stroke="#000" strokeLinecap="round" fill="none">
            <path d={LACE_SPINE} strokeWidth={CUT_WIDTH.spine} />
            <path d={LACE_STITCHES} strokeWidth={CUT_WIDTH.stitch} />
            {/* The ball's seams: one across under the tip, one across the
                foot, each bowing toward the laces the way a football's do. */}
            <path d={SEAM_TOP} strokeWidth={CUT_WIDTH.seam} />
            <path d={SEAM_FOOT} strokeWidth={CUT_WIDTH.seam} />
          </g>
        </mask>
      </defs>
      <path d={DROP} fill={paint(tone)} mask="url(#mk-drop1-cut)" />
    </svg>
  );
}

/** A2. Drop with a seam: the lace curves across the body the way a seam runs
 * round a ball, so the drop reads as round and in motion. */
export function MarkDropSeam({ tone = 'ink' }: { tone?: Tone }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <Fill tone={tone} />
        <mask id="mk-drop2-cut" maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="#fff" />
          <g stroke="#000" strokeLinecap="round" fill="none">
            <path d="M21.5 32 Q 37 36 38.5 54" strokeWidth="3.2" />
            <path
              d="M29.9 30.4 L25.4 38.4 M35.3 34.6 L28.8 41 M39.4 40.2 L31.3 44.5 M42 46.8 L33.1 49.1"
              strokeWidth="2.6"
            />
          </g>
        </mask>
      </defs>
      <path d={DROP} fill={paint(tone)} mask="url(#mk-drop2-cut)" />
    </svg>
  );
}

/** A3. Wet drop: the refined laces, plus a glint cut high on the left, where
 * the light catches the surface. The drop looks wet, and glassy like the app. */
export function MarkDropWet({ tone = 'ink' }: { tone?: Tone }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <defs>
        <Fill tone={tone} />
        <mask id="mk-drop3-cut" maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="#fff" />
          <g stroke="#000" strokeLinecap="round" fill="none">
            <path d="M20.6 40.5 A 11.6 11.6 0 0 1 24.6 30.6" strokeWidth="3" />
            <path d="M34 33 V 52" strokeWidth="3.2" />
            <path d="M29.6 37.5 H 38.4 M29.6 42.5 H 38.4 M29.6 47.5 H 38.4" strokeWidth="2.8" />
          </g>
        </mask>
      </defs>
      <path d={DROP} fill={paint(tone)} mask="url(#mk-drop3-cut)" />
    </svg>
  );
}

/** The mark in use today, for comparison. */
export function MarkToday() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-mark-v4-128.png" alt="" width={64} height={64} style={{ width: '100%', height: '100%' }} />;
}

export const MARKS = [
  { key: 'today', name: 'Today', idea: 'The drop with laces and eyes, as it stands', Mark: MarkToday },
  { key: 'drop', name: 'A. Drop', idea: 'The same idea, cleaned: truer drop, laces cut through, no face', Mark: MarkDrop },
  { key: 'spray', name: 'B. Squirt', idea: 'A drop mid throw, three droplets flying off it', Mark: MarkSpray },
  { key: 'lace', name: 'C. Lace S', idea: 'The league initial, drawn as one stitched lace', Mark: MarkLaceS },
  { key: 'ball', name: 'D. Wet ball', idea: 'A football on the tilt, dripping off its tip', Mark: MarkBall },
] as const;
