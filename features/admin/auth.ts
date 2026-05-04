import "server-only";

import { headers } from "next/headers";

import { isEmailInAdminAllowlist } from "@/features/admin/access";
import { getOptionalSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import type { AdminContext, AdminRequestMetadata } from "@/features/admin/types";

export { parseAdminEmailAllowlist } from "@/features/admin/access";

export class AdminAuthorizationError extends Error {
  constructor() {
    super("Not found.");
    this.name = "AdminAuthorizationError";
  }
}

export function isAdminEmail(
  email: string | null | undefined,
  allowlist = env.ADMIN_EMAILS,
) {
  return isEmailInAdminAllowlist(email, allowlist);
}

export function isAdminUser(
  user: { email?: string | null } | null | undefined,
) {
  return isAdminEmail(user?.email);
}

export async function requireAdminOrNull(): Promise<AdminContext | null> {
  const session = await getOptionalSession();

  if (!session?.user || !isAdminUser(session.user)) {
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

export async function requireAdminOrThrow(): Promise<AdminContext> {
  const admin = await requireAdminOrNull();

  if (!admin) {
    throw new AdminAuthorizationError();
  }

  return admin;
}

function truncateHeaderValue(value: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 500);
}

export async function getAdminRequestMetadata(): Promise<AdminRequestMetadata> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim() ?? null;

  return {
    ipAddress: truncateHeaderValue(
      requestHeaders.get("cf-connecting-ip") ??
        requestHeaders.get("x-real-ip") ??
        forwardedIp,
    ),
    userAgent: truncateHeaderValue(requestHeaders.get("user-agent")),
  };
}
