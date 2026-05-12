import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import {
  getBusinessAuditLogExportRowsBySlug,
  getBusinessAuditLogFiltersBySlug,
  getBusinessAuditLogPageBySlug,
} from "@/features/audit/queries";
import {
  auditLogs,
  businesses,
  businessMembers,
  user,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const ownerId = "test_audit_owner";
const memberId = "test_audit_member";
const outsiderId = "test_audit_outsider";
const businessId = "test_audit_business";
const businessSlug = "audit-business";
;
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
    .delete(businessMembers)
    .where(eq(businessMembers.businessId, businessId));
  await testDb.delete(businesses).where(eq(businesses.id, businessId));
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

    await testDb.insert(businesses).values([
      {
        id: businessId,
        ownerUserId: ownerId,
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
        ownerUserId: ownerId,
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
        businessId,
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
        businessId,
        actorUserId: ownerId,
        entityType: "business",
        entityId: businessId,
        action: "business.deletion_scheduled",
        metadata: {
          businessName: "Audit Workspace",
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

  it("returns owner-only business audit pages with filters applied", async () => {
    const page = await getBusinessAuditLogPageBySlug(ownerId, businessSlug, {
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
    const ownerFilters = await getBusinessAuditLogFiltersBySlug(
      ownerId,
      businessSlug,
    );

    expect(ownerFilters).not.toBeNull();
    expect(ownerFilters?.actors.map((option) => option.label)).toEqual([
      "Audit Member",
      "Audit Owner",
    ]);
    expect(ownerFilters?.businesses.map((option) => option.label)).toEqual([]);

    const memberPage = await getBusinessAuditLogPageBySlug(memberId, businessSlug, {
      actor: null,
      business: null,
      action: null,
      entity: null,
      from: null,
      to: null,
      page: 1,
    });
    const memberFilters = await getBusinessAuditLogFiltersBySlug(
      memberId,
      businessSlug,
    );
    const outsiderPage = await getBusinessAuditLogPageBySlug(
      outsiderId,
      businessSlug,
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
    const rows = await getBusinessAuditLogExportRowsBySlug(
      ownerId,
      businessSlug,
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
    const quoteRows = await getBusinessAuditLogExportRowsBySlug(
      ownerId,
      businessSlug,
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
    const memberRows = await getBusinessAuditLogExportRowsBySlug(
      memberId,
      businessSlug,
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
