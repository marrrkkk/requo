import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { writeAuditLog } from "@/features/audit/mutations";
import {
  getWorkspaceDeletionEffectiveAt,
  requiresWorkspaceSubscriptionCancellation,
} from "@/features/workspaces/deletion";
import { getWorkspaceSubscription } from "@/lib/billing/subscription-service";
import { db } from "@/lib/db/client";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { slugifyPublicName, appendRandomSlugSuffix } from "@/lib/slugs";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

const renameWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(60, "Workspace name must be at most 60 characters."),
});

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(60, "Workspace name must be at most 60 characters."),
});

export async function renameWorkspace(
  workspaceId: string,
  rawInput: { name: string },
) {
  const parsed = renameWorkspaceSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      error: "Invalid input.",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<"name", string[] | undefined>
      >,
    };
  }

  await db
    .update(workspaces)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId));

  return { success: "Workspace renamed." };
}

export async function createWorkspace(
  userId: string,
  rawInput: { name: string },
) {
  const parsed = createWorkspaceSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      error: "Invalid input.",
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<"name", string[] | undefined>
      >,
    };
  }

  const now = new Date();
  const workspaceId = createId("ws");

  let slugCandidate =
    slugifyPublicName(parsed.data.name, { fallback: "workspace" }) + "-ws";

  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 10) {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, slugCandidate))
      .limit(1);

    if (!existing) break;

    slugCandidate = appendRandomSlugSuffix(slugCandidate, {
      fallback: "workspace",
    });
    attempts++;
  }

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id: workspaceId,
      name: parsed.data.name,
      slug: slugCandidate,
      plan: "free",
      ownerUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(workspaceMembers).values({
      id: createId("wm"),
      workspaceId,
      userId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(tx, {
      workspaceId,
      actorUserId: userId,
      entityType: "workspace",
      entityId: workspaceId,
      action: "workspace.created",
      metadata: {
        workspaceName: parsed.data.name,
        workspaceSlug: slugCandidate,
      },
      createdAt: now,
    });
  });

  return {
    success: "Workspace created.",
    workspace: { id: workspaceId, slug: slugCandidate },
  };
}

type WorkspaceDeletionMutationResult =
  | {
      ok: true;
      mode: "scheduled" | "deleted" | "cancelled";
      workspaceSlug: string;
      scheduledDeletionAt: Date | null;
    }
  | {
      ok: false;
      reason:
        | "not-found"
        | "owner-only"
        | "already-deleted"
        | "not-scheduled"
        | "cancellation-required";
    };

async function getWorkspaceDeletionTarget(workspaceId: string) {
  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      ownerUserId: workspaces.ownerUserId,
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
      scheduledDeletionBy: workspaces.scheduledDeletionBy,
      deletedAt: workspaces.deletedAt,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return workspace ?? null;
}

