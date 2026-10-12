import { ImageResponse } from 'next/og';
import { weekStory, type StorySlide } from '@/lib/week-story';
import { firstNameOf } from '@/config/managers';
import { switzer } from '../../fonts';
import { CUT_WIDTH, LACE_SPINE, LACE_STITCHES, SEAM_FOOT, SEAM_TOP } from '../../../marks';

/**
 * Splash's share images, the v3 counterpart of /api/share (which the live
 * site keeps using until v3 ships). The same three shapes off the same week
 * story: a 1200 by 630 link preview, a 1080 square, and a 1080 by 1920 per
 * slide for Save Image. In Pool: paper, a white card with the lockup, the
 * line of the week in heavy Switzer, the Shart on lime.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;

const SIZES = {
  square: { width: 1080, height: 1080 },
  link: { width: 1200, height: 630 },
  slide: { width: 1080, height: 1920 },
} as const;
type Kind = keyof typeof SIZES;

const PAPER = '#f7f6f2';
const INK = '#141518';
const INK2 = '#3d434e';
const DEEP = '#2d4c9c';
const POWDER = '#c9dcfa';
const LIME = '#ecf88a';
const DROP = 'M32 4 C 39.5 15.5 51 26.5 51 41 A 19 19 0 0 1 13 41 C 13 26.5 24.5 15.5 32 4 Z';

type Copy = { kicker: string; big: string; sub: string; shart?: boolean; star?: { name: string; headshot: string; points: number } | null };

const first = (rosterId: number, fallback: string) => firstNameOf(rosterId) ?? fallback;

/** One line of the week, for the square and the link preview. */
function headline(slides: StorySlide[]): Copy {
  const motw = slides.find((s) => s.kind === 'motw');
  if (motw && motw.kind === 'motw') return { kicker: 'Manager of the Week', big: motw.team, sub: `${first(motw.rosterId, motw.manager)}, ${motw.value.toFixed(2)}` };
  const intro = slides.find((s) => s.kind === 'intro');
  if (intro && intro.kind === 'intro') return { kicker: 'The week', big: intro.topTeam, sub: `${intro.topScore.toFixed(2)} points` };
  return { kicker: 'Splash', big: 'The week', sub: '' };
}

/** Whatever this slide leads with, as three lines. */
function linesFor(slide: StorySlide): Copy {
  switch (slide.kind) {
    case 'intro':
      return { kicker: 'The week in 90 seconds', big: `Week ${slide.week}`, sub: `${slide.games} games. ${slide.topTeam} led with ${slide.topScore.toFixed(2)}.` };
    case 'motw':
      return { kicker: 'Manager of the Week', big: slide.team, sub: `${first(slide.rosterId, slide.manager)}, ${slide.value.toFixed(2)}`, star: slide.star };
    case 'shart':
      return { kicker: 'Shart of the Week', big: slide.team, sub: `${first(slide.rosterId, slide.manager)}, ${slide.value.toFixed(2)}. Owes a chug.`, shart: true, star: slide.star };
    case 'play':
      return { kicker: 'Top play', big: slide.headline, sub: slide.points != null ? `${slide.points.toFixed(2)} points` : '' };
    case 'shakeup':
      return {
        kicker: 'Standings shake up',
        big: slide.movers[0] ? slide.movers[0].team : 'The table moved',
        sub: slide.movers
          .slice(0, 3)
          .map((m) => `${first(m.rosterId, m.manager)} ${m.from} to ${m.to}`)
          .join(', '),
      };
  }
}

