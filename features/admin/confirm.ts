import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, like } from "drizzle-orm";
import { headers } from "next/headers";

import { requireAdminUser } from "@/features/admin/access";
import {
  ADMIN_PASSWORD_CONFIRM_TTL_SECONDS,
  type AdminAction,
  type AdminTargetType,
} from "@/features/admin/constants";
import { adminPasswordConfirmSchema } from "@/features/admin/schemas";
import type { AdminActionResult } from "@/features/admin/types";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { rateLimit, verification } from "@/lib/db/schema";

/**
 * Password re-confirmation gate (Requirement 9).
 *
 * - `issuePasswordConfirmTokenAction` verifies the calling admin's
 *   password via Better Auth's `/verify-password` endpoint, hashes a
 *   fresh random token, and writes a single-use row to the existing
 *   `verification` table with a 5-minute TTL (Req 9.1, 9.2, 9.5).
 * - `consumePasswordConfirmToken` hashes the incoming token the same
 *   way and, in a single transaction, finds a matching row for the
 *   calling admin and deletes it atomically, returning a structured
 *   result so the audit layer can log missing/expired/invalid cases
 *   (Req 9.4, plus the `confirmation.failed` audit requirement in
 *   Req 9.3).
 * - Per-admin attempt tracking is enforced directly on the
 *   `rate_limit` table with a composite key (5 attempts per 5 minutes)
 *   so the limit survives server restarts. The companion
 *   `/admin/confirm` rule in `lib/auth/config.ts` documents the same
 *   policy for any future plugin-routed usage.
 */

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

/**
 * Hash the raw token so only the hash is stored in `verification.value`.
 * Mirrors Better Auth's hashed magic-link token scheme (SHA-256 +
 * base64url) so the token is not recoverable from the DB.
 */
function hashConfirmToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function buildConfirmIdentifier(adminUserId: string, nonce: string): string {
  return `${CONFIRM_IDENTIFIER_PREFIX}:${adminUserId}:${nonce}`;
}

function buildConfirmIdentifierPrefix(adminUserId: string): string {
  // Escape LIKE wildcards from the admin id so ids containing `%` or `_`
  // cannot widen the match beyond their own rows.
  const escaped = adminUserId.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `${CONFIRM_IDENTIFIER_PREFIX}:${escaped}:%`;
}

function buildConfirmRateLimitKey(adminUserId: string): string {
  return `${CONFIRM_RATE_LIMIT_KEY_PREFIX}:${adminUserId}`;
}

/**
 * Atomically enforce the per-admin attempt limit on the `rate_limit`
 * table. Returns `true` when the attempt is allowed and increments the
 * counter, `false` when the cap is exceeded.
 *
 * The window rolls forward when the stored `lastRequest` is older than
 * `CONFIRM_RATE_LIMIT_WINDOW_SECONDS`, matching Better Auth's own
 * fixed-window semantics (see `onResponseRateLimit` in the plugin's DB
 * storage wrapper).
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
    // If the rate-limit table itself is unreachable, fail closed — the
    // confirmation gate is a security boundary, not a convenience.
    console.error("Failed to check admin confirm rate limit.", error);
    return false;
  }
}

/* ── Token lifecycle ─────────────────────────────────────────────────────── */

/**
 * Server action invoked by `ConfirmPasswordDialog`. Validates the
 * admin's password against Better Auth and returns a single-use token
 * to present to the follow-up destructive action.
 */
export async function issuePasswordConfirmTokenAction(input: {
  password: string;
}): Promise<AdminActionResult<{ token: string; expiresAt: string }>> {
  "use server";

  // 1. Access gate (Req 1.6): only admins can even attempt a confirm.
  const { user } = await requireAdminUser();

  // 2. Validate input envelope early so obvious client errors surface
  //    before we hit the rate limiter or the password hasher.
  const parsed = adminPasswordConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Enter your password to continue.",
    };
  }

  // 3. Per-admin throttling. Increment counter on every attempt so
  //    repeated wrong-password tries are caught before the hash
  //    comparison cost.
  const allowed = await assertConfirmAttemptAllowed(user.id);
  if (!allowed) {
    return {
      ok: false,
      error: "Too many attempts. Try again in a few minutes.",
    };
  }

  // 4. Verify the password through Better Auth. The `/verify-password`
  //    endpoint uses `sensitiveSessionMiddleware` so it picks up our
  //    active admin session from headers and ignores the cookie cache.
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

  // 5. Issue a fresh random token and persist only the hash. The raw
  //    token is returned to the caller exactly once.
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

/* ── Token consumption ───────────────────────────────────────────────────── */

export type AdminConfirmTokenConsumeContext = {
  adminUserId: string;
  intendedAction: AdminAction;
  intendedTargetId: string;
  intendedTargetType?: AdminTargetType;
};

export type AdminConfirmTokenConsumeResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "expired" };

/**
 * Match + delete a confirmation token atomically. Returns a structured
 * failure reason so the audit layer can record `confirmation.failed`
 * with structured metadata (see Req 9.3).
 *
 * The lookup is scoped to identifiers beginning with
 * `admin:confirm:{adminUserId}:` so one admin's token cannot be
 * consumed by another admin's mutation, even if the raw token string
 * somehow leaked.
 */
export async function consumePasswordConfirmToken(
  token: string,
  context: AdminConfirmTokenConsumeContext,
): Promise<AdminConfirmTokenConsumeResult> {
  void context.intendedAction;
  void context.intendedTargetId;
  void context.intendedTargetType;

  if (typeof token !== "string" || token.trim().length === 0) {
    return { ok: false, reason: "missing" };
  }

  const trimmed = token.trim();
  const hashedToken = hashConfirmToken(trimmed);
  const identifierPrefix = buildConfirmIdentifierPrefix(context.adminUserId);
  const now = new Date();

  try {
    return await db.transaction(async (tx) => {
      // Look up the row first so we can distinguish "expired" from
      // "invalid" for the audit trail.
      const [row] = await tx
        .select({
          id: verification.id,
          identifier: verification.identifier,
          expiresAt: verification.expiresAt,
        })
        .from(verification)
        .where(
          and(
            eq(verification.value, hashedToken),
            like(verification.identifier, identifierPrefix),
          ),
        )
        .limit(1);

      if (!row) {
        return { ok: false, reason: "invalid" } as const;
      }

      if (row.expiresAt.getTime() <= now.getTime()) {
        // Clean up the expired row so retries see a clean "invalid"
        // response on the next attempt.
        await tx
          .delete(verification)
          .where(eq(verification.id, row.id));
        return { ok: false, reason: "expired" } as const;
      }

      const [deleted] = await tx
        .delete(verification)
        .where(
          and(
            eq(verification.id, row.id),
            gt(verification.expiresAt, now),
          ),
        )
        .returning({ id: verification.id });

      if (!deleted) {
        // Lost the race with another consumer (single-use invariant
        // preserved) — treat as already-consumed / invalid.
        return { ok: false, reason: "invalid" } as const;
      }

      return { ok: true } as const;
    });
  } catch (error) {
    console.error("Failed to consume admin password confirm token.", error);
    return { ok: false, reason: "invalid" };
  }
}
