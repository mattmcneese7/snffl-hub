import { NextResponse } from 'next/server';
import { scoredWeek } from '@/lib/league';
import { gamecastExtras } from '@/app/(splash)/lab/live/winpath';

/**
 * The gamecast's moving parts beyond the scores: the win chance after each
 * kickoff window (its last point moves while a window is on) and every NFL
 * team's clock. Polled by the gamecast alongside the live feed while games are on.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get('id'));
  const asked = Number(url.searchParams.get('week'));
  if (!Number.isInteger(id) || id < 1 || id > 7) return NextResponse.json({ error: 'No such matchup' }, { status: 404 });
  const week = Number.isInteger(asked) && asked >= 1 && asked <= 18 ? asked : await scoredWeek();
  const extras = await gamecastExtras(week, id);
  if (!extras) return NextResponse.json({ error: 'No such matchup' }, { status: 404 });
  return NextResponse.json(extras, { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } });
}
