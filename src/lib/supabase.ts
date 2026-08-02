/* ============================================================
   Supabase clients.
   - browser/server anon client for reads under RLS
   - service-role client for server-only jobs (adapters, seed)
   Keys come from env; never hardcoded, never committed.
   ============================================================ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Anon client. Null when env is not configured (demo runs on the
 *  seeded scenario fixtures, so the UI never hard-depends on the DB). */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

/** Service-role client — SERVER ONLY. Used by adapters and seed
 *  scripts. Throws if called without the service key configured. */
export function getServiceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL not configured"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
