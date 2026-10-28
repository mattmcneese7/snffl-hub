import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StoryRoute from '../StoryRoute';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params;
  return { title: { absolute: `Week ${week} in Stories, Splash 4.0 lab` }, robots: { index: false, follow: false } };
}

/** One week's story, weeks 1 to 18; ?s= opens a given slide, counting from 1. */
export default async function StoryWeek({
  params,
  searchParams,
}: {
  params: Promise<{ week: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const [{ week: raw }, { s }] = await Promise.all([params, searchParams]);
  const week = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isInteger(week) || week < 1 || week > 18) notFound();
  return <StoryRoute week={week} start={Math.max(0, (Number(s) || 1) - 1)} />;
}
