import type { Metadata, Viewport } from 'next';
import AppIntro from '@/components/AppIntro';
import ChugSplash from '@/components/ChugSplash';
import InstallGuide from '@/components/InstallGuide';
import { latestChug } from '@/lib/chug-video';
import { scoredWeek } from '@/lib/league';
import { Archivo, Martian_Mono, Source_Serif_4, Permanent_Marker } from 'next/font/google';
import './globals.css';
import './chrome.css';
import './pages.css';
import './sections.css';
import './profiles.css';
import './rag.css';
import './home.css';
// Night Glass structure and the game day components, Checkpoint 12a. Last, so
// they refine the frame above rather than being undone by it.
import './glass.css';
import './gameday.css';
// Generated nightly from Sleeper avatars. Gives every manager a .mgr-<userId>
// class exposing --mgr-primary and --mgr-secondary.
import './manager-colors.css';

// Self hosted through Next font loading, per Brief Section 3.
const archivo = Archivo({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

// Labels, eyebrows and numbers in tables: the broadcast graphics voice.
const martianMono = Martian_Mono({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-mono',
  display: 'swap',
});

/* The Rag's reading voice. Italic is the deck; both are real usage. */
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

/*
 * The Shartzone's hand, and one label on a profile. Two uses, about fifty
 * kilobytes, and neither is above the fold on any screen, so it is not
 * preloaded: next/font preloads every face by default, which had this one
 * competing for bandwidth with the fonts the first paint actually needs.
 * It still loads, just after the page that does not use it has drawn.
 */
const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marker',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  // Link previews are fetched by somebody else's server, so every image URL
  // in the head has to be absolute. Without this Next emits a relative one and
  // the card comes back blank in a group chat.
  metadataBase: new URL('https://www.squirtnite.live'),
  title: { default: 'SQUIRT', template: '%s, SQUIRT' },
  description: 'The home of the Squirtnite FFL.',
  // Hidden from search engines entirely. The matching header lives in next.config.ts.
  robots: { index: false, follow: false, nocache: true },
  manifest: '/manifest.webmanifest',
  // 'default' makes iOS reserve the status bar strip instead of running the web
  // view underneath it. black-translucent put the clock and battery on top of
  // the wordmark. The safe-area padding stays as a second line of defence, and
  // reports 0 once iOS reserves the space, so the two do not double up.
  appleWebApp: { capable: true, title: 'SQUIRT', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // One theme, so one colour. The browser chrome matches the app rather than
  // the phone's setting.
  themeColor: '#0a1f24',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Whether the league has filmed a chug yet, and for which week. A file
  // lookup, so a season with none costs nothing.
  const week = await scoredWeek().catch(() => 1);
  const chug = latestChug(week);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${martianMono.variable} ${sourceSerif.variable} ${permanentMarker.variable}`}
      >
        {/* The stadium-light field every glass panel floats over. Fixed and
            painted once as gradients rather than blurred shapes, which a phone
            GPU would otherwise recomposite on every scroll frame. */}
        <div className="snffl-field" aria-hidden />
        {children}
        {/* Plays once a session, over the app rather than instead of it. */}
        <AppIntro />
        {/* The week's chug, once, behind the opening animation. */}
        {chug ? <ChugSplash week={chug.week} src={chug.src} /> : null}
        {/* The home screen instructions, raised here rather than on the
            invite: iOS saves the page you are looking at, so the taps have to
            be taught on the page that should end up on the home screen. */}
        <InstallGuide />
      </body>
    </html>
  );
}
