import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/public-env";

export function createSupabaseServerClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
