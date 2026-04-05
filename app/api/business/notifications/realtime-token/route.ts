import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/session";
import {
  createSupabaseRealtimeToken,
} from "@/lib/supabase/realtime-auth";
import { isSupabaseRealtimeConfigured } from "@/lib/env";

export async function GET() {
  if (!isSupabaseRealtimeConfigured) {
    return NextResponse.json(
      {
        error: "Supabase realtime is not configured.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 503,
      },
    );
  }

  const user = await requireUser();
  const token = createSupabaseRealtimeToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json(token, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
