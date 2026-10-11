// Accounts, optional, on top of the device pick. October 2026.
//
// Sleeper has no sign in of any kind, so the accounts are ours, held by
// Supabase Auth with Google as the only provider. Nobody has to sign in: the
// team picked on a device is still the thing every page reads, and an account
// only adds what a device cannot do on its own, which is follow a person from
// his phone to his laptop.
//
// Import free apart from types, so the proxy, the server and the browser can
// all share it.

/** Same || as lib/supabase.ts, for the same reason: an empty string is unset. */
export const AUTH_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const AUTH_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** True when the project is reachable at all. Says nothing about Google. */
export const authConfigured = Boolean(AUTH_URL && AUTH_KEY);

/**
 * Supabase names its session cookies sb-<project ref>-auth-token, split into
 * numbered chunks when the session is large. Checking for the prefix is how
 * everything that runs on every request stays free for the people who never
 * sign in: no cookie, no work.
 */
export const hasSessionCookie = (names: Iterable<string>) => {
  for (const name of names) if (name.startsWith('sb-') && name.includes('-auth-token')) return true;
  return false;
};

/** Fired by setMyTeam, so a signed in device can copy the choice to the account. */
export const TEAM_EVENT = 'snffl:team';

/**
 * Where to go after signing in, kept to a path on this site. The value arrives
 * in a query string, and an unchecked one would make the callback an open
 * redirect to anywhere.
 */
export function safeNext(value: string | null | undefined, fallback = '/account'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}

/** What the account screen shows for a person. Never more than Google gave us. */
export type AccountUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
};

type UserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export function describeUser(user: UserLike): AccountUser {
  const meta = user.user_metadata ?? {};
  const text = (key: string) => (typeof meta[key] === 'string' ? (meta[key] as string) : null);
  return {
    id: user.id,
    email: user.email ?? null,
    name: text('full_name') ?? text('name'),
    avatar: text('avatar_url') ?? text('picture'),
  };
}

/** A saved Swami view: a label and the path it opens. */
export type SavedView = { id: string; label: string; path: string };

/** Only Swami paths are worth saving, and only short ones. The table checks too. */
export const isSwamiPath = (path: string) =>
  (path === '/swami' || path.startsWith('/swami?')) && path.length <= 200;
