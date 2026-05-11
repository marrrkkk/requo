import "server-only";

import { createHash } from "node:crypto";
import { and, eq, gt, like } from "drizzle-orm";

import type {
  AdminAction,
  AdminTargetType,
} from "@/features/admin/constants";
import { db } from "@/lib/db/client";
import { verification } from "@/lib/db/schema";

/**
 * Server-only helpers for consuming admin password re-confirmation
 * tokens (Requirement 9).
 *
 * The paired server action that *issues* tokens lives in
 * `features/admin/confirm-actions.ts` so that client components can
 * import it without pulling this `server-only` module into the client
 * bundle.
 *
 * - `consumePasswordConfirmToken` hashes the incoming token the same
 *   way the issuer does and, in a single transaction, finds a matching
 *   row for the calling admin and deletes it atomically, returning a
 *   structured result so the audit layer can log missing/expired/invalid
 *   cases (Req 9.4, plus the `confirmation.failed` audit requirement in
 *   Req 9.3).
 */

/** Identifier prefix used on the `verification` table for confirm tokens. */
const CONFIRM_IDENTIFIER_PREFIX = "admin:confirm";

/**
 * Hash the raw token so only the hash is stored in `verification.value`.
 * Mirrors Better Auth's hashed magic-link token scheme (SHA-256 +
 * base64url) so the token is not recoverable from the DB.
 */
function hashConfirmToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function buildConfirmIdentifierPrefix(adminUserId: string): string {
  // Escape LIKE wildcards from the admin id so ids containing `%` or `_`
  // cannot widen the match beyond their own rows.
  const escaped = adminUserId.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `${CONFIRM_IDENTIFIER_PREFIX}:${escaped}:%`;
}

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
