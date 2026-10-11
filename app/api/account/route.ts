// Saves a signed in person's team to his account.
//
// Called by AccountSync whenever the team is picked on a device while signed
// in. The account row is written as the person, under row level security, so
// this route cannot write anybody else's even if it tried. The push
// subscriptions are the exception: that table is service role only, so the
// team on every device he has signed in on is moved here, on the server, so
// the alerts about his team find him wherever he is.

import { parseTeam } from '@/lib/my-team';
import { writeClient } from '@/lib/supabase';
import { currentUser } from '@/lib/supabase-server';

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function POST(request: Request) {
  const session = await currentUser();
  if (!session) return json(401, { error: 'not signed in' });

  let body: { rosterId?: number | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json(400, { error: 'invalid body' });
  }
  const rosterId = body.rosterId == null ? null : parseTeam(String(body.rosterId));
  if (body.rosterId != null && rosterId == null) return json(400, { error: 'not a team' });

  const { user, client } = session;
  const saved = await client
    .from('accounts')
    .upsert(
      { user_id: user.id, roster_id: rosterId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (saved.error) return json(500, { error: 'could not save' });

  // Best effort. A database without the user_id column has no devices linked
  // to anybody yet, so there is nothing to move.
  await writeClient()
    ?.from('push_subscriptions')
    .update({ team_id: rosterId == null ? null : String(rosterId) })
    .eq('user_id', user.id);

  return json(200, { ok: true, rosterId });
}
