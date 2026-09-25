import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The thumbnail the invite gets when the link is pasted into a chat.
 *
 * This is the whole first impression. Somebody drops the link in the league
 * group and thirteen people see a card, not a page: if that card does not say
 * what the thing is and what to do with it, the link is a blue URL nobody
 * taps. So the card carries the mark, the name, and one instruction.
 *
 * Named by Next's own convention rather than wired up by hand, which is what
 * puts the og:image and twitter:image tags on the page without a second place
 * to keep the URL in sync.
 */
export const runtime = 'nodejs';
export const alt = 'SQUIRT, the home of the Squirtnite FFL. Tap to add it to your home screen.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#f2f5fa';
const DIM = '#9fc0c4';
const CYAN = '#0696a2';
const TEAL = '#1eae9c';

const asset = (...bits: string[]) => path.join(process.cwd(), ...bits);

export default async function Image() {
  // Read off disk and inline. The renderer cannot fetch from the site it is
  // rendering for, and a link preview is scraped by somebody else's server,
  // which will not wait around for a second request.
  const mark = fs.readFileSync(asset('public', 'logo-mark-v4.png'));
  const markSrc = `data:image/png;base64,${mark.toString('base64')}`;

  // The real display face, as TrueType. The app self hosts Archivo through
  // next/font, but that ships woff2, which the image renderer cannot read, so
  // the card was quietly coming out in whatever sans the renderer had: the
  // name set in a different typeface to the one it uses everywhere else. The
  // two files live outside public deliberately, since nothing should serve
  // them to a browser that already has the woff2.
  const black = fs.readFileSync(asset('assets', 'fonts', 'Archivo-BlackItalic.ttf'));
  const medium = fs.readFileSync(asset('assets', 'fonts', 'Archivo-Medium.ttf'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 64,
          padding: '0 72px',
          // The app's own ground, with the blue glow coming up the far corner
          // the way it does behind the dock.
          background:
            'linear-gradient(145deg, #061a1e 0%, #0a1f24 42%, #0e2b31 74%, #0d3a57 100%)',
          color: INK,
          fontFamily: 'Archivo',
        }}
      >
        <img src={markSrc} width={268} height={268} alt="" style={{ display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 132,
              fontWeight: 800,
              fontStyle: 'italic',
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            SQUIRT
          </div>

          <div style={{ display: 'flex', fontSize: 34, fontWeight: 500, color: DIM, marginTop: 18 }}>
            Live scores, the Rag and every chug.
          </div>

          {/* The instruction, as a control rather than a sentence. A preview
              card cannot be tapped in place, so this has to read as the thing
              waiting on the other side of the link. */}
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              marginTop: 34,
              padding: '20px 40px',
              borderRadius: 999,
              background: `linear-gradient(160deg, ${CYAN}, ${TEAL})`,
              color: '#04121c',
              fontSize: 34,
              fontWeight: 500,
              letterSpacing: 3,
            }}
          >
            ADD TO HOME SCREEN
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            right: 72,
            bottom: 40,
            fontSize: 26,
            fontWeight: 500,
            color: DIM,
          }}
        >
          squirtnite.live/join
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Archivo', data: black, weight: 800, style: 'italic' },
        { name: 'Archivo', data: medium, weight: 500, style: 'normal' },
      ],
    }
  );
}
