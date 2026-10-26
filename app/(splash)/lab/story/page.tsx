import type { Metadata } from 'next';
import { lastCompletedWeek } from './data';
import StoryRoute from './StoryRoute';

export const metadata: Metadata = { title: { absolute: 'The Week in Stories, Splash 4.0 lab' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** The last completed week's story. */
export default async function StoryLatest({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const [week, { s }] = await Promise.all([lastCompletedWeek(), searchParams]);
  return <StoryRoute week={week} start={Math.max(0, (Number(s) || 1) - 1)} />;
}
