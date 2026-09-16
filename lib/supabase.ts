// Supabase, Brief Section 3. Feed posts are written by the live watcher and
// read by the site, so the two paths use different keys on purpose.
//
// Verified against the live project before this was written: the anon key reads
// feed_posts fine and is refused on insert by row level security (42501), which
// is what makes it safe to ship in a public bundle. The service role key can
// insert and delete, and only ever runs inside a GitHub Action.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** True when the site can read. Pages degrade to an empty Feed rather than throwing. */
export const feedConfigured = Boolean(URL && ANON);

/** True when the watcher can write. */
export const writerConfigured = Boolean(URL && SERVICE);

let reader: SupabaseClient | null = null;
let writer: SupabaseClient | null = null;

/**
 * Read only client for the app. Returns null rather than throwing when the
 * project is not configured, so a missing env var shows an empty Feed instead
 * of a 500 on a page the tab bar links to from every screen.
 */
export function readClient(): SupabaseClient | null {
  if (!feedConfigured) return null;
  reader ??= createClient(URL, ANON, { auth: { persistSession: false } });
  return reader;
}

/**
 * Service role client for the live watcher. Never import this from anything
 * that renders: the key must not reach a browser bundle.
 */
export function writeClient(): SupabaseClient | null {
  if (!writerConfigured) return null;
  writer ??= createClient(URL, SERVICE, { auth: { persistSession: false } });
  return writer;
}
