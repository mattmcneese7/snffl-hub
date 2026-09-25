import Link from 'next/link';
import LabTabs from './LabTabs';

/**
 * The design lab: the proposed direction for the dark only, app first
 * overhaul, and the screens that test it.
 *
 * Nothing here is wired to the live app. It is a separate route with its own
 * stylesheet so a direction can be judged on a phone and then kept, changed or
 * thrown away without a migration.
 */
const PALETTE = [
  { name: 'Ground', value: '#05070d', note: 'The page. Matches the icon tile, so the app ends where the phone does.' },
  { name: 'Surface', value: '#0d121d', note: 'Anything sitting on the page.' },
  { name: 'Raised', value: '#141b29', note: 'Inside a surface: score boxes, avatars.' },
  { name: 'Neon', value: '#4cc2ff', note: 'The icon’s eyes. Live, selected, yours. Nothing else.' },
  { name: 'Win', value: '#35d39a', note: 'Kept apart from the accent, so live never reads as good.' },
  { name: 'Loss', value: '#ff6b6b', note: 'And a callout you can still act on.' },
  { name: 'Shart', value: '#b07a4a', note: 'It has to be its own colour. It is a whole section.' },
];

const SCREENS = [
  { href: '/lab/home', name: 'Home', note: 'Your own game first, then stories, the oracle and the Shartzone.' },
  { href: '/lab/matchup', name: 'Matchup', note: 'One scoreline, a share bar, and lineups with faces instead of six columns of numbers.' },
  { href: '/lab/feed', name: 'Feed', note: 'Replays that play, then one stream with chips that always have something behind them.' },
];

export default function LabIndex() {
  return (
    <>
      <div className="lab-page">
        <header className="lab-header">
          <span className="lab-display lab-h2">Lab</span>
          <span className="lab-header-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark-v2-128.png" alt="" />
          </span>
          <span className="lab-week lab-num">v1</span>
        </header>

        <section className="lab-section">
          <h1 className="lab-display lab-h1">Blacklight</h1>
          <p className="lab-body">
            A proposal for the dark only app. Three moves separate it from tonight&rsquo;s dark
            theme. The ground goes properly black, matching the icon&rsquo;s own tile, so the app
            reads as an app rather than as a dark website. The frosted glass goes: blur over
            stadium glows costs a repaint on every scroll and muddies the text sitting on it, so
            flat surfaces and hairlines do the work instead. And there is one accent, the blue
            from the icon&rsquo;s eyes, spent only on what is live, selected or yours.
          </p>
          <p className="lab-body">
            Phone first at 390 pixels. A wide screen gets more columns of the same design, never a
            second one.
          </p>
        </section>

        <section className="lab-section">
          <span className="lab-label">Screens</span>
          <div className="lab-card">
            {SCREENS.map((screen) => (
              <Link className="lab-saying" href={screen.href} key={screen.href} style={{ textDecoration: 'none' }}>
                <span className="lab-saying-head">
                  <span className="lab-saying-who" style={{ color: 'var(--l-neon)' }}>
                    {screen.name}
                  </span>
                </span>
                <span className="lab-body">{screen.note}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="lab-section">
          <span className="lab-label">Palette</span>
          <div className="lab-card">
            {PALETTE.map((swatch) => (
              <div className="lab-slot" key={swatch.name}>
                <span
                  className="lab-slot-face"
                  style={{ background: swatch.value, border: '1px solid rgba(255,255,255,0.14)' }}
                />
                <span className="lab-slot-who">
                  <span className="lab-slot-name">{swatch.name}</span>
                  <span className="lab-body" style={{ fontSize: 12 }}>
                    {swatch.note}
                  </span>
                </span>
                <span className="lab-num lab-slot-pos">{swatch.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lab-section">
          <span className="lab-label">Type</span>
          <div className="lab-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
            <span className="lab-display lab-h1">Matchup of the week</span>
            <span className="lab-display lab-h2">Squirtfucius says</span>
            <span className="lab-num" style={{ fontSize: 30, fontWeight: 700 }}>
              130.08
            </span>
            <span className="lab-body">
              Archivo for anything that shouts, Martian Mono for every number so columns line up,
              and one body size. Labels are mono, small and spaced, never a fourth grey.
            </span>
            <span className="lab-label">Label · 10px mono</span>
          </div>
        </section>

        <section className="lab-section">
          <span className="lab-label">Components</span>
          <div className="lab-card" style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="lab-chip lab-chip-live">
              <i className="lab-dot" /> Live
            </span>
            <span className="lab-chip lab-chip-win">Won</span>
            <span className="lab-chip lab-chip-loss">Lost</span>
            <span className="lab-chip">Final</span>
            <span className="lab-chip">Week 3</span>
          </div>
        </section>
      </div>
      <LabTabs active="System" />
    </>
  );
}
