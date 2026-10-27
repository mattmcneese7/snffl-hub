import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { switzer } from '../../../share/fonts';

/**
 * The card under the invite link in the group chat: the home screen icon as
 * it ships, the one-color lockup, and the instruction, on the app's paper.
 * 1200 by 630, the size every chat app crops to.
 */
export const runtime = 'nodejs';
export const alt = 'Add Splash to your home screen';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

export default async function Image() {
  const [fonts, icon] = await Promise.all([switzer().catch(() => []), readFile(join(process.cwd(), 'public/icon-512.png')).catch(() => null)]);
  const src = icon ? `data:image/png;base64,${icon.toString('base64')}` : null;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', alignItems: 'center', gap: 72, padding: '0 104px', background: '#f7f6f2', fontFamily: 'Switzer' }}>
        {src ? <img src={src} width={280} height={280} style={{ borderRadius: 60 }} alt="" /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 120, fontWeight: 900, letterSpacing: -5, color: '#141518', lineHeight: 1 }}>
            <svg width="78" height="78" viewBox="0 0 64 64">
              <path d={DROP} fill="#141518" />
            </svg>
            splash
          </div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 40, color: '#3d434e', lineHeight: 1.25 }}>The Squirtnite FFL, live.</div>
          <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 36, padding: '18px 32px', borderRadius: 24, background: '#2d4c9c', color: '#ffffff', fontSize: 34, fontWeight: 800 }}>
            Add it to your home screen
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
