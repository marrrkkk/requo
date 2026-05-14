import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/public-env";

/**
 * Creates a singleton Supabase client for use in Client Components.
 *
 * Auth is handled by Better Auth — this client is used for Supabase Storage,
 * Realtime subscriptions, and direct PostgREST queries only.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      isSingleton: true,
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
