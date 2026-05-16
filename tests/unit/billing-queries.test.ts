import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cacheLifeMock,
  cacheTagMock,
  dbSelectFromMock,
  dbSelectLimitMock,
  dbSelectMock,
  dbSelectWhereMock,
  listLockCandidatesForDowngradeMock,
  getAccountSubscriptionMock,
  getCachedAccountSubscriptionMock,
  resolveEffectivePlanFromSubscriptionMock,
} = vi.hoisted(() => ({
  cacheLifeMock: vi.fn(),
  cacheTagMock: vi.fn(),
  dbSelectFromMock: vi.fn(),
  dbSelectLimitMock: vi.fn(),
  dbSelectMock: vi.fn(),
  dbSelectWhereMock: vi.fn(),
  listLockCandidatesForDowngradeMock: vi.fn(),
  getAccountSubscriptionMock: vi.fn(),
  getCachedAccountSubscriptionMock: vi.fn(),
  resolveEffectivePlanFromSubscriptionMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => "and"),
  desc: vi.fn(() => "desc"),
  eq: vi.fn(() => "eq"),
  inArray: vi.fn(() => "inArray"),
}));

vi.mock("next/cache", () => ({
  cacheLife: cacheLifeMock,
  cacheTag: cacheTagMock,
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock("@/lib/db/schema/businesses", () => ({
  businesses: {
    id: "id",
    name: "name",
    plan: "plan",
    slug: "slug",
  },
}));

vi.mock("@/lib/db/schema/subscriptions", () => ({
  paymentAttempts: {
    createdAt: "createdAt",
    businessId: "businessId",
    status: "status",
    userId: "userId",
  },
}));

vi.mock("@/lib/billing/subscription-service", () => ({
  getAccountSubscription: getAccountSubscriptionMock,
  getCachedAccountSubscription: getCachedAccountSubscriptionMock,
  resolveEffectivePlanFromSubscription: resolveEffectivePlanFromSubscriptionMock,
}));

vi.mock("@/features/businesses/plan-enforcement", () => ({
  listLockCandidatesForDowngrade: listLockCandidatesForDowngradeMock,
}));

import { getBusinessBillingOverview } from "@/features/billing/queries";

function mockSubscription(overrides: { plan?: string; status?: string } = {}) {
  return {
    billingCurrency: "USD",
    billingProvider: "polar",
    canceledAt: null,
    currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
    currentPeriodStart: new Date("2026-05-01T00:00:00.000Z"),
    plan: overrides.plan ?? "pro",
    providerSubscriptionId: "sub_123",
    status: overrides.status ?? "active",
  };
}

describe("features/billing/queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    dbSelectWhereMock.mockReturnValue({
      limit: dbSelectLimitMock,
    });
    dbSelectFromMock.mockReturnValue({
      where: dbSelectWhereMock,
    });
    dbSelectMock.mockReturnValue({
      from: dbSelectFromMock,
    });
    dbSelectLimitMock.mockResolvedValue([
      {
        id: "business_123",
        ownerUserId: "user_123",
        name: "Acme Services",
        plan: "free",
        slug: "acme-services",
      },
    ]);

    getAccountSubscriptionMock.mockResolvedValue(null);
    getCachedAccountSubscriptionMock.mockResolvedValue(null);
    listLockCandidatesForDowngradeMock.mockResolvedValue({
      activeBusinessLimit: null,
      activeBusinesses: [],
      requiresSelection: false,
    });
    resolveEffectivePlanFromSubscriptionMock.mockImplementation(
      (subscription: { plan: string; status: string }) =>
        subscription.status === "active" || subscription.status === "past_due"
          ? subscription.plan
          : "free",
    );
  });

  it("derives the current plan from the authoritative subscription row", async () => {
    getAccountSubscriptionMock.mockResolvedValue(
      mockSubscription({ plan: "pro", status: "active" }),
    );

    const overview = await getBusinessBillingOverview("business_123");

    expect(overview).toMatchObject({
      currentPlan: "pro",
      subscription: {
        currency: "USD",
        plan: "pro",
        provider: "polar",
        status: "active",
      },
      userId: "user_123",
      businessId: "business_123",
      businessName: "Acme Services",
      businessSlug: "acme-services",
    });
    expect(resolveEffectivePlanFromSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        status: "active",
      }),
    );
  });

  it("falls back to the business plan when no subscription row exists", async () => {
    const overview = await getBusinessBillingOverview("business_123");

    expect(overview).toMatchObject({
      currentPlan: "free",
      subscription: null,
      userId: "user_123",
      businessId: "business_123",
    });
    expect(resolveEffectivePlanFromSubscriptionMock).not.toHaveBeenCalled();
  });
});
