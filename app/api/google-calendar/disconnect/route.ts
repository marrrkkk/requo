import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { googleCalendarConnections } from "@/lib/db/schema";
import { revokeGoogleToken } from "@/lib/google-calendar/client";

/**
 * POST /api/google-calendar/disconnect
 *
 * Removes the user's Google Calendar connection.
 * Attempts to revoke the token at Google (best-effort).
 */
export async function POST() {
  const user = await requireUser();

  const [connection] = await db
    .select({
      refreshToken: googleCalendarConnections.refreshToken,
      accessToken: googleCalendarConnections.accessToken,
    })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, user.id))
    .limit(1);

  if (connection) {
    // Best-effort revocation
    await revokeGoogleToken(connection.refreshToken);

    await db
      .delete(googleCalendarConnections)
      .where(eq(googleCalendarConnections.userId, user.id));
  }

  return Response.json({ ok: true });
}
