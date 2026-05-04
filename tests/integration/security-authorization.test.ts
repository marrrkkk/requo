import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";


import { createInquiryFormPreset } from "@/features/inquiries/inquiry-forms";
import { getWorkspaceOverviewBySlug } from "@/features/workspaces/queries";
import {
  businesses,
  businessInquiryForms,
  businessMembers,
  inquiries,
  quotes,
  user,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "./db";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

const ownerUserId = "test_security_owner";
const strangerUserId = "test_security_stranger";
const workspaceId = "test_security_workspace";
const otherWorkspaceId = "test_security_workspace_other";
const businessId = "test_security_business";
const otherBusinessId = "test_security_business_other";
const inquiryFormId = "test_security_form";
const otherInquiryFormId = "test_security_form_other";
const inquiryId = "test_security_inquiry";
const otherInquiryId = "test_security_inquiry_other";
const quoteId = "test_security_quote";
const firstInquiryFormPreset = createInquiryFormPreset({
  businessType: "general_project_services",
  businessName: "Security Business",
});
const secondInquiryFormPreset = createInquiryFormPreset({
  businessType: "general_project_services",
  businessName: "Security Business Other",
});

describe("security authorization boundaries", () => {
  beforeAll(async () => {
    const userIds = [ownerUserId, strangerUserId];
    const workspaceIds = [workspaceId, otherWorkspaceId];
    const businessIds = [businessId, otherBusinessId];

    await testDb.delete(quotes).where(eq(quotes.id, quoteId));
    await testDb
      .delete(inquiries)
      .where(inArray(inquiries.id, [inquiryId, otherInquiryId]));
    await testDb
      .delete(businessInquiryForms)
      .where(
        inArray(businessInquiryForms.id, [inquiryFormId, otherInquiryFormId]),
      );
    await testDb
      .delete(businessMembers)
      .where(inArray(businessMembers.businessId, businessIds));
    await testDb.delete(businesses).where(inArray(businesses.id, businessIds));
    await testDb
      .delete(workspaceMembers)
      .where(inArray(workspaceMembers.userId, userIds));
    await testDb.delete(workspaces).where(inArray(workspaces.id, workspaceIds));
    await testDb.delete(user).where(inArray(user.id, userIds));

    const now = new Date();

    await testDb.insert(user).values([
      {
        id: ownerUserId,
        name: "Security Owner",
        email: "security-owner@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: strangerUserId,
        name: "Security Stranger",
        email: "security-stranger@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(workspaces).values([
      {
        id: workspaceId,
        name: "Security Workspace",
        slug: "security-workspace",
        plan: "free",
        ownerUserId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherWorkspaceId,
        name: "Security Workspace Other",
        slug: "security-workspace-other",
        plan: "free",
        ownerUserId: strangerUserId,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(workspaceMembers).values([
      {
        id: "test_security_workspace_member_owner",
        workspaceId,
        userId: ownerUserId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "test_security_workspace_member_stranger",
        workspaceId: otherWorkspaceId,
        userId: strangerUserId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(businesses).values([
      {
        id: businessId,
        workspaceId,
        name: "Security Business",
        slug: "security-business",
        businessType: "general_project_services",
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherBusinessId,
        workspaceId: otherWorkspaceId,
        name: "Security Business Other",
        slug: "security-business-other",
        businessType: "general_project_services",
        defaultCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(businessMembers).values([
      {
        id: "test_security_business_member_owner",
        businessId,
        userId: ownerUserId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "test_security_business_member_stranger",
        businessId: otherBusinessId,
        userId: strangerUserId,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const firstBusinessInquiryForm = {
      id: inquiryFormId,
      businessId,
      name: "Security Form",
      slug: "security-form",
      businessType: firstInquiryFormPreset.businessType,
      isDefault: true,
      publicInquiryEnabled: true,
      inquiryFormConfig: firstInquiryFormPreset.inquiryFormConfig,
      inquiryPageConfig: firstInquiryFormPreset.inquiryPageConfig,
      createdAt: now,
      updatedAt: now,
    } satisfies typeof businessInquiryForms.$inferInsert;

    await testDb.insert(businessInquiryForms).values(firstBusinessInquiryForm);

    const secondBusinessInquiryForm = {
      id: otherInquiryFormId,
      businessId: otherBusinessId,
      name: "Security Form Other",
      slug: "security-form-other",
      businessType: secondInquiryFormPreset.businessType,
      isDefault: true,
      publicInquiryEnabled: true,
      inquiryFormConfig: secondInquiryFormPreset.inquiryFormConfig,
      inquiryPageConfig: secondInquiryFormPreset.inquiryPageConfig,
      createdAt: now,
      updatedAt: now,
    } satisfies typeof businessInquiryForms.$inferInsert;

    await testDb.insert(businessInquiryForms).values(secondBusinessInquiryForm);

    await testDb.insert(inquiries).values([
      {
        id: inquiryId,
        businessId,
        businessInquiryFormId: inquiryFormId,
        status: "new",
        subject: "Authorized Inquiry",
        customerName: "Customer One",
        customerEmail: "customer-one@example.com",
        serviceCategory: "Printing",
        details: "Need a quote.",
        submittedFieldSnapshot: {
          businessType: "general_project_services",
          fields: [],
          version: 1,
        },
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherInquiryId,
        businessId: otherBusinessId,
        businessInquiryFormId: otherInquiryFormId,
        status: "new",
        subject: "Other Inquiry",
        customerName: "Customer Two",
        customerEmail: "customer-two@example.com",
        serviceCategory: "Printing",
        details: "Need another quote.",
        submittedFieldSnapshot: {
          businessType: "general_project_services",
          fields: [],
          version: 1,
        },
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await testDb.insert(quotes).values({
      id: quoteId,
      businessId,
      inquiryId,
      status: "draft",
      quoteNumber: "Q-9001",
      publicToken: "legacy-public-token",
      title: "Security Quote",
      customerName: "Customer One",
      customerEmail: "customer-one@example.com",
      currency: "USD",
      subtotalInCents: 10000,
      discountInCents: 0,
      totalInCents: 10000,
      validUntil: "2099-12-31",
      createdAt: now,
      updatedAt: now,
    });
  });

  afterAll(async () => {
    await testDb.delete(quotes).where(eq(quotes.id, quoteId));
    await testDb
      .delete(inquiries)
      .where(inArray(inquiries.id, [inquiryId, otherInquiryId]));
    await testDb
      .delete(businessInquiryForms)
      .where(
        inArray(businessInquiryForms.id, [inquiryFormId, otherInquiryFormId]),
      );
    await testDb
      .delete(businessMembers)
      .where(inArray(businessMembers.businessId, [businessId, otherBusinessId]));
    await testDb
      .delete(businesses)
      .where(inArray(businesses.id, [businessId, otherBusinessId]));
    await testDb
      .delete(workspaceMembers)
      .where(inArray(workspaceMembers.userId, [ownerUserId, strangerUserId]));
    await testDb
      .delete(workspaces)
      .where(inArray(workspaces.id, [workspaceId, otherWorkspaceId]));
    await testDb
      .delete(user)
      .where(inArray(user.id, [ownerUserId, strangerUserId]));
    await closeTestDb();
  });

  it("scopes workspace overview reads to workspace membership", async () => {
    const ownerView = await getWorkspaceOverviewBySlug(
      ownerUserId,
      "security-workspace",
    );
    const strangerView = await getWorkspaceOverviewBySlug(
      strangerUserId,
      "security-workspace",
    );

    expect(ownerView?.id).toBe(workspaceId);
    expect(ownerView?.businesses).toHaveLength(1);
    expect(strangerView).toBeNull();
  });


});
