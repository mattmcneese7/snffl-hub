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
  title: 'Join',
  description: 'Put SQUIRT on your home screen.',
};

export default function JoinPage() {
  return (
    <main className="snffl-join">
      <InstallInvite />
    </main>
  );
}
