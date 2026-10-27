import { NextResponse } from 'next/server';
import { claim, ownPicks, savePick, verify } from '@/app/(splash)/lab/app/pickem/store';

/**
 * Pick'em for one device. GET returns this team's own picks for a week (the
 * token proves the team). POST either claims the team with its PIN (sets it
 * the first time) and returns a token, or saves one pick before the lock.
 * Everyone's picks come from the page itself, and only after the lock.
 */
export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(req: Request) {
  const u = new URL(req.url);
  const week = Number(u.searchParams.get('week'));
  const rosterId = await verify(req.headers.get('x-pickem-token'));
  if (!rosterId || !Number.isInteger(week)) return NextResponse.json({ rosterId: null, picks: [] }, { headers: NO_STORE });
  return NextResponse.json({ rosterId, picks: await ownPicks(week, rosterId) }, { headers: NO_STORE });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { action?: string; rosterId?: number; pin?: string; week?: number; matchupId?: number; pick?: number } | null;
  if (body?.action === 'claim' && Number.isInteger(body.rosterId) && typeof body.pin === 'string') {
    const out = await claim(body.rosterId as number, body.pin);
    return NextResponse.json(out, { status: 'error' in out ? 400 : 200, headers: NO_STORE });
  }
  if (body?.action === 'pick') {
    const rosterId = await verify(req.headers.get('x-pickem-token'));
    if (!rosterId) return NextResponse.json({ error: 'Enter your PIN first.' }, { status: 401, headers: NO_STORE });
    if (![body.week, body.matchupId, body.pick].every(Number.isInteger)) return NextResponse.json({ error: 'No such game.' }, { status: 400, headers: NO_STORE });
    const out = await savePick(body.week as number, rosterId, body.matchupId as number, body.pick as number);
    return NextResponse.json(out, { status: 'error' in out ? 400 : 200, headers: NO_STORE });
  }
  return NextResponse.json({ error: 'Unknown request.' }, { status: 400, headers: NO_STORE });
}
