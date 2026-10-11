// The signed in half of Supabase, on the server.
//
// One client per request, built over that request's cookies, which is what
// @supabase/ssr requires: a client reused across requests would carry one
// person's session into another's response.

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { AUTH_KEY, AUTH_URL, authConfigured, hasSessionCookie } from './auth';

/**
 * A client acting as whoever is signed in, or null when auth is not set up.
 *
 * Server components cannot write cookies, so a refreshed token is dropped
 * there and the proxy is what keeps it fresh. Route handlers can, and do.
 */
export async function serverClient(): Promise<SupabaseClient | null> {
  if (!authConfigured) return null;
  const jar = await cookies();
  return createServerClient(AUTH_URL, AUTH_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // Called from a server component, which cannot set cookies.
        }
      },
    },
  });
}

/**
 * The signed in user, verified with Supabase, or null.
 *
 * Skips the network entirely when the request carries no session cookie,
 * which is every request from somebody who has never signed in.
 */
export async function currentUser(): Promise<{ user: User; client: SupabaseClient } | null> {
  if (!authConfigured) return null;
  const jar = await cookies();
  if (!hasSessionCookie(jar.getAll().map((c) => c.name))) return null;
  const client = await serverClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { user: data.user, client };
}

/**
 * Whether Google is switched on in the Supabase project.
 *
 * Asked of Supabase's public settings endpoint rather than held in an env
 * var, so turning the provider on in the dashboard is the whole of turning
 * sign in on. Until then the sign in screen says so plainly instead of
 * sending somebody to a raw error page from the auth server. Cached for five
 * minutes because it changes once, ever.
 */
export async function googleEnabled(): Promise<boolean> {
  if (!authConfigured) return false;
  try {
    const res = await fetch(`${AUTH_URL}/auth/v1/settings`, {
      headers: { apikey: AUTH_KEY },
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { external?: { google?: boolean } };
    return data.external?.google === true;
  } catch {
    return false;
  }
}
