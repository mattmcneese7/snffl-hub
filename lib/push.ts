// Push alerts, Brief Section 2 and the chug reminders in docs/DECISIONS.md.
//
// Server side only. Sends through web-push with the project's VAPID keys to the
// devices stored in push_subscriptions, which only the service role can write:
// the public key is refused on insert by row level security, checked against
// the live project before this was written.
//
// Who hears what is a preference per device, in lib/alert-prefs.ts. The rule
// behind the list: an alert should be about you. Your players scoring, your
// opponent scoring, your lead changing, your lineup, your chug. Every
// touchdown in the league is available and off by default, because that was
// the original behaviour and it was noise.
//
// A subscription the push service reports as gone, 404 or 410, is deleted so
// dead devices stop costing a request every five minutes.

import webpush from 'web-push';
import { prefsFor, type AlertKey, type AlertPrefs } from './alert-prefs.ts';
import { writeClient } from './supabase.ts';

// || rather than ??: an unset secret arrives as an empty string, which ??
// keeps, and empty VAPID keys silently disable every push. See lib/supabase.ts.
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

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
  prefs?: Partial<AlertPrefs> | null;
};

/**
 * Who hears an alert: everyone who wants that type, or only the managers
 * named. `except` keeps a general alert away from the people who already got
 * the personal version of it, so a touchdown does not arrive twice.
 */
export type Audience = {
  alert: AlertKey;
  /** Roster ids as text. Undefined means every device that wants the type. */
  teamIds?: string[];
  except?: string[];
};

async function subscribersFor(audience: Audience): Promise<Subscription[]> {
  const client = writeClient();
  if (!client) return [];

  // Filtering happens here rather than in the query: preferences live in a
  // jsonb column on newer rows and in two booleans on older ones, and a
  // database without the column at all still has to work. The league is 14
  // people, so reading every row costs nothing.
  let rows: Subscription[] = [];
  const full = await client.from('push_subscriptions').select('*');
  if (full.error) return [];
  rows = (full.data ?? []) as Subscription[];

  const wanted = audience.teamIds ? new Set(audience.teamIds) : null;
  const excluded = audience.except ? new Set(audience.except) : null;

  return rows.filter((row) => {
    if (!prefsFor(row)[audience.alert]) return false;
    if (wanted && (!row.team_id || !wanted.has(row.team_id))) return false;
    if (excluded && row.team_id && excluded.has(row.team_id)) return false;
    return true;
  });
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
