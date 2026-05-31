"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businessAutomations } from "@/lib/db/schema/automations";
import {
  getBusinessAutomationDetailCacheTags,
  getBusinessAutomationListCacheTags,
  uniqueCacheTags,
} from "@/lib/cache/business-tags";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import { assertBusinessActionRateLimit } from "@/lib/public-action-rate-limit";

import { canCreateAutomation } from "./entitlements";
import { cancelPendingJobs } from "./scheduler";
import {
  createAutomationSchema,
  updateAutomationSchema,
} from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MutationResult = {
  success?: string;
  error?: string;
  id?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateCacheTags(tags: string[]) {
  for (const tag of uniqueCacheTags(tags)) {
    updateTag(tag);
  }
}

function getAutomationMutationCacheTags(
  businessId: string,
  automationId?: string | null,
) {
  return uniqueCacheTags([
    ...getBusinessAutomationListCacheTags(businessId),
    ...(automationId
      ? getBusinessAutomationDetailCacheTags(businessId, automationId)
      : []),
  ]);
}

// ---------------------------------------------------------------------------
// createAutomation
// ---------------------------------------------------------------------------

export async function createAutomation(
  input: unknown,
): Promise<MutationResult> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;
  const businessId = businessContext.business.id;

  const parsed = createAutomationSchema.safeParse(input);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { error: firstError };
  }

  // Requirement 10.6: Rate limit — 50 automation creates per business per hour
  const rateLimitAllowed = await assertBusinessActionRateLimit({
    action: "automation-create",
    scope: businessId,
    limit: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  if (!rateLimitAllowed) {
    return {
      error: "Rate limit exceeded. Maximum 50 automations per hour.",
    };
  }

  const { allowed, limit, plan } = await canCreateAutomation(businessId);

  if (!allowed && parsed.data.enabled) {
    return {
      error: `You've reached the ${limit} active automation limit on the ${plan} plan. Upgrade to add more automations.`,
    };
  }

  const id = crypto.randomUUID();

  try {
    await db.insert(businessAutomations).values({
      id,
      businessId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      triggerType: parsed.data.triggerType,
      triggerConfig: parsed.data.triggerConfig ?? null,
      conditions: parsed.data.conditions ?? null,
      actions: parsed.data.actions,
      delay: parsed.data.delay ?? null,
      enabled: parsed.data.enabled,
      priority: parsed.data.priority,
      createdByUserId: user.id,
    });

    updateCacheTags(getAutomationMutationCacheTags(businessId, id));

    return { success: "Automation created.", id };
  } catch (error) {
    console.error("Failed to create automation.", error);
    return { error: "We couldn't create that automation right now." };
  }
}

// ---------------------------------------------------------------------------
// updateAutomation
// ---------------------------------------------------------------------------

export async function updateAutomation(
  automationId: string,
  input: unknown,
): Promise<MutationResult> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { businessContext } = ownerAccess;
  const businessId = businessContext.business.id;

  const parsed = updateAutomationSchema.safeParse(input);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { error: firstError };
  }

  // If enabling, check plan limits
  if (parsed.data.enabled === true) {
    const { allowed, limit, plan } = await canCreateAutomation(businessId);

    if (!allowed) {
      return {
        error: `You've reached the ${limit} active automation limit on the ${plan} plan. Upgrade to enable more automations.`,
      };
    }
  }

  try {
    const [existing] = await db
      .select({ id: businessAutomations.id })
      .from(businessAutomations)
      .where(
        and(
          eq(businessAutomations.id, automationId),
          eq(businessAutomations.businessId, businessId),
        ),
      )
      .limit(1);

    if (!existing) {
      return { error: "Automation not found." };
    }

    await db
      .update(businessAutomations)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(businessAutomations.id, automationId));

    updateCacheTags(getAutomationMutationCacheTags(businessId, automationId));

    return { success: "Automation updated." };
  } catch (error) {
    console.error("Failed to update automation.", error);
    return { error: "We couldn't update that automation right now." };
  }
}

// ---------------------------------------------------------------------------
// deleteAutomation
// ---------------------------------------------------------------------------

