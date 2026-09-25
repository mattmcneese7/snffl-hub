// One place to record that an alert has been sent, Checkpoint 12b.
//
// The watcher runs every minute and the publisher runs hourly on a Tuesday
// until it fires, so anything that is not already a feed post needs its own
// record or it would be sent again on the next run. Claiming happens before
// sending: the insert is ON CONFLICT DO NOTHING, so of two overlapping runs
// only one gets the key back and only that one sends.
//
// A database where the one time SQL has not run yet claims nothing, which
// sends nothing. Silence is the safe failure here; the alternative is an alert
// every minute.

import { writeClient } from './supabase.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Claim = {
  /** Unique for the thing being announced, such as final:3:5:11. */
  key: string;
  week: number;
  kind: string;
};

export async function claimAlerts(rows: Claim[], client?: SupabaseClient | null): Promise<Set<string>> {
  const db = client ?? writeClient();
  if (!db || !rows.length) return new Set();
  const { data, error } = await db
    .from('alert_claims')
    .upsert(rows, { onConflict: 'key', ignoreDuplicates: true })
    .select('key');
  if (error) return new Set();
  return new Set((data ?? []).map((row) => (row as { key: string }).key));
}
