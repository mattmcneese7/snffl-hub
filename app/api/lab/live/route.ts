import { NextResponse } from 'next/server';
import { getWeekGames, scoredWeek } from '@/lib/league';
import { getMatchupContext } from '@/lib/matchup-live';
import { buildLabLive } from '@/app/(splash)/lab/kit/liveFeed';

export type { LabGame, LabLive, LabSide, LabStarter } from '@/app/(splash)/lab/kit/liveFeed';

/** The v4 lab's live feed, polled by the island, the gamecast and the toasts. */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const current = await scoredWeek();
  const asked = Number(url.searchParams.get('week'));
  const week = Number.isInteger(asked) && asked >= 1 && asked <= 18 ? asked : current;
  const [raw, ctx] = await Promise.all([getWeekGames(week), getMatchupContext(week)]);
  return NextResponse.json(buildLabLive(week, raw, ctx), { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } });
}
