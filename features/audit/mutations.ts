import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import type {
  AuditAction,
  AuditEntityType,
  AuditLogMetadata,
  AuditSource,
} from "@/features/audit/types";
import {
  auditLogs,
  businesses,
  businessMembers,
  user,
} from "@/lib/db/schema";

type DbClient = (typeof import("@/lib/db/client"))["db"];
type AuditWriter = Pick<DbClient, "insert" | "select">;

type WriteAuditLogInput = {
  businessId: string;
  actorUserId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  entityType: AuditEntityType;
  entityId?: string | null;
  action: AuditAction;
  metadata?: AuditLogMetadata;
  source?: AuditSource;
  createdAt?: Date;
};

type AuditTargetBusiness = {
  id: string;
  name: string;
  slug: string;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function compactMetadata(metadata: AuditLogMetadata) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}

export async function writeAuditLog(
  writer: AuditWriter,
  input: WriteAuditLogInput,
) {
  let actorName = input.actorName ?? null;
  let actorEmail = input.actorEmail ?? null;

  if (input.actorUserId && (!actorName || !actorEmail)) {
    const [actor] = await writer
      .select({
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, input.actorUserId))
      .limit(1);

    actorName = actorName ?? actor?.name ?? null;
    actorEmail = actorEmail ?? actor?.email ?? null;
  }

  const metadata = compactMetadata({
    ...(input.metadata ?? {}),
    actorName,
    actorEmail,
  });

  await writer.insert(auditLogs).values({
    id: createId("adt"),
    businessId: input.businessId,
    actorUserId: input.actorUserId ?? null,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    action: input.action,
    metadata,
    source: input.source ?? "app",
    createdAt: input.createdAt ?? new Date(),
  });
}

export async function getAuditTargetBusinessesForUser(
  userId: string,
): Promise<AuditTargetBusiness[]> {
  const { db } = await import("@/lib/db/client");
  const rows = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(
      and(
        eq(businessMembers.userId, userId),
        isNull(businesses.deletedAt),
      ),
    );

  const deduped = new Map<string, AuditTargetBusiness>();

  for (const row of rows) {
    if (!deduped.has(row.id)) {
      deduped.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
      });
    }
  }

  return Array.from(deduped.values());
}

export async function writeAccountAuditLogsForUser(
  userId: string,
  input: Omit<WriteAuditLogInput, "businessId" | "entityType" | "entityId">,
) {
  const { db } = await import("@/lib/db/client");
  const targetBusinesses = await getAuditTargetBusinessesForUser(userId);

  if (!targetBusinesses.length) {
    return;
  }

  for (const biz of targetBusinesses) {
    await writeAuditLog(db, {
      businessId: biz.id,
      actorUserId: input.actorUserId ?? userId,
      actorName: input.actorName,
      actorEmail: input.actorEmail,
      action: input.action,
      metadata: {
        businessName: biz.name,
        businessSlug: biz.slug,
        ...(input.metadata ?? {}),
      },
      source: input.source,
      createdAt: input.createdAt,
      entityType: "account",
      entityId: userId,
    });
  }
}

export async function writeAuditLogsForBusinesses(
  businessIds: string[],
  input: Omit<WriteAuditLogInput, "businessId">,
) {
  const { db } = await import("@/lib/db/client");
  const uniqueIds = Array.from(new Set(businessIds.filter(Boolean)));

  if (!uniqueIds.length) {
    return;
  }

  for (const businessId of uniqueIds) {
    await writeAuditLog(db, {
      ...input,
      businessId,
    });
  }
}
