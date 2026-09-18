import type { AdminIdentityCandidate } from "@/lib/auth/admin-identity";

/**
 * Proxy-only session bridge.
 *
 * `proxy.ts` must not import `@/lib/auth/config` at module scope. That graph
 * pulls the Drizzle adapter and `postgres`, and Next compiles the proxy into its
 * own webpack layer (`WEBPACK_LAYERS.middleware`), so it is a separate module
 * graph — in production `lib/db/client.ts` skips its `globalThis` cache and a
 * second connection pool would be constructed. Deferring the import behind
 * `await import()` means the graph is only evaluated once a `/admin` request
 * actually needs it.
 *
 * Note the import being deferred does **not** make the check expensive: with
 * `session.cookieCache.enabled` and no `refreshCache`, Better Auth resolves a
 * warm cookie cache without querying the database at all, and `postgres()`
 * connects lazily. Only a cache-miss `/admin` request (the `session_data`
 * cookie is gone after ~5 minutes idle) reaches the database.
 */
export async function getAdminGateUser(
  headers: Headers,
): Promise<AdminIdentityCandidate | null> {
  try {
    const { auth } = await import("@/lib/auth/config");

    const session = await auth.api.getSession({
      headers,
      // Read-only: the proxy must not extend the session or re-issue cookies,
      // because it cannot propagate `Set-Cookie` from an API call the way a
      // route handler can. `disableRefresh` leaves the cookie cache intact, so
      // this stays the fast path.
      query: { disableRefresh: true },
    });

    if (!session?.user) {
      return null;
    }

    return {
      email: session.user.email,
      role: session.user.role,
      banned: session.user.banned,
    };
  } catch (error) {
    // Fail closed: an unreadable session is treated as no session, so the
    // caller redirects to `/login` instead of admitting the request. This
    // trades an auth-system outage for a login bounce on `/admin` only.
    console.error("[proxy] admin gate session lookup failed", error);
    return null;
  }
}
