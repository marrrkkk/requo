import { NextResponse } from "next/server";

import { stopImpersonationAction } from "@/features/admin/mutations";

/**
 * POST /admin/stop-impersonating
 *
 * Ends the current impersonation session and restores the originating
 * admin's session cookie. Intentionally does NOT call
 * `requireAdminUser()` — during impersonation the active user IS the
 * impersonated target, which fails the allow-list check. The session
 * cookie's `impersonatedBy` tag is the authorization signal, and
 * `stopImpersonationAction` handles the no-op case when the caller
 * isn't currently impersonating (Req 8.3).
 *
 * Success → 303 See Other to `/admin` so the admin lands back on the
 * operations dashboard after the session cookie swap.
 *
 * Failure → 303 to `/` with the safe error in a query param. We can't
 * reliably redirect back to `/admin` on failure because the caller
 * may no longer be an admin if the underlying session was already
 * destroyed; `/` is the shared-safe fallback.
 */
export async function POST(request: Request) {
  const result = await stopImpersonationAction();

  if (result.ok) {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }

  const failureUrl = new URL(
    `/?error=${encodeURIComponent(result.error)}`,
    request.url,
  );
  return NextResponse.redirect(failureUrl, 303);
}
