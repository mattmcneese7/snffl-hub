// Subscribe and unsubscribe a device for push alerts.
//
// A server route rather than a direct Supabase write from the browser, because
// the public key is refused on insert into push_subscriptions by row level
// security. The service role only ever runs here, on the server.
//
// Keyed on the endpoint: a device that subscribes twice replaces its own row
// rather than doubling every alert it receives.

import { defaultPrefs, prefsFor, type AlertPrefs } from '@/lib/alert-prefs';
import { writeClient } from '@/lib/supabase';

type Body = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  teamId?: string | null;
  touchdowns?: boolean;
  leadChanges?: boolean;
  endpoint?: string;
  prefs?: Partial<AlertPrefs> | null;
};

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

  const prefs = cleanPrefs(body.prefs);
  const row = {
    endpoint,
    p256dh,
    auth,
    team_id: body.teamId ?? null,
    alert_touchdowns: body.touchdowns ?? true,
    alert_lead_changes: body.leadChanges ?? true,
  };

  await client.from('push_subscriptions').delete().eq('endpoint', endpoint);
  let { error } = await client.from('push_subscriptions').insert({ ...row, prefs });
  // A database where the one time SQL has not run yet has no prefs column. The
  // device still subscribes; it just gets the defaults until the column exists.
  if (error && /prefs/.test(error.message)) {
    ({ error } = await client.from('push_subscriptions').insert(row));
  }

  if (error) return json(500, { error: 'could not save' });
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

  const { data, error } = await client
    .from('push_subscriptions')
    .select('*')
    .eq('endpoint', body.endpoint)
    .limit(1);
  if (error) return json(500, { error: 'could not read' });
  const existing = data?.[0];
  if (!existing) return json(404, { error: 'not subscribed' });

  // No prefs in the body means the caller only wants to know the current ones.
  if (!body.prefs) return json(200, { ok: true, prefs: prefsFor(existing) });

  // Only the keys the device actually sent change. Spreading a cleaned full
  // object over the stored one would quietly reset every type it left out.
  const prefs = prefsFor(existing);
  for (const [key, value] of Object.entries(body.prefs)) {
    if (typeof value === 'boolean' && key in prefs) prefs[key as keyof AlertPrefs] = value;
  }
  const update = await client.from('push_subscriptions').update({ prefs }).eq('endpoint', body.endpoint);
  if (update.error) return json(500, { error: 'could not save' });
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
