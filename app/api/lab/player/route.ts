import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPlayerData, getPlayerWeek } from '@/app/(splash)/lab/app/playerData';
import { bookFrom } from '@/app/(splash)/lib/odds-books';
import { getNflGames } from '@/lib/gameday';

/** The v4 player sheet's data, for one player: who he is and his week. */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9A-Z]{1,8}$/.test(id)) return NextResponse.json({ error: 'No such player' }, { status: 404 });
  const jar = await cookies();
  const [data, week, games] = await Promise.all([getPlayerData(id), getPlayerWeek(id, bookFrom(jar)).catch(() => null), getNflGames().catch(() => [])]);
  // His club's color for the sheet's band, as ESPN paints the team (the tickets use the same).
  const side = games.flatMap((g) => [g.home, g.away]).find((t) => t.abbr === data.team);
  // The lines follow the book this device picked, so the answer is private to it.
  return NextResponse.json({ ...data, week, color: side?.color ?? null }, { headers: { 'Cache-Control': 'private, max-age=120' } });
}
