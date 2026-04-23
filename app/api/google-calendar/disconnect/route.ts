import { requireUser } from "@/lib/auth/session";
import { removeCalendarConnection } from "@/features/calendar/mutations";
import { getCalendarConnectionRecord } from "@/features/calendar/queries";
import { revokeGoogleToken } from "@/lib/google-calendar/client";

/**
 * POST /api/google-calendar/disconnect
 *
 * Removes the user's Google Calendar connection.
 * Attempts to revoke the token at Google (best-effort).
 */
export async function POST() {
  const user = await requireUser();
  const connection = await getCalendarConnectionRecord(user.id);

  if (connection) {
    // Best-effort revocation
    await revokeGoogleToken(connection.refreshToken);
  }

  await removeCalendarConnection(user.id);

  return Response.json({ ok: true });
}