export async function requestWorkspaceDeletion(
  workspaceId: string,
  actorUserId: string,
): Promise<WorkspaceDeletionMutationResult> {
  const workspace = await getWorkspaceDeletionTarget(workspaceId);

  if (!workspace) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (workspace.ownerUserId !== actorUserId) {
    return {
      ok: false,
      reason: "owner-only",
    };
  }

  if (workspace.deletedAt) {
    return {
      ok: false,
      reason: "already-deleted",
    };
  }

  const subscription = await getWorkspaceSubscription(workspaceId);
  const subscriptionSnapshot = subscription
    ? {
        status: subscription.status,
        canceledAt: subscription.canceledAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        billingProvider: subscription.billingProvider,
        providerSubscriptionId: subscription.providerSubscriptionId,
      }
    : null;

  if (requiresWorkspaceSubscriptionCancellation(subscriptionSnapshot)) {
    return {
      ok: false,
      reason: "cancellation-required",
    };
  }

  const now = new Date();
  const effectiveDeletionAt = getWorkspaceDeletionEffectiveAt(
    subscriptionSnapshot,
    now,
  );

  if (effectiveDeletionAt && effectiveDeletionAt.getTime() > now.getTime()) {
    const [updatedWorkspace] = await db
      .update(workspaces)
      .set({
        scheduledDeletionAt: effectiveDeletionAt,
        scheduledDeletionBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(workspaces.id, workspaceId))
      .returning({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        scheduledDeletionAt: workspaces.scheduledDeletionAt,
      });

    if (updatedWorkspace) {
      await writeAuditLog(db, {
        workspaceId,
        actorUserId,
        entityType: "workspace",
        entityId: workspaceId,
        action: "workspace.deletion_scheduled",
        metadata: {
          workspaceName: updatedWorkspace.name,
          workspaceSlug: updatedWorkspace.slug,
          scheduledDeletionAt:
            updatedWorkspace.scheduledDeletionAt?.toISOString() ??
            effectiveDeletionAt.toISOString(),
        },
        createdAt: now,
      });
    }

    return {
      ok: true,
      mode: "scheduled",
      workspaceSlug: updatedWorkspace?.slug ?? workspace.slug,
      scheduledDeletionAt:
        updatedWorkspace?.scheduledDeletionAt ?? effectiveDeletionAt,
    };
  }

  const [updatedWorkspace] = await db
    .update(workspaces)
    .set({
      scheduledDeletionAt: null,
      scheduledDeletionBy: null,
      deletedAt: now,
      deletedBy: actorUserId,
      updatedAt: now,
    })
    .where(eq(workspaces.id, workspaceId))
    .returning({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
    });

  if (updatedWorkspace) {
    await writeAuditLog(db, {
      workspaceId,
      actorUserId,
      entityType: "workspace",
      entityId: workspaceId,
      action: "workspace.deleted",
      metadata: {
        workspaceName: updatedWorkspace.name,
        workspaceSlug: updatedWorkspace.slug,
      },
      createdAt: now,
    });
  }

  return {
    ok: true,
    mode: "deleted",
    workspaceSlug: updatedWorkspace?.slug ?? workspace.slug,
    scheduledDeletionAt: null,
  };
}

export async function cancelScheduledWorkspaceDeletion(
  workspaceId: string,
  actorUserId: string,
): Promise<WorkspaceDeletionMutationResult> {
  const workspace = await getWorkspaceDeletionTarget(workspaceId);

  if (!workspace) {
    return {
      ok: false,
      reason: "not-found",
    };
  }

  if (workspace.ownerUserId !== actorUserId) {
    return {
      ok: false,
      reason: "owner-only",
    };
  }

  if (workspace.deletedAt) {
    return {
      ok: false,
      reason: "already-deleted",
    };
  }

  if (!workspace.scheduledDeletionAt) {
    return {
      ok: false,
      reason: "not-scheduled",
    };
  }

  const [updatedWorkspace] = await db
    .update(workspaces)
    .set({
      scheduledDeletionAt: null,
      scheduledDeletionBy: null,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId))
    .returning({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      scheduledDeletionAt: workspaces.scheduledDeletionAt,
    });

  if (updatedWorkspace) {
    await writeAuditLog(db, {
      workspaceId,
      actorUserId,
      entityType: "workspace",
      entityId: workspaceId,
      action: "workspace.deletion_canceled",
      metadata: {
        workspaceName: updatedWorkspace.name,
        workspaceSlug: updatedWorkspace.slug,
      },
      createdAt: new Date(),
    });
  }

  return {
    ok: true,
    mode: "cancelled",
    workspaceSlug: updatedWorkspace?.slug ?? workspace.slug,
    scheduledDeletionAt: null,
  };
}

export async function finalizeScheduledWorkspaceDeletionIfDue(workspaceId: string) {
  const workspace = await getWorkspaceDeletionTarget(workspaceId);

  if (!workspace || workspace.deletedAt || !workspace.scheduledDeletionAt) {
    return { deleted: false };
  }

  const now = new Date();

  if (workspace.scheduledDeletionAt.getTime() > now.getTime()) {
    return { deleted: false };
  }

  const subscription = await getWorkspaceSubscription(workspaceId);
  const subscriptionSnapshot = subscription
    ? {
        status: subscription.status,
        canceledAt: subscription.canceledAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        billingProvider: subscription.billingProvider,
        providerSubscriptionId: subscription.providerSubscriptionId,
      }
    : null;

  if (requiresWorkspaceSubscriptionCancellation(subscriptionSnapshot)) {
    return { deleted: false };
  }

  const effectiveDeletionAt = getWorkspaceDeletionEffectiveAt(
    subscriptionSnapshot,
    now,
  );

  if (effectiveDeletionAt && effectiveDeletionAt.getTime() > now.getTime()) {
    return { deleted: false };
  }

  await db
    .update(workspaces)
    .set({
      scheduledDeletionAt: null,
      scheduledDeletionBy: null,
      deletedAt: now,
      deletedBy: workspace.scheduledDeletionBy,
      updatedAt: now,
    })
    .where(eq(workspaces.id, workspaceId));

  await writeAuditLog(db, {
    workspaceId,
    actorUserId: workspace.scheduledDeletionBy,
    entityType: "workspace",
    entityId: workspaceId,
    action: "workspace.deleted",
    metadata: {
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      finalizedFromSchedule: true,
    },
    source: "system",
    createdAt: now,
  });

  return { deleted: true };
}
