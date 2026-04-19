import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

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
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

type DbClient = (typeof import("@/lib/db/client"))["db"];
type AuditWriter = Pick<DbClient, "insert" | "select">;

type WriteAuditLogInput = {
  workspaceId: string;
  businessId?: string | null;
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

type AuditTargetWorkspace = {
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
    workspaceId: input.workspaceId,
    businessId: input.businessId ?? null,
    actorUserId: input.actorUserId ?? null,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    action: input.action,
    metadata,
    source: input.source ?? "app",
    createdAt: input.createdAt ?? new Date(),
  });
}

export async function getAuditTargetWorkspacesForUser(
  userId: string,
): Promise<AuditTargetWorkspace[]> {
  const { db } = await import("@/lib/db/client");
  const [workspaceRows, businessWorkspaceRows] = await Promise.all([
    db
      .select({
        id: workspaceMembers.workspaceId,
        name: workspaces.name,
        slug: workspaces.slug,
      })
      .from(workspaceMembers)
      .innerJoin(
        workspaces,
        eq(workspaceMembers.workspaceId, workspaces.id),
      )
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          isNull(workspaces.deletedAt),
        ),
      ),
    db
      .select({
        id: businesses.workspaceId,
        name: workspaces.name,
        slug: workspaces.slug,
      })
      .from(businessMembers)
      .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
      .innerJoin(workspaces, eq(businesses.workspaceId, workspaces.id))
      .where(
        and(
          eq(businessMembers.userId, userId),
          isNull(workspaces.deletedAt),
        ),
      ),
  ]);

  const deduped = new Map<string, AuditTargetWorkspace>();

  for (const row of [...workspaceRows, ...businessWorkspaceRows]) {
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
  input: Omit<WriteAuditLogInput, "workspaceId" | "entityType" | "entityId">,
) {
  const { db } = await import("@/lib/db/client");
  const targetWorkspaces = await getAuditTargetWorkspacesForUser(userId);

  if (!targetWorkspaces.length) {
    return;
  }

  for (const workspace of targetWorkspaces) {
    await writeAuditLog(db, {
      workspaceId: workspace.id,
      actorUserId: input.actorUserId ?? userId,
      actorName: input.actorName,
      actorEmail: input.actorEmail,
      action: input.action,
      metadata: {
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        ...(input.metadata ?? {}),
      },
      source: input.source,
      createdAt: input.createdAt,
      entityType: "account",
      entityId: userId,
    });
  }
}

export async function writeAuditLogsForWorkspaces(
  workspaceIds: string[],
  input: Omit<WriteAuditLogInput, "workspaceId">,
) {
  const { db } = await import("@/lib/db/client");
  const uniqueWorkspaceIds = Array.from(new Set(workspaceIds.filter(Boolean)));

  if (!uniqueWorkspaceIds.length) {
    return;
  }

  for (const workspaceId of uniqueWorkspaceIds) {
    await writeAuditLog(db, {
      ...input,
      workspaceId,
    });
  }
}

export async function getWorkspaceIdsForBusinesses(
  businessIds: string[],
) {
  if (!businessIds.length) {
    return new Map<string, string>();
  }

  const { db } = await import("@/lib/db/client");
  const rows = await db
    .select({
      businessId: businesses.id,
      workspaceId: businesses.workspaceId,
    })
    .from(businesses)
    .where(inArray(businesses.id, businessIds));

  return new Map(rows.map((row) => [row.businessId, row.workspaceId]));
}
