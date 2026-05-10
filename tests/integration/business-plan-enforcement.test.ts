import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, isNull } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");
  return { db: mockedDb };
});

import { enforceActiveBusinessLimitOnPlanChange } from "@/features/businesses/plan-enforcement";
import { businesses, userRecentBusinesses } from "@/lib/db/schema";

import { closeTestDb, testDb } from "./db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "./workflow-fixtures";

const prefix = "test_business_plan_enforcement";
let ids: WorkflowFixtureIds;

describe("business plan enforcement", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("locks extra active businesses on free downgrade while keeping selected business active", async () => {
    await testDb
      .update(businesses)
      .set({
        archivedAt: null,
        archivedBy: null,
        lockedAt: null,
        lockedBy: null,
        lockedReason: null,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, ids.archivedBusinessId));

    const result = await enforceActiveBusinessLimitOnPlanChange({
      ownerUserId: ids.ownerUserId,
      newPlan: "free",
      keepBusinessId: ids.businessId,
      actorUserId: ids.ownerUserId,
    });

    expect(result.keptBusinessId).toBe(ids.businessId);
    expect(result.lockedBusinessIds).toContain(ids.archivedBusinessId);

    const [kept] = await testDb
      .select({
        id: businesses.id,
        lockedAt: businesses.lockedAt,
      })
      .from(businesses)
      .where(eq(businesses.id, ids.businessId))
      .limit(1);

    const [locked] = await testDb
      .select({
        id: businesses.id,
        lockedAt: businesses.lockedAt,
        lockedReason: businesses.lockedReason,
      })
      .from(businesses)
      .where(eq(businesses.id, ids.archivedBusinessId))
      .limit(1);

    expect(kept?.lockedAt).toBeNull();
    expect(locked?.lockedAt).toBeInstanceOf(Date);
    expect(locked?.lockedReason).toBe("plan_downgrade");
  });

  it("defaults to the most recently opened business when no keep selection is provided", async () => {
    const now = new Date();
    const older = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await testDb
      .update(businesses)
      .set({
        archivedAt: null,
        archivedBy: null,
        lockedAt: null,
        lockedBy: null,
        lockedReason: null,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businesses.ownerUserId, ids.ownerUserId),
          isNull(businesses.deletedAt),
        ),
      );

    await testDb
      .delete(userRecentBusinesses)
      .where(eq(userRecentBusinesses.userId, ids.ownerUserId));

    await testDb.insert(userRecentBusinesses).values([
      {
        userId: ids.ownerUserId,
        businessId: ids.businessId,
        lastOpenedAt: older,
        createdAt: older,
        updatedAt: older,
      },
      {
        userId: ids.ownerUserId,
        businessId: ids.archivedBusinessId,
        lastOpenedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await enforceActiveBusinessLimitOnPlanChange({
      ownerUserId: ids.ownerUserId,
      newPlan: "free",
      actorUserId: ids.ownerUserId,
    });

    expect(result.keptBusinessId).toBe(ids.archivedBusinessId);
    expect(result.lockedBusinessIds).toContain(ids.businessId);
  });
});

