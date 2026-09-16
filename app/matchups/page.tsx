import { redirect } from 'next/navigation';
import { scoredWeek } from '@/lib/league';

export default async function MatchupsIndex() {
  const week = await scoredWeek();
  redirect(`/matchups/${week}`);
}
