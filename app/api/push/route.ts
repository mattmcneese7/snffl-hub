// Subscribe and unsubscribe a device for push alerts.
//
// A server route rather than a direct Supabase write from the browser, because
// the public key is refused on insert into push_subscriptions by row level
// security. The service role only ever runs here, on the server.
//
// Keyed on the endpoint: a device that subscribes twice replaces its own row
// rather than doubling every alert it receives.
//
// Signed in, a device also carries the person's user id, and its team and
// alert settings come from the account rather than from the device. Changing a
// setting on one device then changes it on every device he has signed in on,
// because the watcher reads each device's row and every one of them is
// written. Not signed in, none of that happens and nothing here behaves any
// differently from before accounts existed.

import type { SupabaseClient } from '@supabase/supabase-js';
import { defaultPrefs, prefsFor, type AlertPrefs } from '@/lib/alert-prefs';
import { writeClient } from '@/lib/supabase';
import { currentUser } from '@/lib/supabase-server';

type Body = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  teamId?: string | null;
  touchdowns?: boolean;
  leadChanges?: boolean;
  endpoint?: string;
  prefs?: Partial<AlertPrefs> | null;
  /** Signing out: this device stops following the account. */
  unlink?: boolean;
};

type Account = { roster_id: number | null; prefs: Partial<AlertPrefs> | null };

/**
 * The signed in person and his account row, read as him under row level
 * security. Null when nobody is signed in, and an account of null when the
 * accounts table has not been made yet, which leaves every device on its own
 * settings exactly as before.
 */
async function signedIn(): Promise<{ userId: string; client: SupabaseClient; account: Account | null } | null> {
  const session = await currentUser();
  if (!session) return null;
  const { data, error } = await session.client
    .from('accounts')
    .select('roster_id, prefs')
    .eq('user_id', session.user.id)
    .maybeSingle();
  return { userId: session.user.id, client: session.client, account: error ? null : (data as Account | null) };
}

/** Saves the account's copy of the settings. Best effort, like everything here. */
async function saveAccountPrefs(who: { userId: string; client: SupabaseClient }, prefs: AlertPrefs) {
  await who.client
    .from('accounts')
    .update({ prefs, updated_at: new Date().toISOString() })
    .eq('user_id', who.userId);
}

/** Only the keys we know, and only booleans, whatever the body claims. */
function cleanPrefs(input: Partial<AlertPrefs> | null | undefined): AlertPrefs {
  const out = defaultPrefs();
  for (const [key, value] of Object.entries(input ?? {})) {
    if (key in out && typeof value === 'boolean') out[key as keyof AlertPrefs] = value;
  }
  return out;
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function POST(request: Request) {
  const client = writeClient();
  if (!client) return json(503, { error: 'alerts are not configured' });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json(400, { error: 'invalid body' });
  }

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return json(400, { error: 'incomplete subscription' });

  // Only a real push service. Anything else is not a device we can reach, and
  // accepting arbitrary URLs would let this route be pointed at other hosts.
  let host: string;
  try {
    host = new URL(endpoint).host;
  } catch {
    return json(400, { error: 'bad endpoint' });
  }
  const known = /(^|\.)(googleapis\.com|mozilla\.com|mozaws\.net|push\.apple\.com|windows\.com)$/;
  if (!known.test(host)) return json(400, { error: 'unrecognised push service' });

  const who = await signedIn();
  const account = who?.account ?? null;
  // An account that already has settings gives them to the new device, so a
  // second phone hears what the first one does without being set up again.
  const prefs = account?.prefs ? prefsFor({ prefs: account.prefs }) : cleanPrefs(body.prefs);
  const row: Record<string, unknown> = {
    endpoint,
    p256dh,
    auth,
    team_id: account?.roster_id != null ? String(account.roster_id) : (body.teamId ?? null),
    alert_touchdowns: body.touchdowns ?? true,
    alert_lead_changes: body.leadChanges ?? true,
    prefs,
  };
  if (who) row.user_id = who.userId;

  await client.from('push_subscriptions').delete().eq('endpoint', endpoint);
  let { error } = await client.from('push_subscriptions').insert(row);
  // A database where a one time SQL file has not run yet is missing a column:
  // prefs before 12b-alerts.sql, user_id before 17b-accounts.sql. The device
  // still subscribes; it just goes without whichever column is missing.
  for (const column of ['user_id', 'prefs']) {
    if (error && error.message.includes(column)) {
      delete row[column];
      ({ error } = await client.from('push_subscriptions').insert(row));
    }
  }

  if (error) return json(500, { error: 'could not save' });
  // The first device to subscribe after signing in sets the account's copy.
  if (who && account && !account.prefs) await saveAccountPrefs(who, prefs);
  return json(200, { ok: true, prefs });
}

