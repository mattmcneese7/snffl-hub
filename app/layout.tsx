import type { Metadata, Viewport } from 'next';
import { Archivo, Martian_Mono, Source_Serif_4, Permanent_Marker } from 'next/font/google';
import './globals.css';
import './chrome.css';
import './pages.css';
import './sections.css';
import './profiles.css';
import './rag.css';
import './home.css';
import './glass.css';
import './gameday.css';
import './manager-colors.css';

/*
 * Splash's root. The pages draw everything themselves (the wallpaper, the
 * menu, the ticker) through app/(splash)/kit/Shell.tsx, so this only sets the
 * document: the name, the icon, the paper behind a phone's overscroll.
 *
 * The v2 stylesheets and faces stay loaded because a handful of v2
 * components Splash still uses (live scores, the week story, the Sleeper
 * connect card) style themselves from them.
 */

const archivo = Archivo({ subsets: ['latin'], style: ['normal', 'italic'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });
const martianMono = Martian_Mono({ subsets: ['latin'], axes: ['wdth'], variable: '--font-mono', display: 'swap' });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });
const permanentMarker = Permanent_Marker({ subsets: ['latin'], weight: '400', variable: '--font-marker', display: 'swap', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.squirtnite.live'),
  title: { default: 'Splash', template: '%s, Splash' },
  description: 'The Squirtnite FFL, live.',
  robots: { index: false, follow: false, nocache: true },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Splash', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f6f2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ background: '#f7f6f2' }}>
      <body
        className={`${archivo.variable} ${martianMono.variable} ${sourceSerif.variable} ${permanentMarker.variable}`}
        style={{ background: '#f7f6f2' }}
      >
        {children}
      </body>
    </html>
  );
}
