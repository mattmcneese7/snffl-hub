import { ImageResponse } from 'next/og';
import { CUT_WIDTH, LACE_SPINE, LACE_STITCHES, SEAM_FOOT, SEAM_TOP } from '../../../marks';

/**
 * Splash's app icon as a PNG at any size, for exporting the real files:
 * the Paper icon (the deep blue seamed drop on the app's paper, the mark as
 * it sits in the top bar),
 * full bleed and square, the way iOS, Android and the manifest want it.
 * ?round=1 bakes in the corner rounding for places that do not round it.
 */
export const runtime = 'nodejs';

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = Math.max(16, Math.min(2048, Number(raw) || 1024));
  const round = new URL(request.url).searchParams.get('round') === '1';
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', background: round ? 'transparent' : '#f7f6f2' }}>
        <svg width={size} height={size} viewBox="0 0 1024 1024">
          {round ? <rect width="1024" height="1024" rx="229" fill="#f7f6f2" /> : null}
          <g transform="translate(192 150) scale(10)">
            <path d={DROP} fill="#2d4c9c" />
            <path d={LACE_SPINE} stroke="#f7f6f2" strokeWidth={CUT_WIDTH.spine} strokeLinecap="round" />
            <path d={LACE_STITCHES} stroke="#f7f6f2" strokeWidth={CUT_WIDTH.stitch} strokeLinecap="round" />
            <path d={SEAM_TOP} stroke="#f7f6f2" strokeWidth={CUT_WIDTH.seam} strokeLinecap="round" fill="none" />
            <path d={SEAM_FOOT} stroke="#f7f6f2" strokeWidth={CUT_WIDTH.seam} strokeLinecap="round" fill="none" />
          </g>
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
