import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import { constantTimeEqual, makeSignature } from "better-auth/crypto";
import { and, eq, gt } from "drizzle-orm";

import { isEmailInAdminAllowlist } from "@/features/admin/access";
import { db } from "@/lib/db/client";
import { session, user } from "@/lib/db/schema";
import { env } from "@/lib/env";

type BetterAuthCachedSession = {
  session: {
    expiresAt?: Date | string | null;
  } & Record<string, unknown>;
  user: {
    email?: string | null;
  } & Record<string, unknown>;
  updatedAt: number;
  version?: string;
};

const adminProxyLookupTimeoutMs = 5_000;

function isFutureDate(value: Date | string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = value instanceof Date ? value : new Date(value);

  return !Number.isNaN(date.getTime()) && date > new Date();
}

async function getAdminEmailFromCookieCache(headers: Headers) {
  const cachedSession = (await getCookieCache(headers, {
    isSecure: env.NODE_ENV === "production",
    secret: env.BETTER_AUTH_SECRET,
  })) as BetterAuthCachedSession | null;

  if (
    !cachedSession?.user?.email ||
    !isFutureDate(cachedSession.session?.expiresAt)
  ) {
    return null;
  }

  return cachedSession.user.email;
}

export async function getVerifiedBetterAuthSessionToken(headers: Headers) {
  const signedSessionToken = getSessionCookie(headers);

  if (!signedSessionToken) {
    return null;
  }

  let decodedToken: string;

  try {
    decodedToken = decodeURIComponent(signedSessionToken);
  } catch {
    decodedToken = signedSessionToken;
  }

  const signatureStartPosition = decodedToken.lastIndexOf(".");

  if (signatureStartPosition < 1) {
    return null;
  }

  const token = decodedToken.slice(0, signatureStartPosition);
  const signature = decodedToken.slice(signatureStartPosition + 1);

  if (signature.length !== 44 || !signature.endsWith("=")) {
    return null;
  }

  const expectedSignature = await makeSignature(token, env.BETTER_AUTH_SECRET);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  return token;
}

async function getAdminEmailFromSessionCookie(headers: Headers) {
  const sessionToken = await getVerifiedBetterAuthSessionToken(headers);

  if (!sessionToken) {
    return null;
  }

  const [row] = await db
    .select({
      email: user.email,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(and(eq(session.token, sessionToken), gt(session.expiresAt, new Date())))
    .limit(1);

  return row?.email ?? null;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(null as T), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function logAdminProxyWarning(message: string, error?: unknown) {
  if (env.NODE_ENV === "test") {
    return;
  }

  console.warn(
    `[admin] ${message}`,
    error instanceof Error ? { name: error.name, message: error.message } : "",
  );
}

export async function hasAdminProxyAccess(headers: Headers) {
  try {
    const cachedEmail = await getAdminEmailFromCookieCache(headers);

    if (isEmailInAdminAllowlist(cachedEmail, env.ADMIN_EMAILS)) {
      return true;
    }

    const sessionEmail = await withTimeout(
      getAdminEmailFromSessionCookie(headers),
      adminProxyLookupTimeoutMs,
    );

    return isEmailInAdminAllowlist(sessionEmail, env.ADMIN_EMAILS);
  } catch (error) {
    logAdminProxyWarning("Proxy admin check failed closed.", error);
    return false;
  }
}
