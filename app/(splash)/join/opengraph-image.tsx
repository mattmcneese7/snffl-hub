import { ImageResponse } from 'next/og';
import { switzer } from '../share/fonts';
import { CUT_WIDTH, LACE_SPINE, LACE_STITCHES, SEAM_FOOT, SEAM_TOP } from '../marks';

/**
 * The card under the invite link in the group chat: the Powder icon, the
 * name, and the instruction. 1200 by 630, the size every chat app crops to.
 */
export const runtime = 'nodejs';
export const alt = 'Add Splash to your home screen';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

export default async function Image() {
  const fonts = await switzer().catch(() => []);
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', alignItems: 'center', gap: 64, padding: '0 96px', background: '#f7f6f2', fontFamily: 'Switzer' }}>
        {/* The Powder icon, drawn as the app's own. */}
        <div style={{ display: 'flex', width: 280, height: 280, borderRadius: 63, background: '#c9dcfa', alignItems: 'center', justifyContent: 'center', boxShadow: '0 30px 60px -24px rgba(45, 76, 156, 0.45)' }}>
          <svg width="280" height="280" viewBox="0 0 1024 1024">
            <ellipse cx="512" cy="742" rx="330" ry="58" stroke="#ffffff" strokeWidth="16" fill="none" opacity="0.55" />
            <ellipse cx="512" cy="742" rx="226" ry="38" stroke="#ffffff" strokeWidth="18" fill="none" />
            <g transform="translate(192 150) scale(10)">
              <path d={DROP} fill="#2d4c9c" />
              <path d={LACE_SPINE} stroke="#c9dcfa" strokeWidth={CUT_WIDTH.spine} strokeLinecap="round" />
              <path d={LACE_STITCHES} stroke="#c9dcfa" strokeWidth={CUT_WIDTH.stitch} strokeLinecap="round" />
              <path d={SEAM_TOP} stroke="#c9dcfa" strokeWidth={CUT_WIDTH.seam} strokeLinecap="round" fill="none" />
              <path d={SEAM_FOOT} stroke="#c9dcfa" strokeWidth={CUT_WIDTH.seam} strokeLinecap="round" fill="none" />
            </g>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', fontSize: 104, fontWeight: 800, letterSpacing: -4, color: '#141518', lineHeight: 1 }}>Splash</div>
          <div style={{ display: 'flex', marginTop: 20, fontSize: 38, fontWeight: 500, color: '#3d434e', lineHeight: 1.25 }}>The Squirtnite FFL, live.</div>
          <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 36, padding: '16px 30px', borderRadius: 999, background: '#2d4c9c', color: '#ffffff', fontSize: 32, fontWeight: 800 }}>
            Add it to your home screen
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
