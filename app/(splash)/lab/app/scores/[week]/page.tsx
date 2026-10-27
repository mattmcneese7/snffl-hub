import type { Metadata } from 'next';
import { weekParam } from '../../../../kit/weekParam';
import ScoresWeek from '../Week';

export const metadata: Metadata = { title: { absolute: 'Scores, Splash 4.0' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** The Scores tab on any week of the season, from the week chips. */
export default async function V4ScoresWeek({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  return <ScoresWeek week={weekParam(week)} />;
}
