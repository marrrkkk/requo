import "server-only";

import { redirect } from "next/navigation";

import {
  getOptionalSession,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth/session";
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
 * Admin access gate. Checks the Better Auth session for an active
 * user with role = "admin" (database-backed via the Better Auth
 * admin plugin). Redirects to `/login` on any failure.
 */
export async function requireAdminUser(): Promise<AdminContext> {
  const session = await getOptionalSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/login");
  }

  return {
    session,
    user: session.user,
  };
}

/**
 * Console-shell gate for `(console)/layout.tsx`.
 *
 * Same identity check as `requireAdminUser`, but anyone without an admin
 * session — logged out or authenticated without the admin role — is sent
 * back to the main app's base URL. The admin subdomain stays
 * inaccessible to non-admins without a 404 and without an error page;
 * the admin login form itself lives outside this gate in `(auth)/login`.
 */
export async function requireAdminConsoleUser(): Promise<AdminContext> {
  const session = await getOptionalSession();

  if (session?.user.role !== "admin") {
    redirect(getMainAppUrl());
  }

  return {
    session,
    user: session.user,
  };
}

/**
 * Base origin of the main app (e.g. `http://localhost:3000` in dev,
 * `https://requo.app` in production).
 */
export function getMainAppUrl(): string {
  try {
    return new URL(env.BETTER_AUTH_URL).origin;
  } catch {
    return env.BETTER_AUTH_URL;
  }
}
