"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { writeAuditLog } from "@/features/audit/mutations";
import { logAdminAction } from "@/features/admin/audit";
import {
  getAdminRequestMetadata,
  requireAdminOrThrow,
} from "@/features/admin/auth";
import {
  adminCancelWorkspaceDeletionSchema,
  adminCompleteWorkspaceDeletionSchema,
} from "@/features/admin/schemas";
import {
  getWorkspaceDeletionEffectiveAt,
  requiresWorkspaceSubscriptionCancellation,
} from "@/features/workspaces/deletion";
import { getWorkspaceSubscription } from "@/lib/billing/subscription-service";
import { db } from "@/lib/db/client";
import { workspaces } from "@/lib/db/schema";

export type AdminDeletionActionState = {
  error?: string;
  success?: string;
  fieldErrors?: {
    confirmation?: string[];
    reason?: string[];
  };
};

function extractString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

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

function validationError(error: {
  flatten: () => {
    fieldErrors: AdminDeletionActionState["fieldErrors"];
  };
}): AdminDeletionActionState {
  return {
    error: "Check the deletion request details and try again.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

export async function cancelAdminWorkspaceDeletionAction(
  _prevState: AdminDeletionActionState,
  formData: FormData,
): Promise<AdminDeletionActionState> {
  const admin = await requireAdminOrThrow();
  const requestMetadata = await getAdminRequestMetadata();
  const parsed = adminCancelWorkspaceDeletionSchema.safeParse({
    workspaceId: extractString(formData, "workspaceId"),
    reason: extractString(formData, "reason"),
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const workspace = await getWorkspaceDeletionTarget(parsed.data.workspaceId);

  if (!workspace || workspace.deletedAt) {
    return { error: "Deletion request not found." };
  }

  if (!workspace.scheduledDeletionAt) {
    return { error: "This workspace is not scheduled for deletion." };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(workspaces)
      .set({
        scheduledDeletionAt: null,
        scheduledDeletionBy: null,
        updatedAt: now,
      })
      .where(eq(workspaces.id, workspace.id));

    await writeAuditLog(tx, {
      workspaceId: workspace.id,
      actorUserId: admin.userId,
      actorName: admin.name,
      actorEmail: admin.email,
      entityType: "workspace",
      entityId: workspace.id,
      action: "workspace.deletion_canceled",
      metadata: {
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        canceledByAdmin: true,
        adminEmail: admin.email,
        reason: parsed.data.reason,
      },
      createdAt: now,
    });

    await logAdminAction(tx, {
      admin,
      action: "ADMIN_CANCEL_DELETION_REQUEST",
      targetType: "deletion_request",
      targetId: workspace.id,
      metadata: {
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        reason: parsed.data.reason,
        scheduledDeletionAt: workspace.scheduledDeletionAt?.toISOString(),
      },
      requestMetadata,
      createdAt: now,
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/deletion-requests");
  revalidatePath(`/admin/deletion-requests/${workspace.id}`);
  revalidatePath(`/admin/workspaces/${workspace.id}`);

  return { success: "Deletion request canceled." };
}

export async function completeAdminWorkspaceDeletionAction(
  _prevState: AdminDeletionActionState,
  formData: FormData,
): Promise<AdminDeletionActionState> {
  const admin = await requireAdminOrThrow();
  const requestMetadata = await getAdminRequestMetadata();
  const parsed = adminCompleteWorkspaceDeletionSchema.safeParse({
    workspaceId: extractString(formData, "workspaceId"),
    confirmation: extractString(formData, "confirmation"),
    reason: extractString(formData, "reason"),
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const workspace = await getWorkspaceDeletionTarget(parsed.data.workspaceId);

  if (!workspace || workspace.deletedAt) {
    return { error: "Deletion request not found." };
  }

  if (!workspace.scheduledDeletionAt) {
    return { error: "This workspace is not scheduled for deletion." };
  }

  if (parsed.data.confirmation !== workspace.name) {
    return {
      error: "Workspace name confirmation does not match.",
      fieldErrors: {
        confirmation: ["Type the workspace name exactly."],
      },
    };
  }

  const now = new Date();

  if (workspace.scheduledDeletionAt.getTime() > now.getTime()) {
    return {
      error:
        "This deletion request is not due yet. Cancel it instead if the workspace should remain active.",
    };
  }

  const subscription = await getWorkspaceSubscription(workspace.id);
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
      error:
        "Cancel the active billing subscription with the billing provider before completing deletion.",
    };
  }

  const effectiveDeletionAt = getWorkspaceDeletionEffectiveAt(
    subscriptionSnapshot,
    now,
  );

  if (effectiveDeletionAt && effectiveDeletionAt.getTime() > now.getTime()) {
    return {
      error:
        "This workspace keeps paid access until the current billing period ends.",
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(workspaces)
      .set({
        scheduledDeletionAt: null,
        scheduledDeletionBy: null,
        deletedAt: now,
        deletedBy: admin.userId,
        updatedAt: now,
      })
      .where(eq(workspaces.id, workspace.id));

    await writeAuditLog(tx, {
      workspaceId: workspace.id,
      actorUserId: admin.userId,
      actorName: admin.name,
      actorEmail: admin.email,
      entityType: "workspace",
      entityId: workspace.id,
      action: "workspace.deleted",
      metadata: {
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        finalizedByAdmin: true,
        adminEmail: admin.email,
        reason: parsed.data.reason,
      },
      createdAt: now,
    });

    await logAdminAction(tx, {
      admin,
      action: "ADMIN_MARK_DELETION_COMPLETED",
      targetType: "deletion_request",
      targetId: workspace.id,
      metadata: {
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        reason: parsed.data.reason,
        scheduledDeletionAt: workspace.scheduledDeletionAt?.toISOString(),
      },
      requestMetadata,
      createdAt: now,
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/deletion-requests");
  revalidatePath(`/admin/deletion-requests/${workspace.id}`);
  revalidatePath(`/admin/workspaces/${workspace.id}`);

  return { success: "Workspace deletion marked completed." };
}
