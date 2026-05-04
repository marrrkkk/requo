import "server-only";

import type {
  AdminAuditAction,
  AdminAuditTargetType,
  AdminContext,
  AdminRequestMetadata,
} from "@/features/admin/types";
import { adminAuditLogs } from "@/lib/db/schema";

type DbClient = (typeof import("@/lib/db/client"))["db"];
type AdminAuditWriter = Pick<DbClient, "insert">;

type LogAdminActionInput = {
  admin: AdminContext;
  action: AdminAuditAction;
  targetType: AdminAuditTargetType;
  targetId: string;
  metadata?: Record<string, unknown>;
  requestMetadata?: AdminRequestMetadata;
  createdAt?: Date;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function compactMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) {
    return null;
  }

  const compacted = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );

  return Object.keys(compacted).length > 0 ? compacted : null;
}

export async function logAdminAction(
  writer: AdminAuditWriter,
  input: LogAdminActionInput,
) {
  await writer.insert(adminAuditLogs).values({
    id: createId("aad"),
    adminUserId: input.admin.userId,
    adminEmail: input.admin.email,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: compactMetadata(input.metadata),
    ipAddress: input.requestMetadata?.ipAddress ?? null,
    userAgent: input.requestMetadata?.userAgent ?? null,
    createdAt: input.createdAt ?? new Date(),
  });
}
