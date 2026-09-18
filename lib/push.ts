// Push alerts, Brief Section 2 and the chug reminders in docs/DECISIONS.md.
//
// Server side only. Sends through web-push with the project's VAPID keys to the
// devices stored in push_subscriptions, which only the service role can write:
// the public key is refused on insert by row level security, checked against
// the live project before this was written.
//
// Who hears what, so an alert is useful rather than noise:
//   touchdowns   to anyone who opted in, since a touchdown is the thing people
//                install the app for
//   lead changes only to the two managers in that matchup, because a lead
//                change in somebody else's game is not news to you
//   chug         only to the manager who owes one
//
// A subscription the push service reports as gone, 404 or 410, is deleted so
// dead devices stop costing a request every five minutes.

import webpush from 'web-push';
import { writeClient } from './supabase.ts';

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';

/**
 * The site rather than an email address. VAPID asks for a contact, and a push
 * service is not somewhere a personal address needs to go.
 */
const SUBJECT = 'https://www.squirtnite.live';

export const pushConfigured = () => Boolean(PUBLIC && PRIVATE);

let ready = false;
function setup(): boolean {
  if (ready) return true;
  if (!pushConfigured()) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  ready = true;
  return true;
}

export type AlertPayload = {
  title: string;
  body: string;
  url?: string;
  /** Replaces an earlier alert about the same thing instead of stacking. */
  tag?: string;
};

type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  team_id: string | null;
  alert_touchdowns: boolean | null;
  alert_lead_changes: boolean | null;
};

export type Audience =
  | { kind: 'touchdown' }
  | { kind: 'lead_change'; teamIds: string[] }
  | { kind: 'chug'; teamId: string };

async function subscribersFor(audience: Audience): Promise<Subscription[]> {
  const client = writeClient();
  if (!client) return [];

  let query = client.from('push_subscriptions').select('*');
  if (audience.kind === 'touchdown') query = query.eq('alert_touchdowns', true);
  if (audience.kind === 'lead_change') {
    query = query.eq('alert_lead_changes', true).in('team_id', audience.teamIds);
  }
  if (audience.kind === 'chug') query = query.eq('team_id', audience.teamId);

  const { data } = await query;
  return (data ?? []) as Subscription[];
}

/** Sends one alert to its audience. Returns how many devices it reached. */
export async function sendAlert(audience: Audience, payload: AlertPayload): Promise<number> {
  if (!setup()) return 0;

  const subscribers = await subscribersFor(audience);
  if (!subscribers.length) return 0;

  const client = writeClient();
  const body = JSON.stringify(payload);
  let delivered = 0;
  const dead: string[] = [];

  await Promise.all(
    subscribers.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 }
        );
        delivered++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(sub.id);
      }
    })
  );

  if (dead.length && client) {
    await client.from('push_subscriptions').delete().in('id', dead);
  }

  return delivered;
}
