import "server-only";

import { and, count, eq, isNull, sql } from "drizzle-orm";

import type { BusinessQuotaSnapshot } from "@/features/businesses/types";
import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import { getUpgradePlan, planMeta, type BusinessPlan as plan } from "@/lib/plans/plans";
import { getUsageLimit } from "@/lib/plans/usage-limits";
import { getEffectivePlanForUser } from "@/lib/billing/subscription-service";

type DatabaseClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

const businessQuotaLockNamespace = 842_731_119;

export class BusinessQuotaExceededError extends Error {
  quota: BusinessQuotaSnapshot;

  constructor(quota: BusinessQuotaSnapshot) {
    super(getBusinessQuotaExceededMessage(quota));
    this.name = "BusinessQuotaExceededError";
    this.quota = quota;
  }
}

export function isBusinessQuotaExceededError(
  error: unknown,
): error is BusinessQuotaExceededError {
  return error instanceof BusinessQuotaExceededError;
}

export function getBusinessQuotaLimit(plan: plan) {
  return getUsageLimit(plan, "businessesPerPlan");
}

export async function getOwnedBusinessCountForUser(
  ownerUserId: string,
  client: DatabaseClient = db,
) {
  const [row] = await client
    .select({ value: count(businesses.id) })
    .from(businesses)
    .where(
      and(
        eq(businesses.ownerUserId, ownerUserId),
        isNull(businesses.deletedAt),
        isNull(businesses.archivedAt),
        isNull(businesses.lockedAt),
      ),
    );

  return Number(row?.value ?? 0);
}

export async function getBusinessQuotaForUser({
  ownerUserId,
  plan: planOverride,
  client = db,
}: {
  ownerUserId: string;
  /** Optional plan override. If not provided, resolves from account subscription. */
  plan?: plan;
  client?: DatabaseClient;
}): Promise<BusinessQuotaSnapshot> {
  // Resolve plan from account subscription if not explicitly provided
  const effectivePlan = planOverride ?? await getEffectivePlanForUser(ownerUserId);
  const limit = getBusinessQuotaLimit(effectivePlan);

  const current = await getOwnedBusinessCountForUser(ownerUserId, client);

  return {
    ownerUserId,
    plan: effectivePlan,
    current,
    limit,
    allowed: limit === null || current < limit,
    upgradePlan: getUpgradePlan(effectivePlan),
  };
}

export function getBusinessQuotaExceededMessage(
  quota: BusinessQuotaSnapshot,
) {
  if (quota.limit === null) {
    return "This plan has no business limit.";
  }

  const planLabel = planMeta[quota.plan].label;
  const businessLabel = quota.limit === 1 ? "business" : "businesses";
  const upgradeMessage = quota.upgradePlan
    ? ` Upgrade your account to ${planMeta[quota.upgradePlan].label} to add more.`
    : "";

  return `Your ${planLabel} plan supports ${quota.limit} total ${businessLabel}. You already have ${quota.current}.${upgradeMessage}`;
}

async function lockBusinessQuotaForUser(
  tx: DatabaseClient,
  ownerUserId: string,
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(${businessQuotaLockNamespace}, hashtext(${ownerUserId}))`,
  );
}

export async function assertBusinessQuotaAvailableForUser({
  tx,
  ownerUserId,
  plan,
}: {
  tx: DatabaseClient;
  ownerUserId: string;
  /** Optional plan override. If not provided, resolves from account subscription. */
  plan?: plan;
}) {
  await lockBusinessQuotaForUser(tx, ownerUserId);

  const quota = await getBusinessQuotaForUser({
    ownerUserId,
    plan,
    client: tx,
  });

  if (!quota.allowed) {
    throw new BusinessQuotaExceededError(quota);
  }

  return quota;
}
