// Where Google sends somebody back after signing in, by way of Supabase.
//
// Supabase's PKCE flow: the browser left with a code verifier in a cookie,
// Google and Supabase hand back a one time code, and this swaps the two for a
// session. Then it links the account to a team, which is the one thing that
// makes an account worth having here.
//
// The link follows the rule the whole feature follows: the device pick is the
// default and the account never fights it on the first visit.
//
//   Account has no team, device has one   the account takes the device's.
//   Account has a team, device has none   the device takes the account's.
//   Both, and they differ                 the account wins, because the point
//                                         of signing in is that your team
//                                         follows you.
//   Neither                               the account screen asks.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { safeNext } from '@/lib/auth';
import { parseTeam, TEAM_COOKIE, TEAM_MAX_AGE } from '@/lib/my-team';
import { serverClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');

  // The same host the person started on. Vercel puts the public one in
  // x-forwarded-host; locally the request's own origin is right.
  const forwarded = request.headers.get('x-forwarded-host');
  const origin =
    process.env.NODE_ENV !== 'development' && forwarded ? `https://${forwarded}` : url.origin;
  const back = (path: string) => NextResponse.redirect(`${origin}${path}`);

  // Google refused, the person cancelled, or the provider is not set up.
  // Supabase reports all three as an error in the query string.
  if (!code) return back('/account?signin=failed');

  const client = await serverClient();
  if (!client) return back('/account?signin=off');

  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back('/account?signin=failed');

  const jar = await cookies();
  const deviceTeam = parseTeam(jar.get(TEAM_COOKIE)?.value);
  const userId = data.user.id;

  // Row level security means this client can only see and write this user's
  // own row. A missing table, because the SQL has not been run yet, leaves
  // sign in working and the team on the device where it already was.
  const existing = await client
    .from('accounts')
    .select('roster_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing.error) {
    const accountTeam = parseTeam(existing.data?.roster_id != null ? String(existing.data.roster_id) : null);
    if (!existing.data) {
      await client.from('accounts').insert({ user_id: userId, roster_id: deviceTeam });
    } else if (!accountTeam && deviceTeam) {
      await client
        .from('accounts')
        .update({ roster_id: deviceTeam, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    } else if (accountTeam && accountTeam !== deviceTeam) {
      // Written exactly as lib/my-team.ts writes it, readable by the picker.
      jar.set(TEAM_COOKIE, String(accountTeam), {
        path: '/',
        maxAge: TEAM_MAX_AGE,
        sameSite: 'lax',
      });
    }
  }

  return back(next);
}
