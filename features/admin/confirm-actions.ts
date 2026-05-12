"use server";

/**
 * Client-callable server actions for the admin password re-confirmation
 * gate (Requirement 9).
 *
 * This module is deliberately separate from `features/admin/confirm.ts`
 * so that client components (e.g. `confirm-password-dialog.tsx`) can
 * import the issue-token action without also pulling in the
 * `server-only`-guarded helpers (`consumePasswordConfirmToken` and its
 * server-side imports). Using a top-level `"use server"` directive
 * turns every export below into a server action reference when
 * imported from the client.
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { requireAdminUser } from "@/features/admin/access";
import { ADMIN_PASSWORD_CONFIRM_TTL_SECONDS } from "@/features/admin/constants";
import { adminPasswordConfirmSchema } from "@/features/admin/schemas";
import type { AdminActionResult } from "@/features/admin/types";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { rateLimit, verification } from "@/lib/db/schema";

/* ── Constants ───────────────────────────────────────────────────────────── */

/** Opaque token byte length. 32 bytes ≈ 43 base64url chars. */
const CONFIRM_TOKEN_BYTES = 32;

/** Max attempts per admin per window (matches the policy in design.md). */
const CONFIRM_RATE_LIMIT_MAX = 5;

/** Rate-limit window in seconds (matches `ADMIN_PASSWORD_CONFIRM_TTL_SECONDS`). */
const CONFIRM_RATE_LIMIT_WINDOW_SECONDS = 300;

/** Identifier prefix used on the `verification` table for confirm tokens. */
const CONFIRM_IDENTIFIER_PREFIX = "admin:confirm";

/** Rate-limit key prefix (Better Auth's DB rate limiter schema). */
const CONFIRM_RATE_LIMIT_KEY_PREFIX = "admin:confirm";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function createTokenId(): string {
  return `ac_${randomUUID().replace(/-/g, "")}`;
}

function generateRawConfirmToken(): string {
  return randomBytes(CONFIRM_TOKEN_BYTES).toString("base64url");
}

function hashConfirmToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function buildConfirmIdentifier(adminUserId: string, nonce: string): string {
  return `${CONFIRM_IDENTIFIER_PREFIX}:${adminUserId}:${nonce}`;
}

function buildConfirmRateLimitKey(adminUserId: string): string {
  return `${CONFIRM_RATE_LIMIT_KEY_PREFIX}:${adminUserId}`;
}

/**
 * Per-admin attempt limit enforced directly on the `rate_limit` table.
 * Returns `true` when the attempt is allowed (and increments the
 * counter), `false` when the cap is exceeded.
 */
async function assertConfirmAttemptAllowed(
  adminUserId: string,
): Promise<boolean> {
  const key = buildConfirmRateLimitKey(adminUserId);
  const now = Date.now();
  const windowMs = CONFIRM_RATE_LIMIT_WINDOW_SECONDS * 1000;

  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: rateLimit.id,
          key: rateLimit.key,
          count: rateLimit.count,
          lastRequest: rateLimit.lastRequest,
        })
        .from(rateLimit)
        .where(eq(rateLimit.key, key))
        .limit(1);

      if (!existing) {
        await tx.insert(rateLimit).values({
          id: createTokenId(),
          key,
          count: 1,
          lastRequest: now,
        });
        return true;
      }

      const lastRequestMs = Number(existing.lastRequest);
      const outsideWindow = now - lastRequestMs > windowMs;

      if (outsideWindow) {
        await tx
          .update(rateLimit)
          .set({ count: 1, lastRequest: now })
          .where(eq(rateLimit.key, key));
        return true;
      }

      if (existing.count >= CONFIRM_RATE_LIMIT_MAX) {
        return false;
      }

      await tx
        .update(rateLimit)
        .set({ count: existing.count + 1, lastRequest: now })
        .where(eq(rateLimit.key, key));
      return true;
    });
  } catch (error) {
    // Fail closed — the confirmation gate is a security boundary.
    console.error("Failed to check admin confirm rate limit.", error);
    return false;
  }
}

/* ── Token issuance ──────────────────────────────────────────────────────── */

/**
 * Server action invoked by `ConfirmPasswordDialog`. Validates the
 * admin's password against Better Auth and returns a single-use token
 * to present to the follow-up destructive action.
 */
export async function issuePasswordConfirmTokenAction(input: {
  password: string;
}): Promise<AdminActionResult<{ token: string; expiresAt: string }>> {
  const { user } = await requireAdminUser();

  const parsed = adminPasswordConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter your password to continue.",
    };
  }

  const allowed = await assertConfirmAttemptAllowed(user.id);
  if (!allowed) {
    return {
      ok: false,
      error: "Too many attempts. Try again in a few minutes.",
    };
  }

  try {
    const requestHeaders = await headers();
    const result = await auth.api.verifyPassword({
      body: { password: parsed.data.password },
      headers: requestHeaders,
    });

    if (!result?.status) {
      return { ok: false, error: "That password didn't match." };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : "";

    if (
      message.includes("invalid password") ||
      message.includes("bad_request") ||
      message.includes("unauthorized")
    ) {
      return { ok: false, error: "That password didn't match." };
    }

    console.error("Failed to verify admin password for confirm token.", error);
    return {
      ok: false,
      error: "We couldn't verify your password right now. Try again.",
    };
  }

  const rawToken = generateRawConfirmToken();
  const hashedToken = hashConfirmToken(rawToken);
  const nonce = randomUUID();
  const identifier = buildConfirmIdentifier(user.id, nonce);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + ADMIN_PASSWORD_CONFIRM_TTL_SECONDS * 1000,
  );

  try {
    await db.insert(verification).values({
      id: createTokenId(),
      identifier,
      value: hashedToken,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Failed to persist admin password confirm token.", error);
    return {
      ok: false,
      error: "We couldn't issue a confirmation token right now. Try again.",
    };
  }

  return {
    ok: true,
    data: { token: rawToken, expiresAt: expiresAt.toISOString() },
  };
}
