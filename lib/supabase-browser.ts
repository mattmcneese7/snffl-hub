'use client';

// The signed in half of Supabase, in the browser.
//
// The anon key is the same one lib/supabase.ts already ships in the public
// bundle. Row level security is what makes that safe: the accounts and saved
// views tables only ever return the rows whose user_id matches the session
// making the request, so this client can read and write a person's own rows
// and nobody else's.

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_KEY, AUTH_URL, authConfigured } from './auth';

let client: SupabaseClient | null = null;

/** Null when the project is not configured, so callers degrade instead of throwing. */
export function browserClient(): SupabaseClient | null {
  if (!authConfigured) return null;
  client ??= createBrowserClient(AUTH_URL, AUTH_KEY);
  return client;
}
