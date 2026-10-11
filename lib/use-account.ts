'use client';

import { useEffect, useState } from 'react';
import { authConfigured, describeUser, type AccountUser } from './auth';
import { browserClient } from './supabase-browser';

/**
 * Who is signed in on this device, for the controls that change when somebody
 * is. Reads the session from its cookie, so for a visitor who has never
 * signed in this costs nothing and makes no request.
 *
 *   off      the project is not configured, so there is no sign in to offer
 *   loading  not read yet, so nothing should render that might flash
 *   out      nobody signed in, which is the normal case
 *   in       signed in, with what Google told us about them
 */
export type AccountState =
  | { status: 'off' | 'loading' | 'out'; user: null }
  | { status: 'in'; user: AccountUser };

export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>({
    status: authConfigured ? 'loading' : 'off',
    user: null,
  });

  useEffect(() => {
    const client = browserClient();
    if (!client) return;
    let live = true;
    const apply = (user: Parameters<typeof describeUser>[0] | null | undefined) => {
      if (!live) return;
      setState(user ? { status: 'in', user: describeUser(user) } : { status: 'out', user: null });
    };
    client.auth
      .getSession()
      .then(({ data }) => apply(data.session?.user))
      .catch(() => apply(null));
    const { data } = client.auth.onAuthStateChange((_event, session) => apply(session?.user));
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Signs out on this device. The device's push subscription stops following
 * the account first, while the session still proves whose it is, and the
 * team picked on this device stays exactly where it is.
 */
export async function signOut() {
  const client = browserClient();
  if (!client) return;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/push', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint, unlink: true }),
      });
    }
  } catch {
    // Alerts keep working either way; the device just stays linked.
  }
  try {
    sessionStorage.removeItem(PUSH_LINKED_KEY);
  } catch {}
  await client.auth.signOut({ scope: 'local' });
}

/** Set once a session has linked this device's alerts, so it happens once. */
export const PUSH_LINKED_KEY = 'snffl.pushLinked';

/** Starts the Google round trip and comes back to `next`. */
export async function signInWithGoogle(next = '/account') {
  const client = browserClient();
  if (!client) return { error: 'off' as const };
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { prompt: 'select_account' } },
  });
  return { error: error ? ('failed' as const) : null };
}
