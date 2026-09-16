import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Archivo, Source_Serif_4, Permanent_Marker } from 'next/font/google';
import './globals.css';
import './chrome.css';
import './pages.css';
import './sections.css';
import './profiles.css';
import './rag.css';
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

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marker',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Squirtnite FFL', template: '%s, SNFFL' },
  description: 'The Squirtnite FFL hub.',
  // Hidden from search engines entirely. The matching header lives in next.config.ts.
  robots: { index: false, follow: false, nocache: true },
  manifest: '/manifest.webmanifest',
  // 'default' makes iOS reserve the status bar strip instead of running the web
  // view underneath it. black-translucent put the clock and battery on top of
  // the wordmark. The safe-area padding stays as a second line of defence, and
  // reports 0 once iOS reserves the space, so the two do not double up.
  appleWebApp: { capable: true, title: 'SNFFL', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#121110' },
  ],
};

// Runs before paint so a saved theme never flashes the wrong colors.
const themeScript = `
try {
  var t = localStorage.getItem('snffl.theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${archivo.variable} ${sourceSerif.variable} ${permanentMarker.variable}`}>
        {/* next/script rather than a raw <script>: rendered as a React child it
            was re-inserted on every client navigation, three copies deep after
            two, which is what broke hydration. */}
        <Script
          id="snffl-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {children}
      </body>
    </html>
  );
}
