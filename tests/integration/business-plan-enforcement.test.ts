import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, isNull } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");
  return { db: mockedDb };
});

import {
  enforceActiveBusinessLimitOnPlanChange,
  listLockCandidatesForDowngrade,
} from "@/features/businesses/plan-enforcement";
import { businesses } from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_business_plan_enforcement";
let ids: WorkflowFixtureIds;

const extraBusinessId = `${prefix}_business_extra`;
const extraBusinessSlug = "test-business-plan-enforcement-extra";

describe("business plan enforcement — one Free business per owner", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);

    await testDb.insert(businesses).values({
      id: extraBusinessId,
      ownerUserId: ids.ownerUserId,
      name: "Extra Plan Enforcement Business",
      slug: extraBusinessSlug,
      plan: "free",
      businessType: "general_project_services",
      defaultCurrency: "USD",
      createdAt: new Date(),
      updatedAt: new Date(Date.now() + 60 * 60 * 1000),
    });
  }, 30_000);

  afterAll(async () => {
    await testDb.delete(businesses).where(eq(businesses.id, extraBusinessId));
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  async function resetBusinessStates() {
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
  }

  it("blocks a free downgrade while another active free business exists, without locking anything", async () => {
    await resetBusinessStates();

    const result = await enforceActiveBusinessLimitOnPlanChange({
      ownerUserId: ids.ownerUserId,
      newPlan: "free",
      keepBusinessId: ids.businessId,
      actorUserId: ids.ownerUserId,
    });

    // The other two active free businesses are blockers; nothing gets locked.
    expect(result.keptBusinessId).toBe(ids.businessId);
    expect(result.lockedBusinessIds).toEqual([]);
    expect(result.blockingFreeBusinessIds).toContain(ids.archivedBusinessId);
    expect(result.blockingFreeBusinessIds).toContain(extraBusinessId);

    const [kept] = await testDb
      .select({
        id: businesses.id,
        lockedAt: businesses.lockedAt,
      })
      .from(businesses)
      .where(eq(businesses.id, ids.businessId))
      .limit(1);

    expect(kept?.lockedAt).toBeNull();

    const [other] = await testDb
      .select({
        id: businesses.id,
        lockedAt: businesses.lockedAt,
      })
      .from(businesses)
      .where(eq(businesses.id, ids.archivedBusinessId))
      .limit(1);

    expect(other?.lockedAt).toBeNull();
  });

  it("allows a free downgrade when no other active free business exists", async () => {
    await resetBusinessStates();

    // Archive the two other businesses so only `ids.businessId` stays active.
    await testDb
      .update(businesses)
      .set({
        archivedAt: new Date(),
        archivedBy: ids.ownerUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businesses.ownerUserId, ids.ownerUserId),
          eq(businesses.id, ids.archivedBusinessId),
        ),
      );

    await testDb
      .update(businesses)
      .set({
        archivedAt: new Date(),
        archivedBy: ids.ownerUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businesses.ownerUserId, ids.ownerUserId),
          eq(businesses.id, extraBusinessId),
        ),
      );

    const result = await enforceActiveBusinessLimitOnPlanChange({
      ownerUserId: ids.ownerUserId,
      newPlan: "free",
      keepBusinessId: ids.businessId,
      actorUserId: ids.ownerUserId,
    });

    expect(result.lockedBusinessIds).toEqual([]);
    expect(result.blockingFreeBusinessIds).toEqual([]);
  });

  it("lists the blocking free businesses in the downgrade preview", async () => {
    await resetBusinessStates();

    const preview = await listLockCandidatesForDowngrade({
      ownerUserId: ids.ownerUserId,
      targetPlan: "free",
    });

    expect(preview.activeBusinessLimit).toBe(1);
    expect(preview.requiresSelection).toBe(true);
    expect(preview.activeBusinesses.map((business) => business.id)).toEqual(
      expect.arrayContaining([ids.businessId, ids.archivedBusinessId, extraBusinessId]),
    );
  });

  it("does not restrict downgrades to paid plans", async () => {
    await resetBusinessStates();

    const result = await enforceActiveBusinessLimitOnPlanChange({
      ownerUserId: ids.ownerUserId,
      newPlan: "pro",
      keepBusinessId: ids.businessId,
    });

    expect(result.lockedBusinessIds).toEqual([]);
    expect(result.blockingFreeBusinessIds).toEqual([]);
    expect(result.activeBusinessLimit).toBeNull();

    const preview = await listLockCandidatesForDowngrade({
      ownerUserId: ids.ownerUserId,
      targetPlan: "pro",
    });
    expect(preview.requiresSelection).toBe(false);
    expect(preview.activeBusinesses).toEqual([]);
  });
});