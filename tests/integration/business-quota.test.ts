import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { count, eq, like } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import { createBusinessForUser } from "@/features/businesses/mutations";
import {
  BusinessQuotaExceededError,
  getBusinessQuotaForUser,
  getOwnedBusinessCountForUser,
} from "@/features/businesses/quota";
import { businesses, businessMembers, profiles, user, accountSubscriptions } from "@/lib/db/schema";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_business_quota";
const now = new Date("2026-05-07T00:00:00.000Z");

function slug(value: string) {
  return value.replace(/_/g, "-");
}

async function cleanup() {
  await testDb.delete(businessMembers).where(like(businessMembers.userId, `${prefix}%`));
  await testDb.delete(businesses).where(like(businesses.ownerUserId, `${prefix}%`));
  await testDb.delete(profiles).where(like(profiles.userId, `${prefix}%`));
  await testDb.delete(user).where(like(user.id, `${prefix}%`));
}

async function createTestUser(userId: string) {
  await testDb.insert(user).values({
    id: userId,
    name: "Business Quota Owner",
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
}

async function createExistingBusiness({
  id: bizId,
  ownerUserId,
  plan: bizPlan = "free",
  deletedAt = null,
}: {
  id: string;
  ownerUserId: string;
  plan?: plan;
  deletedAt?: Date | null;
}) {
  await testDb.insert(businesses).values({
    id: bizId,
    ownerUserId,
    name: bizId,
    slug: slug(bizId),
    plan: bizPlan,
    businessType: "general_project_services",
    defaultCurrency: "USD",
    deletedAt,
    createdAt: now,
    updatedAt: now,
  });

  await testDb.insert(businessMembers).values({
    id: `${bizId}_member`,
    businessId: bizId,
    userId: ownerUserId,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  });
}

function inputFor(userId: string, name: string) {
  return {
    user: {
      id: userId,
      name: "Business Quota Owner",
      email: `${userId}@example.com`,
    },
    businessId: slug(name),
    defaultCurrency: "USD",
    name,
    businessType: "general_project_services" as const,
    plan: "free" as plan,
  };
}

describe("global business quota enforcement", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await closeTestDb();
  });

  it("counts owned businesses across all non-deleted businesses", async () => {
    const ownerId = `${prefix}_count_owner`;
    const otherOwnerId = `${prefix}_count_other`;

    await createTestUser(ownerId);
    await createTestUser(otherOwnerId);
    await createExistingBusiness({
      id: `${prefix}_count_business_a`,
      ownerUserId: ownerId,
    });
    await createExistingBusiness({
      id: `${prefix}_count_business_b`,
      ownerUserId: ownerId,
    });
    await createExistingBusiness({
      id: `${prefix}_count_business_deleted`,
      ownerUserId: ownerId,
      deletedAt: now,
    });
    await createExistingBusiness({
      id: `${prefix}_count_business_other`,
      ownerUserId: otherOwnerId,
    });

    const quota = await getBusinessQuotaForUser({
      ownerUserId: ownerId,
      plan: "free",
    });

    expect(quota.current).toBe(2);
    expect(quota.limit).toBe(1);
    expect(quota.allowed).toBe(false);
  });

  it("blocks free users after one total business", async () => {
    const ownerId = `${prefix}_free_owner`;

    await createTestUser(ownerId);
    await createExistingBusiness({
      id: `${prefix}_free_existing`,
      ownerUserId: ownerId,
    });

    await expect(
      createBusinessForUser({ ...inputFor(ownerId, "Blocked Business") }),
    ).rejects.toBeInstanceOf(BusinessQuotaExceededError);

    const [row] = await testDb
      .select({ value: count(businesses.id) })
      .from(businesses)
      .where(eq(businesses.ownerUserId, ownerId));

    // 1 existing + 0 new = 1
    expect(Number(row?.value ?? 0)).toBe(1);
  });

  it("allows business plan users with any owned business count", async () => {
    const ownerId = `${prefix}_business_owner`;

    await createTestUser(ownerId);

    await testDb.insert(businesses).values(
      Array.from({ length: 12 }, (_, index) => ({
        id: `${prefix}_business_existing_${index}`,
        ownerUserId: ownerId,
        name: `${prefix}_business_existing_${index}`,
        slug: slug(`${prefix}_business_existing_${index}`),
        plan: "business" as plan,
        businessType: "general_project_services" as const,
    timezone: "America/New_York",
    
    
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      })),
    );

    await testDb.insert(accountSubscriptions).values({
      id: `${prefix}_sub`,
      userId: ownerId,
      status: "active",
      plan: "business",
      billingProvider: "polar",
      billingCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      createBusinessForUser({ ...inputFor(ownerId, "Unlimited Business"), plan: "business" }),
    ).resolves.toEqual(
      expect.objectContaining({
        slug: expect.any(String),
      }),
    );

    await expect(getOwnedBusinessCountForUser(ownerId)).resolves.toBe(13);

    await testDb.delete(accountSubscriptions).where(eq(accountSubscriptions.userId, ownerId));
  });

  it("serializes concurrent free business creation for the same owner", async () => {
    const ownerId = `${prefix}_race_owner`;

    await createTestUser(ownerId);
    await testDb.insert(profiles).values({
      userId: ownerId,
      fullName: "Business Quota Owner",
      createdAt: now,
      updatedAt: now,
    });

    const results = await Promise.allSettled([
      createBusinessForUser({ ...inputFor(ownerId, "Race Business A") }),
      createBusinessForUser({ ...inputFor(ownerId, "Race Business B") }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await getOwnedBusinessCountForUser(ownerId)).toBe(1);
  });
});
