// Subscribe and unsubscribe a device for push alerts.
//
// A server route rather than a direct Supabase write from the browser, because
// the public key is refused on insert into push_subscriptions by row level
// security. The service role only ever runs here, on the server.
//
// Keyed on the endpoint: a device that subscribes twice replaces its own row
// rather than doubling every alert it receives.

import { writeClient } from '@/lib/supabase';

type Body = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  teamId?: string | null;
  touchdowns?: boolean;
  leadChanges?: boolean;
  endpoint?: string;
};

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

  await client.from('push_subscriptions').delete().eq('endpoint', endpoint);
  const { error } = await client.from('push_subscriptions').insert({
    endpoint,
    p256dh,
    auth,
    team_id: body.teamId ?? null,
    alert_touchdowns: body.touchdowns ?? true,
    alert_lead_changes: body.leadChanges ?? true,
  });

  if (error) return json(500, { error: 'could not save' });
  return json(200, { ok: true });
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
