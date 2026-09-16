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
  archiveBusinessAction,
  deleteBusinessAction,
  restoreBusinessAction,
} from "@/features/admin/mutations";
import { adminAuditLogs, businesses, user, verification } from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const prefix = "test_admin_biz_lifecycle";
const adminId = `${prefix}_admin`;
const ownerId = `${prefix}_owner`;
const businessId = `${prefix}_biz`;
const businessSlug = "test-admin-biz-lifecycle";

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

async function getBusinessState(businessIdValue: string) {
  const [row] = await testDb
    .select({
      archivedAt: businesses.archivedAt,
      deletedAt: businesses.deletedAt,
    })
    .from(businesses)
    .where(eq(businesses.id, businessIdValue))
    .limit(1);
  return row ?? null;
}

async function findLatestBusinessAudit(action: string, target: string) {
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

async function resetBusinessToActive() {
  await testDb
    .update(businesses)
    .set({ archivedAt: null, archivedBy: null, deletedAt: null, deletedBy: null })
    .where(eq(businesses.id, businessId));
}

async function cleanup() {
  await testDb
    .delete(adminAuditLogs)
    .where(eq(adminAuditLogs.adminUserId, adminId));
  await testDb
    .delete(verification)
    .where(like(verification.id, `${prefix}%`));
  await testDb.delete(businesses).where(eq(businesses.id, businessId));
  await testDb.delete(user).where(eq(user.id, adminId));
  await testDb.delete(user).where(eq(user.id, ownerId));
}

describe("features/admin/mutations business lifecycle", () => {
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
      name: "Lifecycle Test Business",
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
    await resetBusinessToActive();
  });

  it("archives an active business and writes an audit row", async () => {
    const token = await insertConfirmToken(adminId, businessId);

    const result = await archiveBusinessAction({
      businessId,
      confirmToken: token,
    });

    expect(result.ok).toBe(true);
    const state = await getBusinessState(businessId);
    expect(state?.archivedAt).toBeInstanceOf(Date);
    expect(state?.deletedAt).toBeNull();

    const audit = await findLatestBusinessAudit("business.archive", businessId);
    expect(audit).toMatchObject({
      adminUserId: adminId,
      targetType: "business",
      targetId: businessId,
    });
    expect(audit?.metadata).toMatchObject({
      businessName: "Lifecycle Test Business",
      businessSlug,
    });
  });

  it("rejects archiving an already-archived business", async () => {
    await testDb
      .update(businesses)
      .set({ archivedAt: new Date() })
      .where(eq(businesses.id, businessId));
    const token = await insertConfirmToken(adminId, businessId);

    const result = await archiveBusinessAction({
      businessId,
      confirmToken: token,
    });

    expect(result).toEqual({ ok: false, error: "That business is already archived." });
  });

  it("rejects archiving a deleted business", async () => {
    await testDb
      .update(businesses)
      .set({ deletedAt: new Date() })
      .where(eq(businesses.id, businessId));
    const token = await insertConfirmToken(adminId, businessId);

    const result = await archiveBusinessAction({
      businessId,
      confirmToken: token,
    });

    expect(result.ok).toBe(false);
  });

  it("restores an archived business to active", async () => {
    await testDb
      .update(businesses)
      .set({ archivedAt: new Date() })
      .where(eq(businesses.id, businessId));
    const token = await insertConfirmToken(adminId, businessId);

    const result = await restoreBusinessAction({
      businessId,
      confirmToken: token,
    });

    expect(result.ok).toBe(true);
    const state = await getBusinessState(businessId);
    expect(state?.archivedAt).toBeNull();
    expect(state?.deletedAt).toBeNull();

    const audit = await findLatestBusinessAudit("business.restore", businessId);
    expect(audit?.metadata).toMatchObject({ from: "archived" });
  });

  it("soft-deletes an active business and writes an audit row", async () => {
    const token = await insertConfirmToken(adminId, businessId);

    const result = await deleteBusinessAction({
      businessId,
      confirmToken: token,
    });

    expect(result.ok).toBe(true);
    const state = await getBusinessState(businessId);
    expect(state?.deletedAt).toBeInstanceOf(Date);
    expect(state?.archivedAt).toBeNull();

    const audit = await findLatestBusinessAudit("business.delete", businessId);
    expect(audit).toMatchObject({
      adminUserId: adminId,
      targetType: "business",
      targetId: businessId,
    });
  });

  it("rejects deleting an already-deleted business", async () => {
    await testDb
      .update(businesses)
      .set({ deletedAt: new Date() })
      .where(eq(businesses.id, businessId));
    const token = await insertConfirmToken(adminId, businessId);

    const result = await deleteBusinessAction({
      businessId,
      confirmToken: token,
    });

    expect(result).toEqual({ ok: false, error: "That business is already deleted." });
  });

  it("restores a deleted business to active", async () => {
    await testDb
      .update(businesses)
      .set({ deletedAt: new Date() })
      .where(eq(businesses.id, businessId));
    const token = await insertConfirmToken(adminId, businessId);

    const result = await restoreBusinessAction({
      businessId,
      confirmToken: token,
    });

    expect(result.ok).toBe(true);
    expect(await getBusinessState(businessId)).toMatchObject({
      archivedAt: null,
      deletedAt: null,
    });
  });

  it("rejects restoring an already-active business", async () => {
    const token = await insertConfirmToken(adminId, businessId);

    const result = await restoreBusinessAction({
      businessId,
      confirmToken: token,
    });

    expect(result).toEqual({ ok: false, error: "That business is already active." });
  });

  it("rejects lifecycle actions with a bad confirm token", async () => {
    const result = await archiveBusinessAction({
      businessId,
      confirmToken: "bogus-token-that-is-long-enough",
    });

    expect(result).toEqual({
      ok: false,
      error: "Confirm your password to continue.",
    });
    expect(await getBusinessState(businessId)).toMatchObject({
      archivedAt: null,
      deletedAt: null,
    });
  });

  it("rejects lifecycle actions for a missing business", async () => {
    const token = await insertConfirmToken(adminId, "missing-biz");

    const result = await deleteBusinessAction({
      businessId: "missing-biz",
      confirmToken: token,
    });

    expect(result).toEqual({
      ok: false,
      error: "That business no longer exists.",
    });
  });
});
