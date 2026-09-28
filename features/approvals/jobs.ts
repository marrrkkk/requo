import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { notifyApprovalEvent } from "@/features/approvals/notifications";
import { db } from "@/lib/db/client";
import { approvalChains, approvals } from "@/lib/db/schema";
import { getActiveRecipeForBusiness } from "@/features/businesses/pack-recipes";
import { getPackAssignmentForBusiness } from "@/features/businesses/pack-assignments";

type ReminderRecipe = {
  enabled: boolean;
  reminderEveryDays: number;
};

function reminderRecipeFromConfig(
  config: Record<string, unknown>,
  subjectType: string,
): ReminderRecipe | null {
  const recipes = config["recipes"];
  if (typeof recipes !== "object" || recipes === null) return null;
  const entry = (recipes as Record<string, unknown>)[subjectType];
  if (typeof entry !== "object" || entry === null) return null;
  const record = entry as Record<string, unknown>;

  if (typeof record["enabled"] !== "boolean") return null;
  if (typeof record["reminderEveryDays"] !== "number") return null;

  return { enabled: record["enabled"], reminderEveryDays: record["reminderEveryDays"] };
}

/**
 * Reminder job (P1-02): per-recipe cadence with `reminderSentAt` dedupe.
 * Skips decided/superseded/expired rows; reminds, never decides.
 */
export async function sendApprovalReminders(input: { limit?: number; now?: Date } = {}) {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 200;

  const candidates = await db
    .select({ approval: approvals, chain: approvalChains })
    .from(approvals)
    .innerJoin(approvalChains, eq(approvals.chainId, approvalChains.id))
    .where(
      and(
        eq(approvals.state, "pending"),
        isNull(approvals.decidedAt),
      ),
    )
    .limit(limit);

  let reminded = 0;

  for (const { approval, chain } of candidates) {
    if (approval.expiresAt && approval.expiresAt.getTime() <= now.getTime()) {
      continue;
    }

    const assignment = await getPackAssignmentForBusiness(approval.businessId);
    const recipe = await getActiveRecipeForBusiness(approval.businessId, "approval", assignment?.pack ?? null);
    const reminder = reminderRecipeFromConfig(recipe.config, chain.subjectType);

    if (!reminder || !reminder.enabled) continue;

    const cadenceMs = Math.max(1, reminder.reminderEveryDays) * 24 * 60 * 60 * 1000;
    const lastTouch = approval.reminderSentAt ?? approval.createdAt;

    if (now.getTime() - lastTouch.getTime() < cadenceMs) continue;

    const claimed = await db
      .update(approvals)
      .set({ reminderSentAt: now, updatedAt: now })
      .where(
        and(
          eq(approvals.id, approval.id),
          eq(approvals.version, approval.version),
          eq(approvals.state, "pending"),
        ),
      )
      .returning({ id: approvals.id });

    if (claimed.length === 0) continue;

    await db.transaction(async (tx) => {
      await notifyApprovalEvent(tx, {
        businessId: approval.businessId,
        type: "approval_requested",
        title: `Reminder: ${String((approval.snapshot as Record<string, unknown>)["title"] ?? "approval")} is waiting`,
        summary: "The customer has not responded yet.",
        quoteId: chain.quoteId,
        now,
      });
    }).catch(() => undefined);

    reminded += 1;
  }

  return { examined: candidates.length, reminded };
}

export async function expireStaleApprovals(now = new Date()) {
  const { expirePendingApprovals } = await import("@/features/approvals/mutations");
  return expirePendingApprovals({ now });
}
