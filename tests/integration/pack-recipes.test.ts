import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, like } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

import { createBusinessForUser } from "@/features/businesses/mutations";
import type { BusinessType } from "@/features/inquiries/business-types";
import {
  activateRecipeVersionForBusiness,
  createRecipeVersionForBusiness,
  getActiveRecipeForBusiness,
} from "@/features/businesses/pack-recipes";
import {
  businessPackAssignments,
  businessPackAssignmentHistory,
  businesses,
  businessMembers,
  packRecipes,
  profiles,
  user,
} from "@/lib/db/schema";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_pack_recipes";
const now = new Date("2026-05-07T00:00:00.000Z");

function slug(value: string) {
  return value.replace(/_/g, "-");
}

async function cleanup() {
  await testDb.delete(packRecipes).where(like(packRecipes.businessId, `${prefix}%`));
  await testDb
    .delete(businessPackAssignmentHistory)
    .where(like(businessPackAssignmentHistory.businessId, `${prefix}%`));
  await testDb
    .delete(businessPackAssignments)
    .where(like(businessPackAssignments.businessId, `${prefix}%`));
  await testDb.delete(businessMembers).where(like(businessMembers.userId, `${prefix}%`));
  await testDb.delete(businesses).where(like(businesses.ownerUserId, `${prefix}%`));
  await testDb.delete(profiles).where(like(profiles.userId, `${prefix}%`));
  await testDb.delete(user).where(like(user.id, `${prefix}%`));
}

async function createTestUser(userId: string) {
  await testDb.insert(user).values({
    id: userId,
    name: "Recipe Owner",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
}

async function createBusiness(userId: string, name: string, businessType: BusinessType, plan: plan = "free") {
  await createBusinessForUser({
    user: { id: userId, name: "Recipe Owner", email: `${userId}@example.com` },
    businessId: slug(name),
    defaultCurrency: "USD",
    name,
    businessType,
    plan,
  });

  return slug(name);
}

describe("pack recipes", () => {
  beforeEach(async () => {
    await cleanup();
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await closeTestDb();
  }, 30_000);

  it("seeds v1 recipes for packed businesses on creation", async () => {
    const userId = `${prefix}_owner_1`;
    await createTestUser(userId);
    const businessId = await createBusiness(userId, `${prefix}_biz_1`, "contractor_home_improvement");

    for (const kind of ["intake", "scope", "approval", "schedule", "ai_guidance"] as const) {
      const recipe = await getActiveRecipeForBusiness(businessId, kind, "contractors_home_services");
      expect(recipe.source).toBe("db");
      expect(recipe.version).toBe(1);
    }
  }, 30_000);

  it("leaves unpacked businesses on code defaults", async () => {
    const userId = `${prefix}_owner_2`;
    await createTestUser(userId);
    const businessId = await createBusiness(userId, `${prefix}_biz_2`, "cleaning_services");

    const recipe = await getActiveRecipeForBusiness(businessId, "intake", null);
    expect(recipe.source).toBe("code");
    expect(recipe.config).toEqual({});

    const rows = await testDb
      .select()
      .from(packRecipes)
      .where(eq(packRecipes.businessId, businessId));

    expect(rows).toHaveLength(0);
  }, 30_000);

  it("gates customization behind Pro and roles", async () => {
    const userId = `${prefix}_owner_3`;
    await createTestUser(userId);
    const businessId = await createBusiness(userId, `${prefix}_biz_3`, "contractor_home_improvement");

    const config = {
      version: 1,
      requiredKinds: ["deliverables"],
      recommendedKinds: [],
    };

    // Free plan: refused.
    await expect(
      createRecipeVersionForBusiness({
        businessId,
        pack: "contractors_home_services",
        kind: "scope",
        config,
        actorRole: "owner",
      }),
    ).rejects.toThrow("Pro plan");

    // Staff: refused even before plan check.
    await testDb
      .update(businesses)
      .set({ plan: "pro" })
      .where(eq(businesses.id, businessId));

    await expect(
      createRecipeVersionForBusiness({
        businessId,
        pack: "contractors_home_services",
        kind: "scope",
        config,
        actorRole: "staff",
      }),
    ).rejects.toThrow("owner or manager");

    // Manager on Pro: new inactive version.
    const created = await createRecipeVersionForBusiness({
      businessId,
      pack: "contractors_home_services",
      kind: "scope",
      config,
      actorRole: "manager",
    });

    expect(created.version).toBe(2);

    // Manager cannot activate; owner can.
    await expect(
      activateRecipeVersionForBusiness({
        businessId,
        kind: "scope",
        version: 2,
        actorRole: "manager",
      }),
    ).rejects.toThrow("Only the business owner");

    await activateRecipeVersionForBusiness({
      businessId,
      kind: "scope",
      version: 2,
      actorRole: "owner",
    });

    const active = await getActiveRecipeForBusiness(businessId, "scope", "contractors_home_services");
    expect(active.version).toBe(2);
    expect(active.config).toMatchObject({ requiredKinds: ["deliverables"] });
  }, 30_000);

  it("refuses activation of invalid versions fail-closed", async () => {
    const userId = `${prefix}_owner_4`;
    await createTestUser(userId);
    const businessId = await createBusiness(userId, `${prefix}_biz_4`, "contractor_home_improvement", "pro");

    // Creation input never sets plan (billing owns plan writes); promote directly.
    await testDb
      .update(businesses)
      .set({ plan: "pro" })
      .where(eq(businesses.id, businessId));

    // Bypass write-time validation with a raw insert simulating drift.
    const { newEntityId } = await import("@/lib/ids");
    await testDb.insert(packRecipes).values({
      id: newEntityId(),
      businessId,
      pack: "contractors_home_services",
      kind: "intake",
      version: 2,
      active: false,
      config: {
        version: 1,
        criticalFields: [{ label: "X", criticality: "critical", behaviors: ["teleport"] }],
      },
      effectiveAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      activateRecipeVersionForBusiness({
        businessId,
        kind: "intake",
        version: 2,
        actorRole: "owner",
      }),
    ).rejects.toThrow("cannot activate");

    const active = await getActiveRecipeForBusiness(businessId, "intake", "contractors_home_services");
    expect(active.version).toBe(1);
  }, 30_000);
});
