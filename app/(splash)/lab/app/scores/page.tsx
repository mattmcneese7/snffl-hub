import type { Metadata } from 'next';
import ScoresWeek from './Week';

export const metadata: Metadata = { title: { absolute: 'Scores, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** The Scores tab on the week the clock is on. */
export default function V4Scores() {
  return <ScoresWeek />;
}
