import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  cacheLifeMock,
  cacheTagMock,
  dbSelectFromMock,
  dbSelectLimitMock,
  dbSelectMock,
  dbSelectWhereMock,
  getWorkspaceSubscriptionMock,
  headersMock,
  resolveEffectivePlanFromSubscriptionMock,
} = vi.hoisted(() => ({
  cacheLifeMock: vi.fn(),
  cacheTagMock: vi.fn(),
  dbSelectFromMock: vi.fn(),
  dbSelectLimitMock: vi.fn(),
  dbSelectMock: vi.fn(),
  dbSelectWhereMock: vi.fn(),
  getWorkspaceSubscriptionMock: vi.fn(),
  headersMock: vi.fn(),
  resolveEffectivePlanFromSubscriptionMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("drizzle-orm", () => ({
  desc: vi.fn(() => "desc"),
  eq: vi.fn(() => "eq"),
}));

vi.mock("next/cache", () => ({
  cacheLife: cacheLifeMock,
  cacheTag: cacheTagMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock("@/lib/db/schema/workspaces", () => ({
  workspaces: {
    id: "id",
    name: "name",
    plan: "plan",
    slug: "slug",
  },
}));

vi.mock("@/lib/db/schema/subscriptions", () => ({
  paymentAttempts: {
    createdAt: "createdAt",
    workspaceId: "workspaceId",
  },
}));

vi.mock("@/lib/billing/subscription-service", () => ({
  getWorkspaceSubscription: getWorkspaceSubscriptionMock,
  resolveEffectivePlanFromSubscription: resolveEffectivePlanFromSubscriptionMock,
}));

import { getWorkspaceBillingOverview } from "@/features/billing/queries";

function mockSubscription(overrides: { plan?: string; status?: string } = {}) {
  return {
    billingCurrency: "USD",
    billingProvider: "paddle",
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
        id: "workspace_123",
        name: "Acme Services",
        plan: "free",
        slug: "acme-services",
      },
    ]);

    headersMock.mockResolvedValue(
      new Headers({
        "x-vercel-ip-country": "US",
      }),
    );
    getWorkspaceSubscriptionMock.mockResolvedValue(null);
    resolveEffectivePlanFromSubscriptionMock.mockImplementation(
      (subscription: { plan: string; status: string }) =>
        subscription.status === "active" || subscription.status === "past_due"
          ? subscription.plan
          : "free",
    );
  });

  it("derives the current plan from the authoritative subscription row", async () => {
    getWorkspaceSubscriptionMock.mockResolvedValue(
      mockSubscription({ plan: "pro", status: "active" }),
    );

    const overview = await getWorkspaceBillingOverview("workspace_123");

    expect(overview).toMatchObject({
      currentPlan: "pro",
      defaultCurrency: "USD",
      region: "INTL",
      subscription: {
        currency: "USD",
        plan: "pro",
        provider: "paddle",
        status: "active",
      },
      workspaceId: "workspace_123",
      workspaceName: "Acme Services",
      workspaceSlug: "acme-services",
    });
    expect(resolveEffectivePlanFromSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        status: "active",
      }),
    );
  });

  it("falls back to the workspace plan when no subscription row exists", async () => {
    const overview = await getWorkspaceBillingOverview("workspace_123");

    expect(overview).toMatchObject({
      currentPlan: "free",
      subscription: null,
      workspaceId: "workspace_123",
    });
    expect(resolveEffectivePlanFromSubscriptionMock).not.toHaveBeenCalled();
  });
});
