import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, desc, eq, like } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");
  return { db: mockedDb };
});

const { requireAdminUserMock, revalidateTagMock, headersMock } = vi.hoisted(() => ({
  requireAdminUserMock: vi.fn(),
  revalidateTagMock: vi.fn(),
  headersMock: vi.fn(async () => new Headers()),
}));

vi.mock("@/features/admin/access", () => ({
  requireAdminUser: requireAdminUserMock,
}));

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import {
  cancelBusinessSubscriptionAction,
  overrideBusinessPlanAction,
} from "@/features/admin/mutations";
import {
  adminAuditLogs,
  businesses,
  businessSubscriptions,
  user,
  verification,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_admin_biz_sub";
const adminId = `${prefix}_admin`;
const ownerId = `${prefix}_owner`;
const businessId = `${prefix}_biz`;
const businessSlug = "test-admin-biz-sub";

const adminContext = {
  session: {
    session: { id: `${prefix}_session`, userId: adminId },
    user: { id: adminId },
  },
  user: {
    id: adminId,
    email: "admin@example.com",
    name: "Admin",
    role: "admin",
  },
};

function sha256Token(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

async function insertConfirmToken(adminUserId: string, target: string) {
  const token = `valid-confirm-token-${Date.now()}-${Math.random()}`;
  await testDb.insert(verification).values({
    id: `${adminUserId}-${target}-token-${Date.now()}`,
    identifier: `admin:confirm:${adminUserId}:${target}`,
    value: sha256Token(token),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return token;
}

async function getBusinessBillingState(businessIdValue: string) {
  const [biz] = await testDb
    .select({ plan: businesses.plan })
    .from(businesses)
    .where(eq(businesses.id, businessIdValue))
    .limit(1);
  const [sub] = await testDb
    .select({
      plan: businessSubscriptions.plan,
      status: businessSubscriptions.status,
    })
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.businessId, businessIdValue))
    .limit(1);
  return { plan: biz?.plan ?? null, subscription: sub ?? null };
}

async function findLatestSubscriptionAudit(action: string, target: string) {
  const [audit] = await testDb
    .select()
    .from(adminAuditLogs)
    .where(
      and(
        eq(adminAuditLogs.action, action),
        eq(adminAuditLogs.targetId, target),
      ),
    )
    .orderBy(desc(adminAuditLogs.id))
    .limit(1);
  return audit;
}

async function cleanup() {
  await testDb
    .delete(adminAuditLogs)
    .where(eq(adminAuditLogs.adminUserId, adminId));
  await testDb
    .delete(verification)
    .where(like(verification.id, `${prefix}%`));
  await testDb
    .delete(businessSubscriptions)
    .where(eq(businessSubscriptions.businessId, businessId));
  await testDb.delete(businesses).where(eq(businesses.id, businessId));
  await testDb.delete(user).where(eq(user.id, adminId));
  await testDb.delete(user).where(eq(user.id, ownerId));
}

describe("features/admin/mutations business subscription", () => {
  beforeAll(async () => {
    await cleanup();
    const now = new Date();
    await testDb.insert(user).values([
      {
        id: adminId,
        name: "Admin User",
        email: `${prefix}.admin@example.com`,
        emailVerified: true,
        role: "admin",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ownerId,
        name: "Owner User",
        email: `${prefix}.owner@example.com`,
        emailVerified: true,
        role: "user",
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await testDb.insert(businesses).values({
      id: businessId,
      ownerUserId: ownerId,
      name: "Subscription Test Business",
      slug: businessSlug,
    });
  }, 30_000);

  afterAll(async () => {
    await cleanup();
    await closeTestDb();
  }, 30_000);

  beforeEach(async () => {
    vi.clearAllMocks();
    requireAdminUserMock.mockResolvedValue(adminContext);
    await testDb
      .delete(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, businessId));
    await testDb
      .update(businesses)
      .set({ plan: "free" })
      .where(eq(businesses.id, businessId));
  });

  it("overrides a free business to a paid plan and syncs the cache", async () => {
    const token = await insertConfirmToken(adminId, businessId);

    const result = await overrideBusinessPlanAction({
      businessId,
      plan: "pro",
      reason: "Support comp",
      confirmToken: token,
    });

    expect(result.ok).toBe(true);
    const state = await getBusinessBillingState(businessId);
    expect(state.plan).toBe("pro");
    expect(state.subscription).toMatchObject({ plan: "pro", status: "active" });

    const audit = await findLatestSubscriptionAudit(
      "subscription.manual_plan_override",
      businessId,
    );
    expect(audit).toMatchObject({
      adminUserId: adminId,
      targetType: "business",
    });
    expect(audit?.metadata).toMatchObject({
      targetBusinessId: businessId,
      previousPlan: null,
      nextPlan: "pro",
      reason: "Support comp",
    });
  });

  it("moves a paid business between paid plans", async () => {
    const firstToken = await insertConfirmToken(adminId, businessId);
    await overrideBusinessPlanAction({
      businessId,
      plan: "pro",
      confirmToken: firstToken,
    });

    const token = await insertConfirmToken(adminId, businessId);
    const result = await overrideBusinessPlanAction({
      businessId,
      plan: "business",
      confirmToken: token,
    });

    expect(result.ok).toBe(true);
    const state = await getBusinessBillingState(businessId);
    expect(state.plan).toBe("business");
    expect(state.subscription).toMatchObject({
      plan: "business",
      status: "active",
    });
  });

  it("cancels an active subscription and writes an audit row", async () => {
    const setupToken = await insertConfirmToken(adminId, businessId);
    await overrideBusinessPlanAction({
      businessId,
      plan: "pro",
      confirmToken: setupToken,
    });

    const token = await insertConfirmToken(adminId, businessId);
    const result = await cancelBusinessSubscriptionAction({
      businessId,
      reason: "Customer request",
      confirmToken: token,
    });

    expect(result.ok).toBe(true);
    const state = await getBusinessBillingState(businessId);
    expect(state.subscription).toMatchObject({ status: "canceled" });

    const [audit] = await testDb
      .select()
      .from(adminAuditLogs)
      .where(
        and(
          eq(adminAuditLogs.action, "subscription.force_cancel"),
          eq(adminAuditLogs.targetType, "business"),
        ),
      )
      .orderBy(desc(adminAuditLogs.id))
      .limit(1);
    expect(audit).toMatchObject({
      adminUserId: adminId,
      targetId: expect.any(String),
    });
    expect(audit?.metadata).toMatchObject({
      targetBusinessId: businessId,
      reason: "Customer request",
    });
  });

  it("rejects canceling a business with no subscription", async () => {
    const token = await insertConfirmToken(adminId, businessId);

    const result = await cancelBusinessSubscriptionAction({
      businessId,
      confirmToken: token,
    });

    expect(result).toEqual({
      ok: false,
      error: "That business has no subscription to cancel.",
    });
  });

  it("rejects canceling an already-canceled subscription", async () => {
    const setupToken = await insertConfirmToken(adminId, businessId);
    await overrideBusinessPlanAction({
      businessId,
      plan: "pro",
      confirmToken: setupToken,
    });
    const cancelToken = await insertConfirmToken(adminId, businessId);
    await cancelBusinessSubscriptionAction({
      businessId,
      confirmToken: cancelToken,
    });

    const token = await insertConfirmToken(adminId, businessId);
    const result = await cancelBusinessSubscriptionAction({
      businessId,
      confirmToken: token,
    });

    expect(result).toEqual({
      ok: false,
      error: "That subscription is already canceled.",
    });
  });

  it("rejects subscription actions for a missing business", async () => {
    const token = await insertConfirmToken(adminId, "missing-biz");

    const result = await overrideBusinessPlanAction({
      businessId: "missing-biz",
      plan: "pro",
      confirmToken: token,
    });

    expect(result).toEqual({
      ok: false,
      error: "That business no longer exists.",
    });
  });

  it("rejects subscription actions with a bad confirm token", async () => {
    const result = await overrideBusinessPlanAction({
      businessId,
      plan: "pro",
      confirmToken: "bogus-token-that-is-long-enough",
    });

    expect(result).toEqual({
      ok: false,
      error: "Confirm your password to continue.",
    });
    expect(await getBusinessBillingState(businessId)).toMatchObject({
      plan: "free",
      subscription: null,
    });
  });
});
