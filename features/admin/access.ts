import "server-only";

import { redirect } from "next/navigation";

import {
  getOptionalSession,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth/session";

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
