import { eq, inArray } from "drizzle-orm";

import { createInquiryFormPreset } from "@/features/inquiries/inquiry-forms";
import {
  activityLogs,
  analyticsEvents,
  auditLogs,
  businessInquiryForms,
  businessMembers,
  businessNotificationStates,
  businessNotifications,
  businesses,
  followUps,
  inquiries,
  quoteItems,
  quotes,
  user,
  userRecentBusinesses,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

import { testDb } from "./db";

export type WorkflowFixtureIds = {
  ownerUserId: string;
  managerUserId: string;
  staffUserId: string;
  outsiderUserId: string;
  workspaceId: string;
  otherWorkspaceId: string;
  businessId: string;
  otherBusinessId: string;
  archivedBusinessId: string;
  formId: string;
  otherFormId: string;
  archivedFormId: string;
  inquiryId: string;
  waitingInquiryId: string;
  otherInquiryId: string;
  businessSlug: string;
  otherBusinessSlug: string;
  archivedBusinessSlug: string;
  workspaceSlug: string;
};

function slugFromPrefix(prefix: string) {
  return prefix.replace(/_/g, "-");
}

export function getWorkflowFixtureIds(prefix: string): WorkflowFixtureIds {
  const slugPrefix = slugFromPrefix(prefix);

  return {
    ownerUserId: `${prefix}_owner`,
    managerUserId: `${prefix}_manager`,
    staffUserId: `${prefix}_staff`,
    outsiderUserId: `${prefix}_outsider`,
    workspaceId: `${prefix}_workspace`,
    otherWorkspaceId: `${prefix}_workspace_other`,
    businessId: `${prefix}_business`,
    otherBusinessId: `${prefix}_business_other`,
    archivedBusinessId: `${prefix}_business_archived`,
    formId: `${prefix}_form`,
    otherFormId: `${prefix}_form_other`,
    archivedFormId: `${prefix}_form_archived`,
    inquiryId: `${prefix}_inquiry`,
    waitingInquiryId: `${prefix}_inquiry_waiting`,
    otherInquiryId: `${prefix}_inquiry_other`,
    businessSlug: `${slugPrefix}-business`,
    otherBusinessSlug: `${slugPrefix}-other-business`,
    archivedBusinessSlug: `${slugPrefix}-archived-business`,
    workspaceSlug: `${slugPrefix}-workspace`,
  };
}

export async function cleanupWorkflowFixture(prefix: string) {
  const ids = getWorkflowFixtureIds(prefix);
  const userIds = [
    ids.ownerUserId,
    ids.managerUserId,
    ids.staffUserId,
    ids.outsiderUserId,
  ];
  const workspaceIds = [ids.workspaceId, ids.otherWorkspaceId];
  const businessIds = [
    ids.businessId,
    ids.otherBusinessId,
    ids.archivedBusinessId,
  ];

  await testDb
    .delete(analyticsEvents)
    .where(inArray(analyticsEvents.businessId, businessIds));
  await testDb.delete(followUps).where(inArray(followUps.businessId, businessIds));
  await testDb
    .delete(businessNotificationStates)
    .where(inArray(businessNotificationStates.businessId, businessIds));
  await testDb
    .delete(businessNotifications)
    .where(inArray(businessNotifications.businessId, businessIds));
  await testDb
    .delete(activityLogs)
    .where(inArray(activityLogs.businessId, businessIds));
  await testDb
    .delete(userRecentBusinesses)
    .where(inArray(userRecentBusinesses.businessId, businessIds));
  await testDb
    .delete(auditLogs)
    .where(inArray(auditLogs.workspaceId, workspaceIds));
  await testDb.delete(quoteItems).where(inArray(quoteItems.businessId, businessIds));
  await testDb.delete(quotes).where(inArray(quotes.businessId, businessIds));
  await testDb.delete(inquiries).where(inArray(inquiries.businessId, businessIds));
  await testDb
    .delete(businessInquiryForms)
    .where(inArray(businessInquiryForms.businessId, businessIds));
  await testDb
    .delete(businessMembers)
    .where(inArray(businessMembers.businessId, businessIds));
  await testDb.delete(businesses).where(inArray(businesses.id, businessIds));
  await testDb
    .delete(workspaceMembers)
    .where(inArray(workspaceMembers.workspaceId, workspaceIds));
  await testDb.delete(workspaces).where(inArray(workspaces.id, workspaceIds));
  await testDb.delete(user).where(inArray(user.id, userIds));
}

export async function createWorkflowFixture(prefix: string) {
  const ids = getWorkflowFixtureIds(prefix);
  const now = new Date("2026-04-20T00:00:00.000Z");
  const archivedAt = new Date("2026-04-21T00:00:00.000Z");

  await cleanupWorkflowFixture(prefix);

  await testDb.insert(user).values([
    {
      id: ids.ownerUserId,
      name: "Workflow Owner",
      email: `${prefix}.owner@example.com`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.managerUserId,
      name: "Workflow Manager",
      email: `${prefix}.manager@example.com`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.staffUserId,
      name: "Workflow Staff",
      email: `${prefix}.staff@example.com`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.outsiderUserId,
      name: "Workflow Outsider",
      email: `${prefix}.outsider@example.com`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await testDb.insert(workspaces).values([
    {
      id: ids.workspaceId,
      name: "Workflow Workspace",
      slug: ids.workspaceSlug,
      plan: "pro",
      ownerUserId: ids.ownerUserId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.otherWorkspaceId,
      name: "Other Workflow Workspace",
      slug: `${ids.workspaceSlug}-other`,
      plan: "free",
      ownerUserId: ids.outsiderUserId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await testDb.insert(workspaceMembers).values([
    {
      id: `${prefix}_workspace_member_owner`,
      workspaceId: ids.workspaceId,
      userId: ids.ownerUserId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${prefix}_workspace_member_manager`,
      workspaceId: ids.workspaceId,
      userId: ids.managerUserId,
      role: "member",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${prefix}_workspace_member_staff`,
      workspaceId: ids.workspaceId,
      userId: ids.staffUserId,
      role: "member",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${prefix}_workspace_member_outsider`,
      workspaceId: ids.otherWorkspaceId,
      userId: ids.outsiderUserId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await testDb.insert(businesses).values([
    {
      id: ids.businessId,
      workspaceId: ids.workspaceId,
      name: "Workflow Business",
      slug: ids.businessSlug,
      businessType: "general_project_services",
      defaultCurrency: "USD",
      publicInquiryEnabled: true,
      notifyInAppOnNewInquiry: true,
      notifyInAppOnQuoteResponse: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.otherBusinessId,
      workspaceId: ids.otherWorkspaceId,
      name: "Other Workflow Business",
      slug: ids.otherBusinessSlug,
      businessType: "general_project_services",
      defaultCurrency: "USD",
      publicInquiryEnabled: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.archivedBusinessId,
      workspaceId: ids.workspaceId,
      name: "Archived Workflow Business",
      slug: ids.archivedBusinessSlug,
      businessType: "general_project_services",
      defaultCurrency: "USD",
      publicInquiryEnabled: true,
      archivedAt,
      archivedBy: ids.ownerUserId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await testDb.insert(businessMembers).values([
    {
      id: `${prefix}_business_member_owner`,
      businessId: ids.businessId,
      userId: ids.ownerUserId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${prefix}_business_member_manager`,
      businessId: ids.businessId,
      userId: ids.managerUserId,
      role: "manager",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${prefix}_business_member_staff`,
      businessId: ids.businessId,
      userId: ids.staffUserId,
      role: "staff",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${prefix}_business_member_outsider`,
      businessId: ids.otherBusinessId,
      userId: ids.outsiderUserId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${prefix}_business_member_archived_owner`,
      businessId: ids.archivedBusinessId,
      userId: ids.ownerUserId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const preset = createInquiryFormPreset({
    businessType: "general_project_services",
    businessName: "Workflow Business",
  });
  const otherPreset = createInquiryFormPreset({
    businessType: "general_project_services",
    businessName: "Other Workflow Business",
  });

  await testDb.insert(businessInquiryForms).values([
    {
      id: ids.formId,
      businessId: ids.businessId,
      name: "Workflow Form",
      slug: "workflow-form",
      businessType: preset.businessType,
      isDefault: true,
      publicInquiryEnabled: true,
      inquiryFormConfig: preset.inquiryFormConfig,
      inquiryPageConfig: preset.inquiryPageConfig,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.otherFormId,
      businessId: ids.otherBusinessId,
      name: "Other Workflow Form",
      slug: "workflow-form",
      businessType: otherPreset.businessType,
      isDefault: true,
      publicInquiryEnabled: true,
      inquiryFormConfig: otherPreset.inquiryFormConfig,
      inquiryPageConfig: otherPreset.inquiryPageConfig,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.archivedFormId,
      businessId: ids.archivedBusinessId,
      name: "Archived Workflow Form",
      slug: "workflow-form",
      businessType: preset.businessType,
      isDefault: true,
      publicInquiryEnabled: true,
      inquiryFormConfig: preset.inquiryFormConfig,
      inquiryPageConfig: preset.inquiryPageConfig,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await testDb.insert(inquiries).values([
    {
      id: ids.inquiryId,
      businessId: ids.businessId,
      businessInquiryFormId: ids.formId,
      status: "new",
      subject: "Window graphics",
      customerName: "Taylor Nguyen",
      customerEmail: "taylor@example.com",
      customerContactMethod: "email",
      customerContactHandle: "taylor@example.com",
      serviceCategory: "Window graphics",
      details: "Needs quote for storefront window graphics.",
      submittedFieldSnapshot: {
        version: 1,
        businessType: "general_project_services",
        fields: [],
      },
      source: "public-inquiry-page",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.waitingInquiryId,
      businessId: ids.businessId,
      businessInquiryFormId: ids.formId,
      status: "waiting",
      subject: "Vehicle wrap",
      customerName: "Jordan Lee",
      customerEmail: "jordan@example.com",
      customerContactMethod: "email",
      customerContactHandle: "jordan@example.com",
      serviceCategory: "Vehicle wrap",
      details: "Needs quote for a van wrap.",
      submittedFieldSnapshot: {
        version: 1,
        businessType: "general_project_services",
        fields: [],
      },
      source: "manual-dashboard",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ids.otherInquiryId,
      businessId: ids.otherBusinessId,
      businessInquiryFormId: ids.otherFormId,
      status: "new",
      subject: "Other inquiry",
      customerName: "Other Customer",
      customerEmail: "other@example.com",
      customerContactMethod: "email",
      customerContactHandle: "other@example.com",
      serviceCategory: "Other work",
      details: "This belongs to another business.",
      submittedFieldSnapshot: {
        version: 1,
        businessType: "general_project_services",
        fields: [],
      },
      source: "public-inquiry-page",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  return ids;
}

export async function getInquiryStatus(inquiryId: string) {
  const [row] = await testDb
    .select({ status: inquiries.status })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1);

  return row?.status ?? null;
}
