import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPlayerData, getPlayerWeek } from '@/app/(splash)/lab/app/playerData';
import { bookFrom } from '@/app/(splash)/lib/odds-books';

/** The v4 player sheet's data, for one player: who he is and his week. */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9A-Z]{1,8}$/.test(id)) return NextResponse.json({ error: 'No such player' }, { status: 404 });
  const jar = await cookies();
  const [data, week] = await Promise.all([getPlayerData(id), getPlayerWeek(id, bookFrom(jar)).catch(() => null)]);
  // The lines follow the book this device picked, so the answer is private to it.
  return NextResponse.json({ ...data, week }, { headers: { 'Cache-Control': 'private, max-age=120' } });
}
