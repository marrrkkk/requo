import "server-only";

import { notFound } from "next/navigation";

import {
  getOptionalSession,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth/session";
import { env } from "@/lib/env";

/**
 * Context returned to admin pages, route handlers, and server actions
 * after the admin access gate succeeds. Shape matches the sketch in
 * `.kiro/specs/admin-console/design.md` (Access Gate Flow).
 */
export type AdminContext = {
  readonly session: AuthSession;
  readonly user: AuthUser;
};

/**
 * Split the raw `ADMIN_EMAILS` value into normalized, lowercased,
 * whitespace-trimmed entries. Empty entries (e.g. from a trailing or
 * duplicate comma) are dropped. Exported for tests.
 *
 * Per Requirement 1.5, an unset or empty list yields an empty array,
 * which makes every `isAdminEmail` check fail.
 */
export function parseAdminAllowList(
  raw: string | null | undefined,
): readonly string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/**
 * Parsed allow-list computed once from `env.ADMIN_EMAILS`. `env` is
 * evaluated at module load, so the derived list is stable for the
 * process lifetime.
 */
const parsedAdminAllowList: readonly string[] = parseAdminAllowList(
  env.ADMIN_EMAILS,
);

/**
 * Return the parsed, normalized allow-list derived from `ADMIN_EMAILS`.
 * Exposed so tests and other code can assert the parsed list directly
 * without re-splitting the raw env value.
 */
export function getParsedAdminAllowList(): readonly string[] {
  return parsedAdminAllowList;
}

/**
 * True when `email` (after trimming + lowercasing) is present in `list`.
 *
 * Case-insensitive, whitespace-trimmed comparison per Requirement 1.4.
 * Pure function — intentionally decoupled from env and DB state so it
 * can be exercised by unit and property tests.
 */
export function isAdminEmail(
  email: string,
  list: readonly string[],
): boolean {
  if (typeof email !== "string") {
    return false;
  }

  const normalized = email.trim().toLowerCase();

  if (normalized.length === 0) {
    return false;
  }

  if (list.length === 0) {
    return false;
  }

  return list.includes(normalized);
}

/**
 * Admin access gate. Composes the three checks defined by Requirement 1:
 *
 * 1. A Better Auth session must exist (Req 1.1).
 * 2. The signed-in user's `emailVerified` must be `true` (Req 1.3).
 * 3. The signed-in email must appear in `ADMIN_EMAILS` after
 *    whitespace-trimmed, case-insensitive normalization (Req 1.2, 1.4).
 *
 * Any failure triggers `notFound()`, which renders Next.js's 404 page
 * and keeps `/admin` undiscoverable to scanners (design decision in
 * `design.md`).
 *
 * Every admin page, route handler, and server action MUST call this
 * before performing any read or write, per Requirement 1.6.
 */
export async function requireAdminUser(): Promise<AdminContext> {
  const session = await getOptionalSession();

  if (!session) {
    notFound();
  }

  const { user } = session;

  if (!user || user.emailVerified !== true) {
    notFound();
  }

  if (!isAdminEmail(user.email, parsedAdminAllowList)) {
    notFound();
  }

  return { session, user };
}
