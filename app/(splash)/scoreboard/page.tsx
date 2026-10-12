import { redirect } from 'next/navigation';
import { scoredWeek } from '@/lib/league';

export const metadata = { title: { absolute: 'Scoreboard, Splash' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** The Scoreboard opens on the week with scores behind it, as v2's does. */
export default async function ScoreboardIndex() {
  redirect(`/scoreboard/${await scoredWeek()}`);
}
