import "server-only";

import { redirect } from "next/navigation";

import { verifyAdminSession } from "@/lib/admin/auth";
import {
  getOptionalSession,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth/session";

/**
 * Context returned to admin pages, route handlers, and server actions
 * after the admin access gate succeeds.
 *
 * When the admin is authenticated via the JWT cookie (subdomain login),
 * `session` and `user` are synthetic placeholders. Mutations that need
 * a real Better Auth session should call `getOptionalSession()` directly.
 */
export type AdminContext = {
  readonly session: AuthSession;
  readonly user: AuthUser;
};

/** Synthetic admin identity used when only the JWT cookie is present. */
const SYNTHETIC_ADMIN_USER: AuthUser = {
  id: "admin-jwt",
  name: "Admin",
  email: process.env.ADMIN_USERNAME ?? "admin",
  emailVerified: true,
  image: null,
  banned: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const SYNTHETIC_ADMIN_SESSION: AuthSession = {
  session: {
    id: "admin-jwt-session",
    userId: "admin-jwt",
    token: "",
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: null,
    userAgent: null,
    impersonatedBy: null,
  },
  user: SYNTHETIC_ADMIN_USER,
};

/**
 * Admin access gate. Checks the admin JWT session cookie first.
 * Falls back to Better Auth session + email allow-list for backward
 * compatibility with mutations that need a real user identity.
 *
 * If neither auth method succeeds, redirects to `/login` which on the
 * admin subdomain resolves to the admin login page via middleware rewrite.
 */
export async function requireAdminUser(): Promise<AdminContext> {
  // Primary: check admin JWT cookie (subdomain login)
  const hasAdminSession = await verifyAdminSession();

  if (hasAdminSession) {
    // Try to also get a Better Auth session for richer context
    const betterAuthSession = await getOptionalSession();

    if (betterAuthSession?.user) {
      return {
        session: betterAuthSession,
        user: betterAuthSession.user,
      };
    }

    // JWT-only: return synthetic context
    return {
      session: SYNTHETIC_ADMIN_SESSION,
      user: SYNTHETIC_ADMIN_USER,
    };
  }

  // Fallback: check Better Auth session + admin email allow-list
  const session = await getOptionalSession();

  if (session?.user) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    if (
      session.user.emailVerified &&
      adminEmails.includes(session.user.email.trim().toLowerCase())
    ) {
      return { session, user: session.user };
    }
  }

  redirect("/login");
}
