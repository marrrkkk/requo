import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businesses, userRecentBusinesses } from "@/lib/db/schema";
import type { BusinessPlan } from "@/lib/plans/plans";
import { getUsageLimit } from "@/lib/plans/usage-limits";

type DatabaseClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

const planEnforcementLockNamespace = 712_445_913;
const planDowngradeLockReason = "plan_downgrade";

type ActiveBusinessSummary = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt: Date | null;
};

function getActiveBusinessLimit(plan: BusinessPlan) {
  return getUsageLimit(plan, "businessesPerPlan");
}

function getActiveBusinessCondition(ownerUserId: string) {
  return and(
    eq(businesses.ownerUserId, ownerUserId),
    isNull(businesses.deletedAt),
    isNull(businesses.archivedAt),
    isNull(businesses.lockedAt),
  );
}

async function lockPlanEnforcementForUser(
  client: DatabaseClient,
  ownerUserId: string,
) {
  await client.execute(
    sql`select pg_advisory_xact_lock(${planEnforcementLockNamespace}, hashtext(${ownerUserId}))`,
  );
}

export async function listActiveBusinessesForOwner(
  ownerUserId: string,
  client: DatabaseClient = db,
): Promise<ActiveBusinessSummary[]> {
  const rows = await client
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      createdAt: businesses.createdAt,
      updatedAt: businesses.updatedAt,
    })
    .from(businesses)
    .where(getActiveBusinessCondition(ownerUserId))
    .orderBy(
      desc(businesses.updatedAt),
      desc(businesses.createdAt),
      asc(businesses.name),
    );

  if (rows.length === 0) {
    return [];
  }

  const recentRows = await client
    .select({
      businessId: userRecentBusinesses.businessId,
      lastOpenedAt: userRecentBusinesses.lastOpenedAt,
    })
    .from(userRecentBusinesses)
    .where(
      and(
        eq(userRecentBusinesses.userId, ownerUserId),
        inArray(
          userRecentBusinesses.businessId,
          rows.map((business) => business.id),
        ),
      ),
    );

  const recentMap = new Map(
    recentRows.map((row) => [row.businessId, row.lastOpenedAt]),
  );

  return rows
    .map((business) => ({
      ...business,
      lastOpenedAt: recentMap.get(business.id) ?? null,
    }))
    .sort((a, b) => {
      const aTime = a.lastOpenedAt?.getTime() ?? 0;
      const bTime = b.lastOpenedAt?.getTime() ?? 0;

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
}

export async function chooseDefaultBusinessToKeepActive(
  ownerUserId: string,
  client: DatabaseClient = db,
): Promise<string | null> {
  const businessesForOwner = await listActiveBusinessesForOwner(ownerUserId, client);

  return businessesForOwner[0]?.id ?? null;
}

export async function listLockCandidatesForDowngrade({
  ownerUserId,
  targetPlan,
  client = db,
}: {
  ownerUserId: string;
  targetPlan: BusinessPlan;
  client?: DatabaseClient;
}) {
  const activeBusinesses = await listActiveBusinessesForOwner(ownerUserId, client);
  const activeBusinessLimit = getActiveBusinessLimit(targetPlan);

  return {
    activeBusinessLimit,
    activeBusinesses,
    requiresSelection:
      activeBusinessLimit !== null &&
      activeBusinessLimit > 0 &&
      activeBusinesses.length > activeBusinessLimit,
  };
}

export async function lockBusinessForPlan({
  businessId,
  ownerUserId,
  actorUserId = null,
  reason = planDowngradeLockReason,
  client = db,
}: {
  businessId: string;
  ownerUserId: string;
  actorUserId?: string | null;
  reason?: string;
  client?: DatabaseClient;
}) {
  const now = new Date();

  const [updatedBusiness] = await client
    .update(businesses)
    .set({
      lockedAt: now,
      lockedBy: actorUserId,
      lockedReason: reason,
      updatedAt: now,
    })
    .where(
      and(
        eq(businesses.id, businessId),
        eq(businesses.ownerUserId, ownerUserId),
        isNull(businesses.deletedAt),
        isNull(businesses.archivedAt),
        isNull(businesses.lockedAt),
      ),
    )
    .returning({
      id: businesses.id,
    });

  return updatedBusiness ?? null;
}

export async function unlockBusinessIfAllowed({
  businessId,
  ownerUserId,
  actorUserId = null,
  targetPlan,
  client = db,
}: {
  businessId: string;
  ownerUserId: string;
  actorUserId?: string | null;
  targetPlan: BusinessPlan;
  client?: DatabaseClient;
}) {
  const activeBusinessLimit = getActiveBusinessLimit(targetPlan);

  if (activeBusinessLimit !== null) {
    const [activeCountRow] = await client
      .select({ value: sql<number>`count(*)::int` })
      .from(businesses)
      .where(getActiveBusinessCondition(ownerUserId));

    const activeCount = Number(activeCountRow?.value ?? 0);

    if (activeCount >= activeBusinessLimit) {
      return {
        ok: false as const,
        reason: "active_business_limit_reached" as const,
      };
    }
  }

  const now = new Date();
  const [updatedBusiness] = await client
    .update(businesses)
    .set({
      lockedAt: null,
      lockedBy: null,
      lockedReason: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(businesses.id, businessId),
        eq(businesses.ownerUserId, ownerUserId),
        isNull(businesses.deletedAt),
        isNull(businesses.archivedAt),
      ),
    )
    .returning({
      id: businesses.id,
    });

  if (!updatedBusiness) {
    return {
      ok: false as const,
      reason: "not_found" as const,
    };
  }

  return {
    ok: true as const,
    businessId: updatedBusiness.id,
    actorUserId,
  };
}

export async function enforceActiveBusinessLimitOnPlanChange({
  ownerUserId,
  newPlan,
  keepBusinessId,
  actorUserId = null,
  client,
}: {
  ownerUserId: string;
  newPlan: BusinessPlan;
  keepBusinessId?: string | null;
  actorUserId?: string | null;
  client?: DatabaseClient;
}) {
  const runEnforcement = async (tx: DatabaseClient) => {
    await lockPlanEnforcementForUser(tx, ownerUserId);

    const activeBusinesses = await listActiveBusinessesForOwner(ownerUserId, tx);
    const activeBusinessLimit = getActiveBusinessLimit(newPlan);

    if (
      activeBusinessLimit === null ||
      activeBusinesses.length <= activeBusinessLimit
    ) {
      return {
        activeBusinessLimit,
        keptBusinessId: keepBusinessId ?? null,
        lockedBusinessIds: [] as string[],
      };
    }

    const resolvedKeepBusinessId =
      keepBusinessId && activeBusinesses.some((business) => business.id === keepBusinessId)
        ? keepBusinessId
        : (await chooseDefaultBusinessToKeepActive(ownerUserId, tx));

    const keepSlots = Math.max(0, activeBusinessLimit);
    const preservedActiveIds = new Set<string>();

    if (resolvedKeepBusinessId) {
      preservedActiveIds.add(resolvedKeepBusinessId);
    }

    for (const business of activeBusinesses) {
      if (preservedActiveIds.size >= keepSlots) {
        break;
      }
      preservedActiveIds.add(business.id);
    }

    const lockTargets = activeBusinesses.filter(
      (business) => !preservedActiveIds.has(business.id),
    );

    const lockedBusinessIds: string[] = [];
    for (const target of lockTargets) {
      const locked = await lockBusinessForPlan({
        businessId: target.id,
        ownerUserId,
        actorUserId,
        client: tx,
      });

      if (locked) {
        lockedBusinessIds.push(target.id);
      }
    }

    return {
      activeBusinessLimit,
      keptBusinessId: Array.from(preservedActiveIds)[0] ?? null,
      lockedBusinessIds,
    };
  };

  if (client) {
    return runEnforcement(client);
  }

  return db.transaction(async (tx) => runEnforcement(tx));
}