/**
 * Reads or changes one device's alert settings. A POST rather than a GET with
 * the endpoint in the query string, because a push endpoint identifies a
 * device and does not belong in a URL.
 */
export async function PATCH(request: Request) {
  const client = writeClient();
  if (!client) return json(503, { error: 'alerts are not configured' });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json(400, { error: 'invalid body' });
  }
  if (!body.endpoint) return json(400, { error: 'no endpoint' });

  const who = await signedIn();

  // Signing out. The device keeps its alerts and its current settings, and
  // simply stops being changed from the person's other devices.
  if (body.unlink) {
    if (who) {
      await client
        .from('push_subscriptions')
        .update({ user_id: null })
        .eq('endpoint', body.endpoint)
        .eq('user_id', who.userId);
    }
    return json(200, { ok: true });
  }

  const { data, error } = await client
    .from('push_subscriptions')
    .select('*')
    .eq('endpoint', body.endpoint)
    .limit(1);
  if (error) return json(500, { error: 'could not read' });
  const existing = data?.[0];
  if (!existing) return json(404, { error: 'not subscribed' });

  // Signed in on a device that subscribed before he did: claim it, so it
  // follows the account from here on. Only the device knows its endpoint, so
  // holding one is proof enough that this is his device.
  if (who && existing.user_id !== who.userId) {
    const claim: Record<string, unknown> = { user_id: who.userId };
    if (who.account?.roster_id != null) claim.team_id = String(who.account.roster_id);
    await client.from('push_subscriptions').update(claim).eq('endpoint', body.endpoint);
  }

  // Whose settings these are: the account's when it has some, the device's
  // otherwise.
  const base = who?.account?.prefs ? prefsFor({ prefs: who.account.prefs }) : prefsFor(existing);

  // No prefs in the body means the caller only wants to know the current ones.
  if (!body.prefs) {
    if (who?.account) {
      if (who.account.prefs) {
        await client.from('push_subscriptions').update({ prefs: base }).eq('endpoint', body.endpoint);
      } else {
        await saveAccountPrefs(who, base);
      }
    }
    return json(200, { ok: true, prefs: base });
  }

  // Only the keys the device actually sent change. Spreading a cleaned full
  // object over the stored one would quietly reset every type it left out.
  const prefs = base;
  for (const [key, value] of Object.entries(body.prefs)) {
    if (typeof value === 'boolean' && key in prefs) prefs[key as keyof AlertPrefs] = value;
  }
  const update = await client.from('push_subscriptions').update({ prefs }).eq('endpoint', body.endpoint);
  if (update.error) return json(500, { error: 'could not save' });
  if (who?.account) {
    await saveAccountPrefs(who, prefs);
    await client.from('push_subscriptions').update({ prefs }).eq('user_id', who.userId);
  }
  return json(200, { ok: true, prefs });
}

export async function DELETE(request: Request) {
  const client = writeClient();
  if (!client) return json(503, { error: 'alerts are not configured' });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json(400, { error: 'invalid body' });
  }
  if (!body.endpoint) return json(400, { error: 'no endpoint' });

  await client.from('push_subscriptions').delete().eq('endpoint', body.endpoint);
  return json(200, { ok: true });
}
