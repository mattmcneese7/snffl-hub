// Keeps a signed in session fresh, and does nothing for anyone else.
//
// Supabase access tokens last an hour. Server components cannot write a
// cookie, so the refreshed one has to be set here, before the page renders,
// which is the pattern @supabase/ssr documents for Next.
//
// Sign in is optional and most visitors never do it, so the first thing this
// checks is whether the request carries a session cookie at all. Without one
// it returns immediately and touches nothing: no Supabase call, no cookie, no
// change to how the page is cached.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_KEY, AUTH_URL, authConfigured, hasSessionCookie } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  if (!authConfigured || !hasSessionCookie(request.cookies.getAll().map((c) => c.name))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(AUTH_URL, AUTH_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        // A response carrying a session cookie must never be cached and
        // served to somebody else. The library supplies the headers.
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Refreshes the token if it has expired. Failure is not an error here: a
  // dead session just means the page renders signed out.
  await supabase.auth.getClaims().catch(() => null);
  return response;
}

export const config = {
  // Pages only. Static files never need a session, and the API routes that do
  // refresh it themselves. /api/watch in particular is hit every minute by the
  // database and has no business going through here.
  matcher: [
    '/((?!api/|_next/static|_next/image|auth/callback|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp4|webm|json|txt|xml|js|css)$).*)',
  ],
};
