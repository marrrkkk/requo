import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

import {
  getWorkspaceAuditLogExportRowsBySlug,
  getWorkspaceAuditLogFiltersBySlug,
  getWorkspaceAuditLogPageBySlug,
} from "@/features/audit/queries";
import {
  auditLogs,
  businesses,
  businessMembers,
  user,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "./db";

const ownerId = "test_audit_owner";
const memberId = "test_audit_member";
const outsiderId = "test_audit_outsider";
const workspaceId = "test_audit_workspace";
const workspaceSlug = "test-audit-workspace";
const businessId = "test_audit_business";
const otherBusinessId = "test_audit_business_other";
const auditIds = [
  "test_audit_log_1",
  "test_audit_log_2",
  "test_audit_log_3",
  "test_audit_log_4",
] as const;

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function cleanupAuditFixtures() {
  await testDb.delete(auditLogs).where(inArray(auditLogs.id, [...auditIds]));
  await testDb
    .delete(businessMembers)
    .where(inArray(businessMembers.businessId, [businessId, otherBusinessId]));
  await testDb
    .delete(businesses)
    .where(inArray(businesses.id, [businessId, otherBusinessId]));
  await testDb
    .delete(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  await testDb.delete(workspaces).where(eq(workspaces.id, workspaceId));
  await testDb
    .delete(user)
    .where(inArray(user.id, [ownerId, memberId, outsiderId]));
}

describe("features/audit/queries", () => {
  beforeAll(async () => {
    await cleanupAuditFixtures();

    const now = new Date();

    await testDb.insert(user).values([
      {
        id: ownerId,
        name: "Audit Owner",
        email: "audit-owner@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: memberId,
        name: "Audit Member",
        email: "audit-member@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: outsiderId,
        name: "Outside User",
        email: "outside@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(workspaces).values({
      id: workspaceId,
      name: "Audit Workspace",
      slug: workspaceSlug,
      plan: "pro",
      ownerUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(workspaceMembers).values([
      {
        id: "test_audit_workspace_owner_member",
        workspaceId,
        userId: ownerId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "test_audit_workspace_member_member",
        workspaceId,
        userId: memberId,
        role: "member",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(businesses).values([
      {
        id: businessId,
        workspaceId,
        name: "Audit Business",
        slug: "audit-business",
        businessType: "general_project_services",
        countryCode: "US",
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherBusinessId,
        workspaceId,
        name: "Second Audit Business",
        slug: "second-audit-business",
        businessType: "general_project_services",
        countryCode: "US",
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(businessMembers).values([
      {
        id: "test_audit_business_owner_member",
        businessId,
        userId: ownerId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "test_audit_business_member_member",
        businessId,
        userId: memberId,
        role: "staff",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(auditLogs).values([
      {
        id: auditIds[0],
        workspaceId,
        businessId,
        actorUserId: ownerId,
        entityType: "request",
        entityId: "inq_test_1",
        action: "request.archived",
        metadata: {
          customerName: "Alice",
          serviceCategory: "Renovation",
        },
        source: "app",
        createdAt: hoursAgo(4),
      },
      {
        id: auditIds[1],
        workspaceId,
        businessId,
        actorUserId: ownerId,
        entityType: "quote",
        entityId: "qt_test_1",
        action: "quote.sent",
        metadata: {
          quoteNumber: "Q-1001",
          title: "Kitchen quote",
        },
        source: "app",
        createdAt: hoursAgo(2),
      },
      {
        id: auditIds[2],
        workspaceId,
        businessId: otherBusinessId,
        actorUserId: memberId,
        entityType: "member",
        entityId: "bm_test_1",
        action: "member.role_changed",
        metadata: {
          targetEmail: "new-member@example.com",
          previousRole: "staff",
          nextRole: "admin",
        },
        source: "system",
        createdAt: hoursAgo(1),
      },
      {
        id: auditIds[3],
        workspaceId,
        businessId: null,
        actorUserId: ownerId,
        entityType: "workspace",
        entityId: workspaceId,
        action: "workspace.deletion_scheduled",
        metadata: {
          workspaceName: "Audit Workspace",
          scheduledDeletionAt: hoursAgo(-24).toISOString(),
        },
        source: "app",
        createdAt: hoursAgo(3),
      },
    ]);
  });

  afterAll(async () => {
    await cleanupAuditFixtures();
    await closeTestDb();
  });

  it("returns owner-only workspace audit pages with filters applied", async () => {
    const page = await getWorkspaceAuditLogPageBySlug(ownerId, workspaceSlug, {
      actor: ownerId,
      business: businessId,
      action: "quote.sent",
      entity: "quote",
      from: null,
      to: null,
      page: 1,
    });

    expect(page).not.toBeNull();
    expect(page?.totalCount).toBe(1);
    expect(page?.items).toHaveLength(1);
    expect(page?.items[0]).toMatchObject({
      action: "quote.sent",
      actorName: "Audit Owner",
      businessName: "Audit Business",
      entityType: "quote",
    });
  });

  it("returns owner filter options and blocks non-owner access", async () => {
    const ownerFilters = await getWorkspaceAuditLogFiltersBySlug(
      ownerId,
      workspaceSlug,
    );

    expect(ownerFilters).not.toBeNull();
    expect(ownerFilters?.actors.map((option) => option.label)).toEqual([
      "Audit Member",
      "Audit Owner",
    ]);
    expect(ownerFilters?.businesses.map((option) => option.label)).toEqual([
      "Audit Business",
      "Second Audit Business",
    ]);

    const memberPage = await getWorkspaceAuditLogPageBySlug(memberId, workspaceSlug, {
      actor: null,
      business: null,
      action: null,
      entity: null,
      from: null,
      to: null,
      page: 1,
    });
    const memberFilters = await getWorkspaceAuditLogFiltersBySlug(
      memberId,
      workspaceSlug,
    );
    const outsiderPage = await getWorkspaceAuditLogPageBySlug(
      outsiderId,
      workspaceSlug,
      {
        actor: null,
        business: null,
        action: null,
        entity: null,
        from: null,
        to: null,
        page: 1,
      },
    );

    expect(memberPage).toBeNull();
    expect(memberFilters).toBeNull();
    expect(outsiderPage).toBeNull();
  });

  it("returns owner-only audit export rows for all matching logs", async () => {
    const rows = await getWorkspaceAuditLogExportRowsBySlug(
      ownerId,
      workspaceSlug,
      {
        actor: null,
        business: null,
        action: null,
        entity: null,
        from: null,
        to: null,
        page: 1,
      },
    );
    const quoteRows = await getWorkspaceAuditLogExportRowsBySlug(
      ownerId,
      workspaceSlug,
      {
        actor: null,
        business: null,
        action: null,
        entity: "quote",
        from: null,
        to: null,
        page: 1,
      },
    );
    const memberRows = await getWorkspaceAuditLogExportRowsBySlug(
      memberId,
      workspaceSlug,
      {
        actor: null,
        business: null,
        action: null,
        entity: null,
        from: null,
        to: null,
        page: 1,
      },
    );

    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(4);
    expect(rows?.map((row) => row.createdAt.getTime())).toEqual(
      [...(rows ?? [])]
        .map((row) => row.createdAt.getTime())
        .sort((left, right) => right - left),
    );
    expect(quoteRows).toHaveLength(1);
    expect(quoteRows?.[0]).toMatchObject({
      action: "quote.sent",
      entityType: "quote",
    });
    expect(memberRows).toBeNull();
  });
});
