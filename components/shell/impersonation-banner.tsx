import "server-only";

import { eq } from "drizzle-orm";
import { UserCog } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getOptionalSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { user as userTable } from "@/lib/db/schema";

/**
 * Persistent banner shown on every authenticated layout while the
 * current session is an impersonation session (Requirement 8.2 /
 * 8.3).
 *
 * Server component. Reads `session.session.impersonatedBy` — the tag
 * the Better Auth admin plugin stamps on a session cookie when an
 * admin starts impersonating another user. If the tag is absent, the
 * banner renders nothing.
 *
 * Race handling:
 *
 * - If the originating admin user was deleted mid-session, we still
 *   surface the banner (so the admin can always click Stop) but drop
 *   back to a generic "an admin session" label since we can't safely
 *   attribute the session.
 * - If the impersonated target was deleted mid-session, the session
 *   cookie still carries the stale user id; `getOptionalSession`
 *   returns whatever Better Auth returns, which may be a minimal
 *   `user` payload. Fall back to "an unavailable user" and keep the
 *   Stop control available.
 *
 * Stop Impersonating is a plain `<form method="POST">` so it works
 * without JavaScript and avoids pulling a client component into every
 * authenticated layout. The route handler at
 * `/admin/stop-impersonating` clears the impersonation cookie and
 * redirects back to `/admin`.
 */
export async function ImpersonationBanner() {
  const authSession = await getOptionalSession();
  const impersonatedBy = authSession?.session?.impersonatedBy ?? null;

  // Fast path: not an impersonation session (or no session at all).
  if (!authSession || !impersonatedBy) {
    return null;
  }

  const [impersonatedUser, adminRow] = await Promise.all([
    resolveImpersonatedUserLabel(authSession.user.id),
    resolveAdminLabel(impersonatedBy),
  ]);

  const targetLabel = impersonatedUser ?? "an unavailable user";
  const adminLabel = adminRow ?? "an admin session";

  return (
    <Alert role="status" className="mb-4 border-primary/25">
      <UserCog />
      <AlertTitle>Impersonating {targetLabel}</AlertTitle>
      <AlertDescription>Started by {adminLabel}.</AlertDescription>
      <AlertAction>
        <form action="/admin/stop-impersonating" method="POST">
          <Button size="sm" type="submit" variant="outline">
            Stop impersonating
          </Button>
        </form>
      </AlertAction>
    </Alert>
  );
}

/**
 * Return the impersonated user's email if we can still find them,
 * otherwise `null` so the caller can render the deleted-user
 * fallback. We prefer a fresh DB read over `session.user.email` so
 * the banner reflects a cascade delete immediately instead of the
 * cookie's cached copy.
 */
async function resolveImpersonatedUserLabel(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return row?.email ?? null;
}

/**
 * Resolve the originating admin's email. Returns `null` when the
 * admin row no longer exists (rare but possible if the admin was
 * deleted mid-session).
 */
async function resolveAdminLabel(adminUserId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, adminUserId))
    .limit(1);

  return row?.email ?? null;
}
