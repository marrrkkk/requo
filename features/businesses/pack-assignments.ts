import "server-only";

import { desc, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { cache } from "react";

import { writeAuditLog } from "@/features/audit/mutations";
import {
  BEHAVIOR_PACK_VERSION,
  type BehaviorPackAssignmentSource,
  type BehaviorPackKey,
  getBehaviorPack,
  isBehaviorPackKey,
} from "@/features/businesses/behavior-packs";
import type { BusinessType } from "@/features/inquiries/business-types";
import type { BusinessMemberRole } from "@/lib/business-members";
import { canManageBusinessAdministration } from "@/lib/business-members";
import { getBusinessPackCacheTags } from "@/lib/cache/business-tags";
import { db } from "@/lib/db/client";
import {
  businessPackAssignmentHistory,
  businessPackAssignments,
  businesses,
} from "@/lib/db/schema";
import { newEntityId } from "@/lib/ids";

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DatabaseWriter = DatabaseTransaction | typeof db;

export type PackAssignmentView = {
  businessId: string;
  pack: BehaviorPackKey | null;
  packVersion: number;
  source: BehaviorPackAssignmentSource;
  updatedAt: Date;
};

/**
 * NULL-tolerant reader (migration strategy step 2): a business without an
 * assignment row — pre-migration legacy, or a secondary type seeded as
 * unpacked — reads as `null` and keeps legacy behavior. Callers must branch
 * on `null`, never assume a pack.
 */
async function _getPackAssignmentForBusiness(
  businessId: string,
): Promise<PackAssignmentView | null> {
  const [row] = await db
    .select({
      businessId: businessPackAssignments.businessId,
      pack: businessPackAssignments.pack,
      packVersion: businessPackAssignments.packVersion,
      source: businessPackAssignments.source,
      updatedAt: businessPackAssignments.updatedAt,
    })
    .from(businessPackAssignments)
    .where(eq(businessPackAssignments.businessId, businessId))
    .limit(1);

  return row ?? null;
}

/** Request-scoped dedup around the NULL-tolerant reader. */
export const getPackAssignmentForBusiness = cache(_getPackAssignmentForBusiness);

export async function getPackAssignmentHistoryForBusiness(
  businessId: string,
  limit = 50,
) {
  return db
    .select({
      id: businessPackAssignmentHistory.id,
      pack: businessPackAssignmentHistory.pack,
      packVersion: businessPackAssignmentHistory.packVersion,
      source: businessPackAssignmentHistory.source,
      actorUserId: businessPackAssignmentHistory.actorUserId,
      createdAt: businessPackAssignmentHistory.createdAt,
    })
    .from(businessPackAssignmentHistory)
    .where(eq(businessPackAssignmentHistory.businessId, businessId))
    .orderBy(desc(businessPackAssignmentHistory.createdAt))
    .limit(limit);
}

function resolvePackOrThrow(pack: BehaviorPackKey | null): BehaviorPackKey | null {
  if (pack !== null && !isBehaviorPackKey(pack)) {
    throw new Error("Unknown behavior pack.");
  }

  return pack;
}

async function insertAssignmentRows(
  writer: DatabaseWriter,
  input: {
    businessId: string;
    pack: BehaviorPackKey | null;
    source: BehaviorPackAssignmentSource;
    actorUserId?: string | null;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const pack = resolvePackOrThrow(input.pack);

  await writer.insert(businessPackAssignments).values({
    id: newEntityId(),
    businessId: input.businessId,
    pack,
    packVersion: BEHAVIOR_PACK_VERSION,
    source: input.source,
    createdAt: now,
    updatedAt: now,
  });

  await writer.insert(businessPackAssignmentHistory).values({
    id: newEntityId(),
    businessId: input.businessId,
    pack,
    packVersion: BEHAVIOR_PACK_VERSION,
    source: input.source,
    actorUserId: input.actorUserId ?? null,
    createdAt: now,
  });
}

/**
 * Onboarding/seed write path. Runs inside the business-creation transaction
 * (or the backfill script): derives the pack from the stored type via the
 * single resolver choke point and writes current + history rows together.
 * Future-only by construction — the stored type and all existing records are
 * untouched.
 */
export async function assignPackForNewBusiness(
  tx: DatabaseTransaction,
  input: {
    businessId: string;
    businessType: BusinessType;
    source: BehaviorPackAssignmentSource;
    actorUserId?: string | null;
    now?: Date;
  },
) {
  await insertAssignmentRows(tx, {
    ...input,
    pack: getBehaviorPack(input.businessType),
  });
}

export async function switchBusinessPackForBusiness(input: {
  businessId: string;
  /** `null` moves the business to unpacked (legacy behavior). */
  pack: BehaviorPackKey | null;
  actorUserId: string;
  actorRole: BusinessMemberRole;
  actorName?: string | null;
  actorEmail?: string | null;
  source?: Extract<BehaviorPackAssignmentSource, "switch" | "reset">;
  now?: Date;
}) {
  if (!canManageBusinessAdministration(input.actorRole)) {
    throw new Error("Only the business owner can change the behavior pack.");
  }

  const pack = resolvePackOrThrow(input.pack);
  const source = input.source ?? "switch";
  const now = input.now ?? new Date();

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: businessPackAssignments.id })
      .from(businessPackAssignments)
      .where(eq(businessPackAssignments.businessId, input.businessId))
      .limit(1);

    if (existing) {
      await tx
        .update(businessPackAssignments)
        .set({ pack, packVersion: BEHAVIOR_PACK_VERSION, source, updatedAt: now })
        .where(eq(businessPackAssignments.businessId, input.businessId));
    } else {
      await tx.insert(businessPackAssignments).values({
        id: newEntityId(),
        businessId: input.businessId,
        pack,
        packVersion: BEHAVIOR_PACK_VERSION,
        source,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx.insert(businessPackAssignmentHistory).values({
      id: newEntityId(),
      businessId: input.businessId,
      pack,
      packVersion: BEHAVIOR_PACK_VERSION,
      source,
      actorUserId: input.actorUserId,
      createdAt: now,
    });

    await writeAuditLog(tx, {
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      actorEmail: input.actorEmail,
      entityType: "business",
      entityId: input.businessId,
      action: "business.pack_assigned",
      metadata: { pack, packVersion: BEHAVIOR_PACK_VERSION, source },
      createdAt: now,
    });
  });

  for (const tag of getBusinessPackCacheTags(input.businessId)) {
    revalidateTag(tag, "max");
  }
}

/**
 * User-initiated reset to defaults (strategy §6): re-derives the pack from
 * the stored business type and records it as a `reset` source row. Config
 * tables only — history rows and all commercial records are untouched.
 */
export async function resetBusinessPackForBusiness(input: {
  businessId: string;
  actorUserId: string;
  actorRole: BusinessMemberRole;
  actorName?: string | null;
  actorEmail?: string | null;
  now?: Date;
}) {
  const [business] = await db
    .select({ businessType: businesses.businessType })
    .from(businesses)
    .where(eq(businesses.id, input.businessId))
    .limit(1);

  if (!business) {
    throw new Error("Business not found.");
  }

  await switchBusinessPackForBusiness({
    ...input,
    pack: getBehaviorPack(business.businessType),
    source: "reset",
  });
}
