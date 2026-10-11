'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TEAM_EVENT } from '@/lib/auth';
import { parseTeam, readMyTeam, setMyTeam, TEAM_STORAGE_KEY } from '@/lib/my-team';
import { browserClient } from '@/lib/supabase-browser';
import { PUSH_LINKED_KEY } from '@/lib/use-account';

/**
 * Keeps a signed in device's team in step with the account. Renders nothing.
 *
 * The device cookie stays the one thing every page reads, so no page had to
 * learn about accounts. What changes is who writes the cookie: signed in, the
 * account is the source and the cookie is its copy on this device.
 *
 *   On load    the account's team is copied to this device if it differs,
 *              which is how a team picked on a laptop reaches the phone.
 *   On a pick  the new team is copied up to the account.
 *
 * Nobody signed in, it reads one cookie, finds no session, and stops.
 */
export default function AccountSync() {
  const router = useRouter();

  useEffect(() => {
    const client = browserClient();
    if (!client) return;
    let userId: string | null = null;
    let accountTeam: number | null = null;

    const saveTeam = (rosterId: number | null) => {
      if (!userId || rosterId === accountTeam) return;
      accountTeam = rosterId;
      void fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterId }),
        // A pick is often followed straight away by a navigation.
        keepalive: true,
      }).catch(() => {});
    };

    const onPick = (event: Event) => saveTeam((event as CustomEvent<number | null>).detail ?? null);
    window.addEventListener(TEAM_EVENT, onPick);

    (async () => {
      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      userId = user.id;

      const { data: account, error } = await client
        .from('accounts')
        .select('roster_id')
        .eq('user_id', user.id)
        .maybeSingle();
      // No table yet, or no row: the device keeps its own pick.
      if (!error && account) {
        accountTeam = parseTeam(account.roster_id != null ? String(account.roster_id) : null);
        const device = readMyTeam();
        let stored: number | null = null;
        try {
          stored = parseTeam(localStorage.getItem(TEAM_STORAGE_KEY));
        } catch {}
        if (accountTeam && (accountTeam !== device || accountTeam !== stored)) {
          // Both homes, so the components still reading storage agree too.
          setMyTeam(accountTeam);
          if (accountTeam !== device) router.refresh();
        } else if (!accountTeam && device) {
          saveTeam(device);
        }
      }

      // Once a session, a device that already had alerts on is claimed for
      // the account, so its settings follow the person from here on.
      try {
        if (sessionStorage.getItem(PUSH_LINKED_KEY) === user.id) return;
        const registration = await navigator.serviceWorker?.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          const res = await fetch('/api/push', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          if (!res.ok) return;
        }
        sessionStorage.setItem(PUSH_LINKED_KEY, user.id);
      } catch {
        // No service worker, or storage refused. Tried again next visit.
      }
    })().catch(() => {});

    return () => window.removeEventListener(TEAM_EVENT, onPick);
  }, [router]);

  return null;
}
