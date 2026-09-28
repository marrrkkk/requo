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
import {
  getPackAssignmentForBusiness,
  getPackAssignmentHistoryForBusiness,
  resetBusinessPackForBusiness,
  switchBusinessPackForBusiness,
} from "@/features/businesses/pack-assignments";
import {
  auditLogs,
  businessMembers,
  businessPackAssignmentHistory,
  businessPackAssignments,
  businesses,
  profiles,
  user,
} from "@/lib/db/schema";
import type { BusinessType } from "@/features/inquiries/business-types";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_pack_assign";
const now = new Date("2026-05-07T00:00:00.000Z");

function slug(value: string) {
  return value.replace(/_/g, "-");
}

async function cleanup() {
  await testDb
    .delete(businessPackAssignmentHistory)
    .where(like(businessPackAssignmentHistory.businessId, `${prefix}%`));
  await testDb
    .delete(businessPackAssignments)
    .where(like(businessPackAssignments.businessId, `${prefix}%`));
  await testDb.delete(auditLogs).where(like(auditLogs.businessId, `${prefix}%`));
  await testDb.delete(businessMembers).where(like(businessMembers.userId, `${prefix}%`));
  await testDb.delete(businesses).where(like(businesses.ownerUserId, `${prefix}%`));
  await testDb.delete(profiles).where(like(profiles.userId, `${prefix}%`));
  await testDb.delete(user).where(like(user.id, `${prefix}%`));
}

async function createTestUser(userId: string) {
  await testDb.insert(user).values({
    id: userId,
    name: "Pack Assignment Owner",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
}

function inputFor(userId: string, name: string, businessType: BusinessType = "contractor_home_improvement") {
  return {
    user: {
      id: userId,
      name: "Pack Assignment Owner",
      email: `${userId}@example.com`,
    },
    businessId: slug(name),
    defaultCurrency: "USD",
    name,
    businessType,
    plan: "free" as plan,
  };
}

describe("pack assignments", () => {
  beforeEach(async () => {
    await cleanup();
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await closeTestDb();
  }, 30_000);

  it("assigns the resolver pack on business creation with history", async () => {
    const userId = `${prefix}_owner_1`;
    await createTestUser(userId);
    const name = `${prefix}_contractor_1`;

    await createBusinessForUser(inputFor(userId, name));

    const assignment = await getPackAssignmentForBusiness(slug(name));
    expect(assignment?.pack).toBe("contractors_home_services");
    expect(assignment?.packVersion).toBe(1);
    expect(assignment?.source).toBe("onboarding");

    const history = await getPackAssignmentHistoryForBusiness(slug(name));
    expect(history).toHaveLength(1);
    expect(history[0]?.pack).toBe("contractors_home_services");
    expect(history[0]?.source).toBe("onboarding");
  }, 30_000);

  it("seeds secondary types as unpacked without touching the stored type", async () => {
    const userId = `${prefix}_owner_2`;
    await createTestUser(userId);
    const name = `${prefix}_cleaning_1`;

    await createBusinessForUser(inputFor(userId, name, "cleaning_services"));

    const assignment = await getPackAssignmentForBusiness(slug(name));
    expect(assignment?.pack).toBeNull();
    expect(assignment?.source).toBe("onboarding");

    const [business] = await testDb
      .select({ businessType: businesses.businessType })
      .from(businesses)
      .where(eq(businesses.id, slug(name)));

    expect(business?.businessType).toBe("cleaning_services");
  }, 30_000);

  it("reads legacy businesses without rows as null (NULL-tolerant)", async () => {
    const userId = `${prefix}_owner_3`;
    const businessId = `${prefix}-legacy-1`.replace(/_/g, "-");
    await createTestUser(userId);
    await testDb.insert(businesses).values({
      id: businessId,
      ownerUserId: userId,
      name: businessId,
      slug: businessId,
      plan: "free",
      businessType: "contractor_home_improvement",
      defaultCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    });

    expect(await getPackAssignmentForBusiness(businessId)).toBeNull();
    expect(await getPackAssignmentHistoryForBusiness(businessId)).toEqual([]);
  }, 30_000);

  it("owner switches append history and preserve prior rows, with audit", async () => {
    const userId = `${prefix}_owner_4`;
    await createTestUser(userId);
    const name = `${prefix}_switch_1`;

    await createBusinessForUser(inputFor(userId, name));

    await switchBusinessPackForBusiness({
      businessId: slug(name),
      pack: "creative_marketing",
      actorUserId: userId,
      actorRole: "owner",
      actorName: "Pack Assignment Owner",
      actorEmail: `${userId}@example.com`,
    });

    const assignment = await getPackAssignmentForBusiness(slug(name));
    expect(assignment?.pack).toBe("creative_marketing");
    expect(assignment?.source).toBe("switch");

    const history = await getPackAssignmentHistoryForBusiness(slug(name));
    expect(history).toHaveLength(2);
    expect(history.map((row) => row.pack)).toContain("contractors_home_services");
    expect(history.map((row) => row.pack)).toContain("creative_marketing");

    const audits = await testDb
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.businessId, slug(name)));
    expect(audits.map((row) => row.action)).toContain("business.pack_assigned");
  }, 30_000);

  it("rejects non-owner switches without changing the assignment", async () => {
    const userId = `${prefix}_owner_5`;
    await createTestUser(userId);
    const name = `${prefix}_switch_2`;

    await createBusinessForUser(inputFor(userId, name));

    await expect(
      switchBusinessPackForBusiness({
        businessId: slug(name),
        pack: "creative_marketing",
        actorUserId: userId,
        actorRole: "manager",
      }),
    ).rejects.toThrow();

    const assignment = await getPackAssignmentForBusiness(slug(name));
    expect(assignment?.pack).toBe("contractors_home_services");
    expect(await getPackAssignmentHistoryForBusiness(slug(name))).toHaveLength(1);
  }, 30_000);

  it("rejects unknown packs fail-closed", async () => {
    const userId = `${prefix}_owner_6`;
    await createTestUser(userId);
    const name = `${prefix}_switch_3`;

    await createBusinessForUser(inputFor(userId, name));

    await expect(
      switchBusinessPackForBusiness({
        businessId: slug(name),
        // @ts-expect-error adversarial: unknown pack strings fail closed
        pack: "contractors",
        actorUserId: userId,
        actorRole: "owner",
      }),
    ).rejects.toThrow("Unknown behavior pack");
  }, 30_000);

  it("reset re-derives the pack from the stored type", async () => {
    const userId = `${prefix}_owner_7`;
    await createTestUser(userId);
    const name = `${prefix}_reset_1`;

    await createBusinessForUser(inputFor(userId, name));

    await switchBusinessPackForBusiness({
      businessId: slug(name),
      pack: "photo_video",
      actorUserId: userId,
      actorRole: "owner",
    });

    await resetBusinessPackForBusiness({
      businessId: slug(name),
      actorUserId: userId,
      actorRole: "owner",
    });

    const assignment = await getPackAssignmentForBusiness(slug(name));
    expect(assignment?.pack).toBe("contractors_home_services");
    expect(assignment?.source).toBe("reset");
    expect(await getPackAssignmentHistoryForBusiness(slug(name))).toHaveLength(3);
  }, 30_000);
});
