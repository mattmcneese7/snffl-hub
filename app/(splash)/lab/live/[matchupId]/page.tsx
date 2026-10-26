import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { scoredWeek } from '@/lib/league';
import Gamecast from '../Gamecast';
import { gamecastData } from '../winpath';

export const metadata: Metadata = { title: { absolute: 'Gamecast, Splash 4.0 lab' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
/** Seven matchups a week: any other id is a 404 before anything renders. */
export const dynamicParams = false;
export const generateStaticParams = () => Array.from({ length: 7 }, (_, i) => ({ matchupId: String(i + 1) }));

/** One matchup, live: fetched here for the first paint, then kept live on the client. */
export default async function GamecastPage({ params }: { params: Promise<{ matchupId: string }> }) {
  const { matchupId: raw } = await params;
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isInteger(id) || id < 1 || id > 7) notFound();

  const week = await scoredWeek();
  const data = await gamecastData(week, id);
  const game = data?.live.games.find((g) => g.matchupId === id);
  if (!data || !game) notFound();

  return <Gamecast initial={game} live={data.live} extras={data.extras} week={week} />;
}
