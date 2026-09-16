import "server-only";

import { eq } from "drizzle-orm";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";

import {
  getOptionalSession,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { env } from "@/lib/env";

/**
 * Context returned to admin pages, route handlers, and server actions
 * after the admin access gate succeeds. The user always has a real
 * Better Auth session with a role checked against the database.
 */
export type AdminContext = {
  readonly session: AuthSession;
  readonly user: AuthUser;
};

/**
 * Whether the email is in the `ADMIN_EMAILS` allowlist.
 *
 * The allowlist is what the owner actually configures, so it doubles as a
 * runtime fallback: an account signed in with an allowlisted email is
 * admitted even when its `role` column has not been promoted yet (e.g. the
 * bootstrap script has not re-run).
 */
function isAllowlistedAdminEmail(email: string): boolean {
  const allowlist = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.trim().toLowerCase());
}

type SessionAdminCandidate = Pick<AuthUser, "id" | "email"> & {
  role?: string | null;
};

/**
 * Resolve admin access for a session user.
 *
 * Fast path first (`role === "admin"` straight from the session, no extra
 * query), then a single primary-key lookup that bypasses Better Auth's
 * session `cookieCache` — the cached cookie keeps serving the pre-promotion
 * role until `updateAge` elapses, so without this a freshly promoted admin
 * is bounced until they sign in again. Banned users are always refused,
 * even when allowlisted.
 *
 * Memoized per request: the console shell streams the gate from several
 * independent Suspense slots (sidebar menu, mobile menu, theme sync) while
 * page regions and queries re-check it, so without this the DB fallback
 * would run once per slot.
 */
const isAdminSessionUser = cache(
  async (candidate: SessionAdminCandidate): Promise<boolean> => {
  if (candidate.role === "admin") {
    return true;
  }

  const [row] = await db
    .select({ role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, candidate.id))
    .limit(1);

  if (!row || row.banned) {
    return false;
  }

  if (row.role === "admin") {
    return true;
  }

  return isAllowlistedAdminEmail(candidate.email);
  },
);

/**
 * Admin access gate for page bodies, queries, mutations, and actions.
 *
 * - **No session** → `/login`. They are not forbidden, just unauthenticated.
 * - **Signed in without admin access** → `forbidden()` (403). Deliberately
 *   not a 404: the console lives at the guessable `/admin` path, so hiding
 *   its existence is already impossible — a 403 says "no" honestly.
 */
export async function requireAdminUser(): Promise<AdminContext> {
  const session = await getOptionalSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!(await isAdminSessionUser(session.user))) {
    forbidden();
  }

  return {
    session,
    user: session.user,
  };
}

/**
 * Console-shell gate for `app/admin/layout.tsx`.
 *
 * Same check and same rejections as `requireAdminUser` — path-only serving
 * means there is no second host whose response must differ, so this just
 * delegates. This runs before the layout renders any chrome (see the layout
 * for why that ordering is load-bearing).
 */
export async function requireAdminConsoleUser(): Promise<AdminContext> {
  return requireAdminUser();
}
