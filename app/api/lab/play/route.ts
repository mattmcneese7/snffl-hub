import { NextResponse } from 'next/server';
import { getNflGames } from '@/lib/gameday';
import { playerOf } from '@/lib/league';
import { latestPlayFor } from '@/app/(splash)/lab/app/moments/engine';

/** The v4 score bar's pop-up: the latest scoring play for one player in this week's games. */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9A-Z]{1,8}$/.test(id)) return NextResponse.json(null, { status: 404 });
  const team = playerOf(id).team;
  const game = team ? (await getNflGames().catch(() => [])).find((g) => g.home.abbr === team || g.away.abbr === team) : null;
  const play = game ? await latestPlayFor(id, game.id).catch(() => null) : null;
  return NextResponse.json(play, { headers: { 'Cache-Control': 'public, max-age=10' } });
}