/** The mark: the deep blue drop, its laces and seams cut through to the card. */
function Mark({ size, cut }: { size: number; cut: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d={DROP} fill={DEEP} />
      <path d={LACE_SPINE} stroke={cut} strokeWidth={CUT_WIDTH.spine} strokeLinecap="round" />
      <path d={LACE_STITCHES} stroke={cut} strokeWidth={CUT_WIDTH.stitch} strokeLinecap="round" />
      <path d={SEAM_TOP} stroke={cut} strokeWidth={CUT_WIDTH.seam} strokeLinecap="round" fill="none" />
      <path d={SEAM_FOOT} stroke={cut} strokeWidth={CUT_WIDTH.seam} strokeLinecap="round" fill="none" />
    </svg>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ week: string; kind: string }> }) {
  const { week: rawWeek, kind: rawKind } = await params;
  const week = Math.max(1, Math.min(18, Number(rawWeek) || 1));
  const kind = (rawKind in SIZES ? rawKind : 'square') as Kind;
  const { width, height } = SIZES[kind];

  const slides = await weekStory(week).catch((): StorySlide[] => []);
  if (!slides.length) return new Response('No story for that week yet', { status: 404 });
  const index = Number(new URL(request.url).searchParams.get('i') ?? '0');
  const copy = kind === 'slide' ? linesFor(slides[Math.max(0, Math.min(slides.length - 1, index))]) : headline(slides);

  const tall = height > width;
  const wide = width > height;
  const pad = tall ? 72 : 56;
  const fonts = await switzer().catch(() => []);

  return new ImageResponse(
    (
      <div style={{ width, height, display: 'flex', padding: pad, background: PAPER, fontFamily: 'Switzer' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: tall ? 72 : 52,
            borderRadius: tall ? 56 : 44,
            background: copy.shart ? LIME : '#ffffff',
            boxShadow: '0 30px 60px -30px rgba(30, 26, 20, 0.35)',
          }}
        >
          {/* The lockup, as the app's top bar wears it. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: tall ? 18 : 14 }}>
            <Mark size={tall ? 64 : 52} cut={copy.shart ? LIME : '#ffffff'} />
            <div style={{ display: 'flex', fontSize: tall ? 60 : 48, fontWeight: 800, letterSpacing: -2, color: INK }}>Splash</div>
            <div style={{ display: 'flex', marginLeft: 'auto', fontSize: tall ? 30 : 24, fontWeight: 800, color: DEEP }}>Week {week}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                padding: tall ? '10px 20px' : '8px 16px',
                borderRadius: 12,
                fontSize: tall ? 30 : 24,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: copy.shart ? INK : DEEP,
                background: copy.shart ? '#ffffff' : POWDER,
              }}
            >
              {copy.kicker}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: tall ? 32 : 22,
                fontSize: tall ? 120 : wide ? 84 : 104,
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing: tall ? -5 : -4,
                color: INK,
              }}
            >
              {copy.big}
            </div>
            {copy.sub ? (
              <div style={{ display: 'flex', marginTop: tall ? 28 : 18, fontSize: tall ? 44 : 34, fontWeight: 500, color: INK2 }}>{copy.sub}</div>
            ) : null}
            {/* The tall slide has room for the face of the week: the star who
                did it, or on the Shart, the best the roster could manage. */}
            {tall && copy.star ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 64 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={copy.star.headshot}
                  width={160}
                  height={160}
                  alt=""
                  style={{ borderRadius: 80, objectFit: 'cover', background: copy.shart ? '#ffffff' : POWDER }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: copy.shart ? INK : DEEP }}>
                    {copy.shart ? 'Best on the roster' : 'Carried by'}
                  </div>
                  <div style={{ display: 'flex', marginTop: 6, fontSize: 52, fontWeight: 900, letterSpacing: -2, color: INK }}>{copy.star.name}</div>
                  <div style={{ display: 'flex', fontSize: 36, fontWeight: 500, color: INK2 }}>{copy.star.points.toFixed(2)} points</div>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: tall ? 28 : 22, fontWeight: 500, color: INK2 }}>
            <span>The Squirtnite FFL, on Splash</span>
            <span>squirtnite.live</span>
          </div>
        </div>
      </div>
    ),
    { width, height, fonts: fonts.length ? fonts : undefined },
  );
}
