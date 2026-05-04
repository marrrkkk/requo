import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

const { getOptionalSessionMock, headersMock, revalidatePathMock } = vi.hoisted(
  () => ({
    getOptionalSessionMock: vi.fn(),
    headersMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }),
);

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

vi.mock("@/lib/auth/session", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

vi.mock("@/lib/env", async () => {
  const actual = await vi.importActual<typeof import("@/lib/env")>("@/lib/env");

  return {
    ...actual,
    env: {
      ...actual.env,
      ADMIN_EMAILS: "admin-actions-admin@example.com",
    },
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import {
  cancelAdminWorkspaceDeletionAction,
  completeAdminWorkspaceDeletionAction,
} from "@/features/admin/actions";
import { adminAuditLogs, auditLogs, user, workspaces } from "@/lib/db/schema";

import { closeTestDb, testDb } from "./db";

const adminUserId = "test_admin_actions_admin";
const normalUserId = "test_admin_actions_normal";
const ownerUserId = "test_admin_actions_owner";
const cancelWorkspaceId = "test_admin_actions_cancel_ws";
const completeWorkspaceId = "test_admin_actions_complete_ws";

const adminSession = {
  user: {
    id: adminUserId,
    email: "admin-actions-admin@example.com",
    name: "Admin User",
  },
};

const normalSession = {
  user: {
    id: normalUserId,
    email: "admin-actions-normal@example.com",
    name: "Normal User",
  },
};

function formData(values: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}

async function cleanupFixtures() {
  await testDb
    .delete(adminAuditLogs)
    .where(
      inArray(adminAuditLogs.targetId, [
        cancelWorkspaceId,
        completeWorkspaceId,
      ]),
    );
  await testDb
    .delete(auditLogs)
    .where(
      inArray(auditLogs.workspaceId, [
        cancelWorkspaceId,
        completeWorkspaceId,
      ]),
    );
  await testDb
    .delete(workspaces)
    .where(inArray(workspaces.id, [cancelWorkspaceId, completeWorkspaceId]));
  await testDb
    .delete(user)
    .where(inArray(user.id, [adminUserId, normalUserId, ownerUserId]));
}

async function seedFixtures() {
  await cleanupFixtures();

  const now = new Date();

  await testDb.insert(user).values([
    {
      id: adminUserId,
      name: "Admin User",
      email: "admin-actions-admin@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: normalUserId,
      name: "Normal User",
      email: "admin-actions-normal@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ownerUserId,
      name: "Owner User",
      email: "admin-actions-owner@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await testDb.insert(workspaces).values([
    {
      id: cancelWorkspaceId,
      name: "Admin Cancel Workspace",
      slug: "admin-cancel-workspace",
      plan: "free",
      ownerUserId,
      scheduledDeletionAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      scheduledDeletionBy: ownerUserId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: completeWorkspaceId,
      name: "Admin Complete Workspace",
      slug: "admin-complete-workspace",
      plan: "free",
      ownerUserId,
      scheduledDeletionAt: new Date(now.getTime() - 60 * 60 * 1000),
      scheduledDeletionBy: ownerUserId,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

describe("admin server actions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(
      new Headers({
        "x-forwarded-for": "203.0.113.5",
        "user-agent": "vitest-admin-actions",
      }),
    );
    await seedFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures();
    await closeTestDb();
  });

  it("rejects direct admin action calls from non-admin users", async () => {
    getOptionalSessionMock.mockResolvedValue(normalSession);

    await expect(
      cancelAdminWorkspaceDeletionAction(
        {},
        formData({
          workspaceId: cancelWorkspaceId,
          reason: "Attempted direct non-admin call",
        }),
      ),
    ).rejects.toThrow("Not found.");

    const [workspace] = await testDb
      .select({ scheduledDeletionAt: workspaces.scheduledDeletionAt })
      .from(workspaces)
      .where(eq(workspaces.id, cancelWorkspaceId))
      .limit(1);
    const adminLogs = await testDb
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.targetId, cancelWorkspaceId));

    expect(workspace?.scheduledDeletionAt).toBeInstanceOf(Date);
    expect(adminLogs).toHaveLength(0);
  });

  it("allows admins to cancel deletion requests and writes audit logs", async () => {
    getOptionalSessionMock.mockResolvedValue(adminSession);

    const result = await cancelAdminWorkspaceDeletionAction(
      {},
      formData({
        workspaceId: cancelWorkspaceId,
        reason: "Owner asked support to stop deletion",
      }),
    );

    expect(result).toEqual({ success: "Deletion request canceled." });

    const [workspace] = await testDb
      .select({ scheduledDeletionAt: workspaces.scheduledDeletionAt })
      .from(workspaces)
      .where(eq(workspaces.id, cancelWorkspaceId))
      .limit(1);
    const adminLogs = await testDb
      .select()
      .from(adminAuditLogs)
      .where(
        and(
          eq(adminAuditLogs.targetId, cancelWorkspaceId),
          eq(adminAuditLogs.action, "ADMIN_CANCEL_DELETION_REQUEST"),
        ),
      );
    const workspaceLogs = await testDb
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.workspaceId, cancelWorkspaceId),
          eq(auditLogs.action, "workspace.deletion_canceled"),
        ),
      );

    expect(workspace?.scheduledDeletionAt).toBeNull();
    expect(adminLogs).toHaveLength(1);
    expect(adminLogs[0]?.adminEmail).toBe(adminSession.user.email);
    expect(adminLogs[0]?.ipAddress).toBe("203.0.113.5");
    expect(workspaceLogs).toHaveLength(1);
    expect(workspaceLogs[0]?.actorUserId).toBe(adminUserId);
  });

  it("allows admins to complete due deletion requests and writes audit logs", async () => {
    getOptionalSessionMock.mockResolvedValue(adminSession);

    const result = await completeAdminWorkspaceDeletionAction(
      {},
      formData({
        workspaceId: completeWorkspaceId,
        confirmation: "Admin Complete Workspace",
        reason: "Scheduled deletion is due and billing is clear",
      }),
    );

    expect(result).toEqual({
      success: "Workspace deletion marked completed.",
    });

    const [workspace] = await testDb
      .select({
        deletedAt: workspaces.deletedAt,
        deletedBy: workspaces.deletedBy,
        scheduledDeletionAt: workspaces.scheduledDeletionAt,
      })
      .from(workspaces)
      .where(eq(workspaces.id, completeWorkspaceId))
      .limit(1);
    const adminLogs = await testDb
      .select()
      .from(adminAuditLogs)
      .where(
        and(
          eq(adminAuditLogs.targetId, completeWorkspaceId),
          eq(adminAuditLogs.action, "ADMIN_MARK_DELETION_COMPLETED"),
        ),
      );
    const workspaceLogs = await testDb
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.workspaceId, completeWorkspaceId),
          eq(auditLogs.action, "workspace.deleted"),
        ),
      );

    expect(workspace?.scheduledDeletionAt).toBeNull();
    expect(workspace?.deletedAt).toBeInstanceOf(Date);
    expect(workspace?.deletedBy).toBe(adminUserId);
    expect(adminLogs).toHaveLength(1);
    expect(workspaceLogs).toHaveLength(1);
  });
});
