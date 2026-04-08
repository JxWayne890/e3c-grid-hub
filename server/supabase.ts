import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

// Admin client — bypasses RLS, for server-side admin operations only
export const supabaseAdmin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey);

// Per-request client — respects RLS, scoped to the authenticated user
export function createRequestClient(accessToken: string) {
  return createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
