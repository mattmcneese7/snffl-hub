import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { scoredWeek } from '@/lib/league';

export const metadata: Metadata = { title: 'Scoreboard' };

export default async function MatchupsIndex() {
  const week = await scoredWeek();
  redirect(`/matchups/${week}`);
}
