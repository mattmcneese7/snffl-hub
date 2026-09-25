import type { Metadata } from 'next';
import InstallInvite from '@/components/InstallInvite';

/**
 * The link the league gets sent.
 *
 * Its own page rather than the front door, because the front door has a job:
 * somebody opening the app wants the scores, not an offer to install
 * something he installed in September. This is the one screen that exists to
 * turn a text message into an icon on a home screen, and it carries no
 * chrome, no tab bar and no ticker, so there is nothing to do on it but the
 * thing it is for.
 *
 * The site is noindex throughout, so this is unlisted by nature: it is
 * reachable by anyone holding the link and by nobody searching.
 */
export const metadata: Metadata = {
  // Absolute, so it escapes the "%s, SQUIRT" template every other page uses.
  // That template is right for a section of the app and wrong for this: the
  // invite is an instruction, not a place.
  title: { absolute: 'Join SQUIRT!' },
  description: 'Put SQUIRT on your home screen.',
  // What the card in the group chat says. The page title is "Join, SQUIRT",
  // which is right for a browser tab and useless as the first thing thirteen
  // people read about the app: a preview gets one line, so it spends it on
  // the instruction rather than on the name, which the image already carries.
  openGraph: {
    title: 'Add SQUIRT to your home screen',
    description: 'Live scores, the Rag, every chug and the week in ninety seconds.',
    siteName: 'SQUIRT',
    type: 'website',
    url: '/join',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Add SQUIRT to your home screen',
    description: 'Live scores, the Rag, every chug and the week in ninety seconds.',
  },
};

export default function JoinPage() {
  return (
    <main className="snffl-join">
      <InstallInvite />
    </main>
  );
}
