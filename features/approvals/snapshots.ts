import { createHash } from "node:crypto";

import type { ApprovalSubjectType } from "@/lib/db/schema/approvals";
import { approvalSubjectTypes } from "@/lib/db/schema/approvals";

/**
 * P1 approval snapshots. Each version pins the exact commercial/artifact
 * state the customer approved; the SHA-256 hash follows the
 * acceptance-record precedent (deterministic canonical JSON).
 */

export type ApprovalSnapshotInput = {
  subjectType: ApprovalSubjectType;
  /** Human summary shown on the customer page and in history. */
  title: string;
  /** Versioned payload: artifact version, count snapshot, schedule version… */
  state: Record<string, unknown>;
  artifactId?: string | null;
  artifactVersion?: number | null;
  quoteId?: string | null;
  quoteVersion?: number | null;
};

export function buildApprovalSnapshot(input: ApprovalSnapshotInput) {
  return {
    subjectType: input.subjectType,
    title: input.title,
    state: input.state,
    artifactId: input.artifactId ?? null,
    artifactVersion: input.artifactVersion ?? null,
    quoteId: input.quoteId ?? null,
    quoteVersion: input.quoteVersion ?? null,
    snapshotVersion: 1,
  };
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }

  return value;
}

export function hashApprovalSnapshot(snapshot: Record<string, unknown>) {
  return createHash("sha256")
    .update(JSON.stringify(sortValue(snapshot)))
    .digest("hex");
}

export function isApprovalSubjectType(
  value: unknown,
): value is ApprovalSubjectType {
  return (
    typeof value === "string" &&
    (approvalSubjectTypes as readonly string[]).includes(value)
  );
}
