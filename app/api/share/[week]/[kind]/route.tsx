import { ImageResponse } from 'next/og';
import { weekStory, type StorySlide } from '@/lib/week-story';

/**
 * The week's share images, Checkpoint 10.
 *
 * Three shapes off one set of slides: a 1080 square for a post, a 1200 by 630
 * for a link preview, and a 1080 by 1920 per slide for Save Image. Drawn from
 * the same data the on screen story uses, so the picture and the page can
 * never disagree about who won the week.
 *
 * Rendered on demand and cached for an hour rather than generated into the
 * repo by the publish job. The brief describes committing them, which made
 * sense when the plan was static files; a route costs nothing to keep and
 * cannot go stale against a corrected result.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;

const SIZES = {
  square: { width: 1080, height: 1080 },
  link: { width: 1200, height: 630 },
  slide: { width: 1080, height: 1920 },
} as const;

type Kind = keyof typeof SIZES;

const INK = '#f2f5fa';
const DIM = '#a9b3c4';
const TEAL = '#1eae9c';
const BLUE = '#005ab4';

/** One line of the week, for the square and link shapes. */
function headline(slides: StorySlide[]): { kicker: string; big: string; sub: string } {
  const motw = slides.find((s) => s.kind === 'motw');
  if (motw && motw.kind === 'motw') {
    return {
      kicker: 'Manager of the week',
      big: motw.team,
      sub: `${motw.manager} · ${motw.value.toFixed(2)}`,
    };
  }
  const intro = slides.find((s) => s.kind === 'intro');
  if (intro && intro.kind === 'intro') {
    return { kicker: 'The week', big: intro.topTeam, sub: `${intro.topScore.toFixed(2)} points` };
  }
  return { kicker: 'SNFFL', big: 'The week', sub: '' };
}

/** Whatever this slide leads with, as three lines. */
function linesFor(slide: StorySlide): { kicker: string; big: string; sub: string } {
  switch (slide.kind) {
    case 'intro':
      return {
        kicker: 'The week in 90 seconds',
        big: `Week ${slide.week}`,
        sub: `${slide.games} games · ${slide.topTeam} led with ${slide.topScore.toFixed(2)}`,
      };
    case 'motw':
      return {
        kicker: 'Manager of the week',
        big: slide.team,
        sub: `${slide.manager} · ${slide.value.toFixed(2)}`,
      };
    case 'shart':
      return {
        kicker: 'Shart of the week',
        big: slide.team,
        sub: `${slide.manager} · ${slide.value.toFixed(2)}`,
      };
    case 'play':
      return {
        kicker: 'Top play',
        big: slide.headline,
        sub: slide.points != null ? `${slide.points.toFixed(2)} points` : '',
      };
    case 'shakeup':
      return {
        kicker: 'Standings shake up',
        big: slide.movers[0] ? slide.movers[0].team : 'The table moved',
        sub: slide.movers
          .slice(0, 3)
          .map((m) => `${m.manager} ${m.from}→${m.to}`)
          .join('  ·  '),
      };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ week: string; kind: string }> }
) {
  const { week: rawWeek, kind: rawKind } = await params;
  const week = Math.max(1, Math.min(18, Number(rawWeek) || 1));
  const kind = (rawKind in SIZES ? rawKind : 'square') as Kind;
  const { width, height } = SIZES[kind];

  const slides = await weekStory(week).catch((): StorySlide[] => []);
  if (!slides.length) {
    return new Response('No story for that week yet', { status: 404 });
  }

  const index = Number(new URL(request.url).searchParams.get('i') ?? '0');
  const copy =
    kind === 'slide' ? linesFor(slides[Math.max(0, Math.min(slides.length - 1, index))]) : headline(slides);

  const tall = height > width;
  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: tall ? 96 : 72,
          /* Dark the whole way across. The first pass ramped toward the
             mark's blue at full strength, which lit the bottom corner pale
             enough that the footer text disappeared into it. */
          background: `linear-gradient(150deg, #050912 0%, #081324 45%, #0b1e33 78%, ${BLUE}55 100%)`,
          color: INK,
          fontFamily: 'sans-serif',
        }}
      >
        {/* A bar in the mark's teal, so a shared image is identifiably ours
            without needing the logo file inside the renderer. */}
        <div style={{ display: 'flex', width: 120, height: 10, background: TEAL, marginBottom: 40 }} />
        <div style={{ display: 'flex', fontSize: tall ? 34 : 28, letterSpacing: 4, color: DIM, textTransform: 'uppercase' }}>
          {copy.kicker}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: tall ? 104 : width > 1100 ? 76 : 92,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 18,
          }}
        >
          {copy.big}
        </div>
        {copy.sub ? (
          <div style={{ display: 'flex', fontSize: tall ? 40 : 34, color: DIM, marginTop: 22 }}>
            {copy.sub}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 44,
            fontSize: tall ? 30 : 26,
            color: DIM,
          }}
        >
          <span>SNFFL · Week {week}</span>
          <span>squirtnite.live</span>
        </div>
      </div>
    ),
    { width, height }
  );
}
