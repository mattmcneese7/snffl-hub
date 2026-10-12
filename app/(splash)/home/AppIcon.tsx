/**
 * Splash's app icon, three directions, drawn full bleed on a 1024 square the
 * way the manifest wants it (the phone rounds the corners itself). Every one
 * is the A1 drop with its laces and seams cut through, so the icon and the
 * mark in the top bar are the same shape.
 *
 *   paper   the deep blue drop on the app's own paper: the mark exactly as
 *           it sits in the top bar. Matt's pick, and the shipped icon
 *   pool    a white drop landing in powder ripples on deep blue: the name,
 *           drawn; the boldest on a home screen
 *   powder  a deep blue drop in white ripples on powder: between the two
 */
import { CUT_WIDTH, LACE_SPINE, LACE_STITCHES, SEAM_FOOT, SEAM_TOP } from '../marks';

export type IconVariant = 'paper' | 'pool' | 'powder';

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

const LOOK: Record<IconVariant, { bg: string; drop: string; ripple: string | null }> = {
  paper: { bg: '#f7f6f2', drop: '#2d4c9c', ripple: null },
  pool: { bg: '#2d4c9c', drop: '#ffffff', ripple: '#c9dcfa' },
  powder: { bg: '#c9dcfa', drop: '#2d4c9c', ripple: '#ffffff' },
};

export default function AppIcon({ variant, size, round = true }: { variant: IconVariant; size: number; round?: boolean }) {
  const look = LOOK[variant];
  const id = `splash-icon-${variant}`;
  // The drop on the 64 grid spans 13 to 51 across and 4 to 60 down. Scaled
  // ten times and set a little low, where the eye puts the center of a drop.
  const ty = 150;
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: round ? '22.4%' : 0 }}
      role="img"
      aria-label="Splash"
    >
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
          <rect width="1024" height="1024" fill="#fff" />
          <g transform={`translate(192 ${ty}) scale(10)`} stroke="#000" strokeLinecap="round">
            <path d={LACE_SPINE} strokeWidth={CUT_WIDTH.spine} />
            <path d={LACE_STITCHES} strokeWidth={CUT_WIDTH.stitch} />
            <path d={SEAM_TOP} strokeWidth={CUT_WIDTH.seam} fill="none" />
            <path d={SEAM_FOOT} strokeWidth={CUT_WIDTH.seam} fill="none" />
          </g>
        </mask>
      </defs>
      <rect width="1024" height="1024" fill={look.bg} />
      {look.ripple ? (
        <g fill="none" stroke={look.ripple} strokeLinecap="round">
          <ellipse cx="512" cy="742" rx="330" ry="58" strokeWidth="16" opacity="0.55" />
          <ellipse cx="512" cy="742" rx="226" ry="38" strokeWidth="18" />
        </g>
      ) : null}
      <g mask={`url(#${id})`}>
        <path d={DROP} transform={`translate(192 ${ty}) scale(10)`} fill={look.drop} />
      </g>
    </svg>
  );
}