export async function deleteAutomation(
  automationId: string,
): Promise<MutationResult> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { businessContext } = ownerAccess;
  const businessId = businessContext.business.id;

  try {
    const [existing] = await db
      .select({ id: businessAutomations.id })
      .from(businessAutomations)
      .where(
        and(
          eq(businessAutomations.id, automationId),
          eq(businessAutomations.businessId, businessId),
        ),
      )
      .limit(1);

    if (!existing) {
      return { error: "Automation not found." };
    }

    // Cancel pending scheduled jobs before deletion (Requirement 3.7)
    await cancelPendingJobs(automationId);

    await db
      .delete(businessAutomations)
      .where(eq(businessAutomations.id, automationId));

    updateCacheTags(getAutomationMutationCacheTags(businessId, automationId));

    return { success: "Automation deleted." };
  } catch (error) {
    console.error("Failed to delete automation.", error);
    return { error: "We couldn't delete that automation right now." };
  }
}

// ---------------------------------------------------------------------------
// toggleAutomation
// ---------------------------------------------------------------------------

export async function toggleAutomation(
  automationId: string,
  enabled: boolean,
): Promise<MutationResult> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { businessContext } = ownerAccess;
  const businessId = businessContext.business.id;

  // If enabling, check plan limits
  if (enabled) {
    const { allowed, limit, plan } = await canCreateAutomation(businessId);

    if (!allowed) {
      return {
        error: `You've reached the ${limit} active automation limit on the ${plan} plan. Upgrade to enable more automations.`,
      };
    }
  }

  try {
    const [existing] = await db
      .select({ id: businessAutomations.id, enabled: businessAutomations.enabled })
      .from(businessAutomations)
      .where(
        and(
          eq(businessAutomations.id, automationId),
          eq(businessAutomations.businessId, businessId),
        ),
      )
      .limit(1);

    if (!existing) {
      return { error: "Automation not found." };
    }

    if (existing.enabled === enabled) {
      return {
        success: enabled
          ? "Automation is already enabled."
          : "Automation is already disabled.",
      };
    }

    // Cancel pending jobs when disabling (Requirement 3.7)
    if (!enabled) {
      await cancelPendingJobs(automationId);
    }

    await db
      .update(businessAutomations)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(businessAutomations.id, automationId));

    updateCacheTags(getAutomationMutationCacheTags(businessId, automationId));

    return {
      success: enabled ? "Automation enabled." : "Automation disabled.",
    };
  } catch (error) {
    console.error("Failed to toggle automation.", error);
    return { error: "We couldn't update that automation right now." };
  }
}

// ---------------------------------------------------------------------------
// duplicateAutomation
// ---------------------------------------------------------------------------

export async function duplicateAutomation(
  automationId: string,
): Promise<MutationResult> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;
  const businessId = businessContext.business.id;

  try {
    const [source] = await db
      .select()
      .from(businessAutomations)
      .where(
        and(
          eq(businessAutomations.id, automationId),
          eq(businessAutomations.businessId, businessId),
        ),
      )
      .limit(1);

    if (!source) {
      return { error: "Automation not found." };
    }

    // Duplicates are created disabled so they don't count against the limit
    const id = crypto.randomUUID();

    await db.insert(businessAutomations).values({
      id,
      businessId,
      name: `${source.name} (copy)`,
      description: source.description,
      triggerType: source.triggerType,
      triggerConfig: source.triggerConfig,
      conditions: source.conditions,
      actions: source.actions,
      delay: source.delay,
      enabled: false,
      priority: source.priority,
      createdByUserId: user.id,
    });

    updateCacheTags(getAutomationMutationCacheTags(businessId, id));

    return { success: "Automation duplicated." };
  } catch (error) {
    console.error("Failed to duplicate automation.", error);
    return { error: "We couldn't duplicate that automation right now." };
  }
}

// ---------------------------------------------------------------------------
// fetchAutomationRuns (read-only server action for the Runs tab)
// ---------------------------------------------------------------------------

export async function fetchAutomationRuns(
  automationId: string,
  filters: { status?: "success" | "partial_failure" | "failure"; limit?: number; offset?: number } = {},
): Promise<{ entries: Array<{ id: string; triggerType: string; triggerPayload: unknown; actionsExecuted: unknown; status: string; durationMs: number; error: string | null; createdAt: Date }>; total: number } | { error: string }> {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return { error: ownerAccess.error };
  }

  const { user, businessContext } = ownerAccess;
  const businessId = businessContext.business.id;

  const { getAutomationHistory } = await import("./queries");
  const result = await getAutomationHistory(automationId, businessId, user.id, filters);
  return result;
}
