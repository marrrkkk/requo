import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("./db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import {
  getBusinessAnalyticsData,
  getConversionAnalyticsData,
  getWorkflowAnalyticsData,
} from "@/features/analytics/queries";
import { createInquiryFormPreset } from "@/features/inquiries/inquiry-forms";
import {
  activityLogs,
  analyticsEvents,
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

const userId = "test_analytics_user";
const workspaceId = "test_analytics_workspace";
const businessId = "test_analytics_business";
const primaryFormId = "test_analytics_form_primary";
const secondaryFormId = "test_analytics_form_secondary";
const inquiryIds = [
  "test_analytics_inquiry_1",
  "test_analytics_inquiry_2",
  "test_analytics_inquiry_3",
  "test_analytics_inquiry_4",
] as const;
const quoteIds = [
  "test_analytics_quote_1",
  "test_analytics_quote_1b",
  "test_analytics_quote_2",
  "test_analytics_quote_3",
] as const;
const activityIds = [
  "test_analytics_activity_1",
  "test_analytics_activity_2",
  "test_analytics_activity_4",
] as const;
const analyticsEventIds = [
  "test_analytics_event_1",
  "test_analytics_event_2",
  "test_analytics_event_3",
  "test_analytics_event_4",
  "test_analytics_event_5",
  "test_analytics_event_6",
  "test_analytics_event_7",
  "test_analytics_event_8",
  "test_analytics_event_9",
  "test_analytics_event_10",
  "test_analytics_event_11",
  "test_analytics_event_12",
  "test_analytics_event_13",
] as const;

const baseTime = Date.now();
const hoursAgo = (hours: number) => new Date(baseTime - hours * 60 * 60 * 1000);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const primaryFormPreset = createInquiryFormPreset({
  businessType: "general_project_services",
  businessName: "Analytics Test Business",
});

const secondaryFormPreset = createInquiryFormPreset({
  businessType: "general_project_services",
  businessName: "Analytics Test Business",
});

async function cleanupAnalyticsFixtures() {
  await testDb
    .delete(analyticsEvents)
    .where(inArray(analyticsEvents.id, [...analyticsEventIds]));
  await testDb
    .delete(activityLogs)
    .where(inArray(activityLogs.id, [...activityIds]));
  await testDb.delete(quotes).where(inArray(quotes.id, [...quoteIds]));
  await testDb
    .delete(inquiries)
    .where(inArray(inquiries.id, [...inquiryIds]));
  await testDb
    .delete(businessInquiryForms)
    .where(
      inArray(businessInquiryForms.id, [primaryFormId, secondaryFormId]),
    );
  await testDb
    .delete(businessMembers)
    .where(eq(businessMembers.businessId, businessId));
  await testDb.delete(businesses).where(eq(businesses.id, businessId));
  await testDb
    .delete(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  await testDb.delete(workspaces).where(eq(workspaces.id, workspaceId));
  await testDb.delete(user).where(eq(user.id, userId));
}

describe("features/analytics/queries", () => {
  beforeAll(async () => {
    await cleanupAnalyticsFixtures();

    const now = new Date(baseTime);

    await testDb.insert(user).values({
      id: userId,
      name: "Analytics Owner",
      email: "analytics-owner@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(workspaces).values({
      id: workspaceId,
      name: "Analytics Workspace",
      slug: "analytics-workspace",
      plan: "pro",
      ownerUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(workspaceMembers).values({
      id: "test_analytics_workspace_member",
      workspaceId,
      userId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(businesses).values({
      id: businessId,
      workspaceId,
      name: "Analytics Test Business",
      slug: "analytics-test-business",
      businessType: "general_project_services",
      countryCode: "US",
      defaultCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(businessMembers).values({
      id: "test_analytics_business_member",
      businessId,
      userId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(businessInquiryForms).values([
      {
        id: primaryFormId,
        businessId,
        name: primaryFormPreset.name,
        slug: primaryFormPreset.slug,
        businessType: primaryFormPreset.businessType,
        isDefault: true,
        publicInquiryEnabled: true,
        inquiryFormConfig: primaryFormPreset.inquiryFormConfig,
        inquiryPageConfig: primaryFormPreset.inquiryPageConfig,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: secondaryFormId,
        businessId,
        name: "Follow-up inquiry",
        slug: "follow-up-inquiry",
        businessType: secondaryFormPreset.businessType,
        isDefault: false,
        publicInquiryEnabled: true,
        inquiryFormConfig: secondaryFormPreset.inquiryFormConfig,
        inquiryPageConfig: secondaryFormPreset.inquiryPageConfig,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const inquiryOneSubmittedAt = hoursAgo(480);
    const inquiryTwoSubmittedAt = hoursAgo(240);
    const inquiryThreeSubmittedAt = hoursAgo(120);
    const inquiryFourSubmittedAt = hoursAgo(288);

    await testDb.insert(inquiries).values([
      {
        id: inquiryIds[0],
        businessId,
        businessInquiryFormId: primaryFormId,
        status: "won",
        subject: "Accepted renovation quote",
        customerName: "Alice Prospect",
        customerEmail: "alice@example.com",
        serviceCategory: "Renovation",
        details: "Need a full estimate.",
        submittedFieldSnapshot: {
          version: 1,
          businessType: "general_project_services",
          fields: [],
        },
        submittedAt: inquiryOneSubmittedAt,
        createdAt: inquiryOneSubmittedAt,
        updatedAt: hoursAgo(360),
      },
      {
        id: inquiryIds[1],
        businessId,
        businessInquiryFormId: primaryFormId,
        status: "quoted",
        subject: "Pending kitchen quote",
        customerName: "Ben Prospect",
        customerEmail: "ben@example.com",
        serviceCategory: "Kitchen remodel",
        details: "Looking for a quote next week.",
        submittedFieldSnapshot: {
          version: 1,
          businessType: "general_project_services",
          fields: [],
        },
        submittedAt: inquiryTwoSubmittedAt,
        createdAt: inquiryTwoSubmittedAt,
        updatedAt: hoursAgo(168),
      },
      {
        id: inquiryIds[2],
        businessId,
        businessInquiryFormId: secondaryFormId,
        status: "new",
        subject: "Unanswered exterior project",
        customerName: "Cara Prospect",
        customerEmail: "cara@example.com",
        serviceCategory: "Exterior work",
        details: "Need a rough estimate.",
        submittedFieldSnapshot: {
          version: 1,
          businessType: "general_project_services",
          fields: [],
        },
        submittedAt: inquiryThreeSubmittedAt,
        createdAt: inquiryThreeSubmittedAt,
        updatedAt: inquiryThreeSubmittedAt,
      },
      {
        id: inquiryIds[3],
        businessId,
        businessInquiryFormId: secondaryFormId,
        status: "lost",
        subject: "Rejected office fit-out",
        customerName: "Dana Prospect",
        customerEmail: "dana@example.com",
        serviceCategory: "Office fit-out",
        details: "Need a fit-out proposal.",
        submittedFieldSnapshot: {
          version: 1,
          businessType: "general_project_services",
          fields: [],
        },
        submittedAt: inquiryFourSubmittedAt,
        createdAt: inquiryFourSubmittedAt,
        updatedAt: hoursAgo(168),
      },
    ]);

    await testDb.insert(quotes).values([
      {
        id: quoteIds[0],
        businessId,
        inquiryId: inquiryIds[0],
        status: "accepted",
        quoteNumber: "Q-1001",
        publicToken: "analytics-public-token-1",
        title: "Accepted renovation quote",
        customerName: "Alice Prospect",
        customerEmail: "alice@example.com",
        currency: "USD",
        subtotalInCents: 15000,
        discountInCents: 0,
        totalInCents: 15000,
        sentAt: hoursAgo(432),
        acceptedAt: hoursAgo(360),
        publicViewedAt: hoursAgo(408),
        customerRespondedAt: hoursAgo(360),
        validUntil: isoDate(hoursAgo(96)),
        createdAt: hoursAgo(444),
        updatedAt: hoursAgo(360),
      },
      {
        id: quoteIds[1],
        businessId,
        inquiryId: inquiryIds[0],
        status: "draft",
        quoteNumber: "Q-1001B",
        publicToken: "analytics-public-token-1b",
        title: "Revision draft",
        customerName: "Alice Prospect",
        customerEmail: "alice@example.com",
        currency: "USD",
        subtotalInCents: 17000,
        discountInCents: 0,
        totalInCents: 17000,
        validUntil: isoDate(hoursAgo(72)),
        createdAt: hoursAgo(430),
        updatedAt: hoursAgo(430),
      },
      {
        id: quoteIds[2],
        businessId,
        inquiryId: inquiryIds[1],
        status: "sent",
        quoteNumber: "Q-1002",
        publicToken: "analytics-public-token-2",
        title: "Pending kitchen quote",
        customerName: "Ben Prospect",
        customerEmail: "ben@example.com",
        currency: "USD",
        subtotalInCents: 20000,
        discountInCents: 0,
        totalInCents: 20000,
        sentAt: hoursAgo(192),
        publicViewedAt: hoursAgo(168),
        validUntil: isoDate(hoursAgo(-96)),
        createdAt: hoursAgo(192),
        updatedAt: hoursAgo(168),
      },
      {
        id: quoteIds[3],
        businessId,
        inquiryId: inquiryIds[3],
        status: "rejected",
        quoteNumber: "Q-1003",
        publicToken: "analytics-public-token-3",
        title: "Rejected fit-out quote",
        customerName: "Dana Prospect",
        customerEmail: "dana@example.com",
        currency: "USD",
        subtotalInCents: 18000,
        discountInCents: 0,
        totalInCents: 18000,
        sentAt: hoursAgo(240),
        publicViewedAt: hoursAgo(236),
        customerRespondedAt: hoursAgo(168),
        validUntil: isoDate(hoursAgo(24)),
        createdAt: hoursAgo(264),
        updatedAt: hoursAgo(168),
      },
    ]);

    await testDb.insert(activityLogs).values([
      {
        id: activityIds[0],
        businessId,
        inquiryId: inquiryIds[0],
        actorUserId: userId,
        type: "inquiry.viewed",
        summary: "Owner reviewed the accepted inquiry.",
        metadata: {},
        createdAt: hoursAgo(468),
        updatedAt: hoursAgo(468),
      },
      {
        id: activityIds[1],
        businessId,
        inquiryId: inquiryIds[1],
        actorUserId: userId,
        type: "inquiry.followed_up",
        summary: "Owner followed up on the pending quote.",
        metadata: {},
        createdAt: hoursAgo(216),
        updatedAt: hoursAgo(216),
      },
      {
        id: activityIds[2],
        businessId,
        inquiryId: inquiryIds[3],
        actorUserId: userId,
        type: "inquiry.responded",
        summary: "Owner responded on the rejected inquiry.",
        metadata: {},
        createdAt: hoursAgo(282),
        updatedAt: hoursAgo(282),
      },
    ]);

    await testDb.insert(analyticsEvents).values([
      {
        id: analyticsEventIds[0],
        businessId,
        businessInquiryFormId: primaryFormId,
        eventType: "inquiry_form_viewed",
        visitorHash: "visitor-a",
        occurredAt: hoursAgo(500),
      },
      {
        id: analyticsEventIds[1],
        businessId,
        businessInquiryFormId: primaryFormId,
        eventType: "inquiry_form_viewed",
        visitorHash: "visitor-a",
        occurredAt: hoursAgo(480),
      },
      {
        id: analyticsEventIds[2],
        businessId,
        businessInquiryFormId: primaryFormId,
        eventType: "inquiry_form_viewed",
        visitorHash: "visitor-b",
        occurredAt: hoursAgo(240),
      },
      {
        id: analyticsEventIds[3],
        businessId,
        businessInquiryFormId: primaryFormId,
        eventType: "inquiry_form_viewed",
        visitorHash: "visitor-b",
        occurredAt: hoursAgo(239),
      },
      {
        id: analyticsEventIds[4],
        businessId,
        businessInquiryFormId: primaryFormId,
        eventType: "inquiry_form_viewed",
        visitorHash: "visitor-c",
        occurredAt: hoursAgo(120),
      },
      {
        id: analyticsEventIds[5],
        businessId,
        businessInquiryFormId: secondaryFormId,
        eventType: "inquiry_form_viewed",
        visitorHash: "visitor-d",
        occurredAt: hoursAgo(288),
      },
      {
        id: analyticsEventIds[6],
        businessId,
        businessInquiryFormId: secondaryFormId,
        eventType: "inquiry_form_viewed",
        visitorHash: "visitor-d",
        occurredAt: hoursAgo(264),
      },
      {
        id: analyticsEventIds[7],
        businessId,
        businessInquiryFormId: secondaryFormId,
        eventType: "inquiry_form_viewed",
        visitorHash: "visitor-e",
        occurredAt: hoursAgo(144),
      },
      {
        id: analyticsEventIds[8],
        businessId,
        businessInquiryFormId: secondaryFormId,
        eventType: "inquiry_form_viewed",
        visitorHash: "visitor-e",
        occurredAt: hoursAgo(120),
      },
      {
        id: analyticsEventIds[9],
        businessId,
        quoteId: quoteIds[0],
        eventType: "quote_public_viewed",
        visitorHash: "quote-viewer-a",
        occurredAt: hoursAgo(408),
      },
      {
        id: analyticsEventIds[10],
        businessId,
        quoteId: quoteIds[0],
        eventType: "quote_public_viewed",
        visitorHash: "quote-viewer-a",
        occurredAt: hoursAgo(384),
      },
      {
        id: analyticsEventIds[11],
        businessId,
        quoteId: quoteIds[2],
        eventType: "quote_public_viewed",
        visitorHash: "quote-viewer-b",
        occurredAt: hoursAgo(168),
      },
      {
        id: analyticsEventIds[12],
        businessId,
        quoteId: quoteIds[3],
        eventType: "quote_public_viewed",
        visitorHash: "quote-viewer-c",
        occurredAt: hoursAgo(236),
      },
    ]);
  });

  afterAll(async () => {
    await cleanupAnalyticsFixtures();
    await closeTestDb();
  });

  it("returns business analytics for the public inquiry funnel", async () => {
    const data = await getBusinessAnalyticsData(businessId);
    const trendTotals = data.recentTrend.reduce(
      (totals, point) => ({
        formViews: totals.formViews + point.formViews,
        inquirySubmissions: totals.inquirySubmissions + point.inquirySubmissions,
        quotesSent: totals.quotesSent + point.quotesSent,
        acceptedQuotes: totals.acceptedQuotes + point.acceptedQuotes,
      }),
      {
        formViews: 0,
        inquirySubmissions: 0,
        quotesSent: 0,
        acceptedQuotes: 0,
      },
    );
    const statusCounts = Object.fromEntries(
      data.inquiryStatusCounts.map((row) => [row.status, row.count]),
    );

    expect(data.summary.formViews).toBe(9);
    expect(data.summary.uniqueVisitors).toBe(5);
    expect(data.summary.inquirySubmissions).toBe(4);
    expect(data.summary.formConversionRate).toBeCloseTo(0.8);
    expect(data.summary.responseRate).toBeCloseTo(0.75);
    expect(data.summary.avgFirstResponseHours).toBe(14);
    expect(data.summary.quotesSent).toBe(3);
    expect(data.summary.quotesViewed).toBe(3);
    expect(data.summary.quotesAccepted).toBe(1);
    expect(data.summary.quotesRejected).toBe(1);
    expect(data.summary.quoteAcceptanceRate).toBeCloseTo(1 / 3);
    expect(data.summary.avgTimeSentToDecisionHours).toBe(72);
    expect(data.funnel).toEqual({
      uniqueVisitors: 5,
      inquirySubmissions: 4,
      inquiriesWithQuote: 3,
      acceptedQuotes: 1,
    });
    expect(statusCounts).toMatchObject({
      won: 1,
      quoted: 1,
      waiting: 1,
      lost: 1,
    });
    expect(data.backlog).toEqual({
      staleInquiryCount: 1,
      pendingQuotesOverSevenDays: 1,
    });
    expect(trendTotals).toEqual({
      formViews: 9,
      inquirySubmissions: 4,
      quotesSent: 3,
      acceptedQuotes: 1,
    });
  });

  it("returns conversion analytics with per-form performance", async () => {
    const data = await getConversionAnalyticsData(businessId);
    const trendTotals = data.quotesTrend.reduce(
      (totals, point) => ({
        quotesSent: totals.quotesSent + point.quotesSent,
        quoteViews: totals.quoteViews + point.quoteViews,
        acceptedQuotes: totals.acceptedQuotes + point.acceptedQuotes,
        rejectedQuotes: totals.rejectedQuotes + point.rejectedQuotes,
      }),
      {
        quotesSent: 0,
        quoteViews: 0,
        acceptedQuotes: 0,
        rejectedQuotes: 0,
      },
    );

    expect(data.summary).toMatchObject({
      inquirySubmissions: 4,
      inquiriesWithQuote: 3,
      quotesSent: 3,
      quotesViewed: 3,
      quotePageViews: 4,
      quotesAccepted: 1,
      quotesRejected: 1,
      acceptedValueInCents: 15000,
      averageAcceptedValueInCents: 15000,
    });
    expect(data.summary.inquiryToQuoteRate).toBeCloseTo(0.75);
    expect(data.summary.quoteViewRate).toBeCloseTo(1);
    expect(data.summary.quoteAcceptanceRate).toBeCloseTo(1 / 3);
    expect(data.funnel).toEqual({
      inquirySubmissions: 4,
      inquiriesWithQuote: 3,
      quotesSent: 3,
      quotesViewed: 3,
      quotesAccepted: 1,
    });
    expect(trendTotals).toEqual({
      quotesSent: 3,
      quoteViews: 4,
      acceptedQuotes: 1,
      rejectedQuotes: 1,
    });
    expect(data.formPerformance).toHaveLength(2);
    expect(data.formPerformance[0]).toMatchObject({
      formId: primaryFormId,
      viewCount: 5,
      uniqueVisitorCount: 3,
      submissionCount: 2,
      inquiriesWithQuoteCount: 2,
      sentQuoteCount: 2,
      acceptedQuoteCount: 1,
    });
    expect(data.formPerformance[0].formConversionRate).toBeCloseTo(2 / 3);
    expect(data.formPerformance[0].inquiryToQuoteRate).toBeCloseTo(1);
    expect(data.formPerformance[0].quoteAcceptanceRate).toBeCloseTo(0.5);
    expect(data.formPerformance[1]).toMatchObject({
      formId: secondaryFormId,
      viewCount: 4,
      uniqueVisitorCount: 2,
      submissionCount: 2,
      inquiriesWithQuoteCount: 1,
      sentQuoteCount: 1,
      acceptedQuoteCount: 0,
    });
    expect(data.formPerformance[1].formConversionRate).toBeCloseTo(1);
    expect(data.formPerformance[1].inquiryToQuoteRate).toBeCloseTo(0.5);
    expect(data.formPerformance[1].quoteAcceptanceRate).toBeCloseTo(0);
  });

  it("returns workflow metrics from activity and quote history", async () => {
    const data = await getWorkflowAnalyticsData(businessId);

    expect(data.summary.responseRate).toBeCloseTo(0.75);
    expect(data.summary.avgFirstResponseHours).toBe(14);
    expect(data.summary.avgTimeToFirstQuoteHours).toBe(36);
    expect(data.summary.avgTimeSentToDecisionHours).toBe(72);
    expect(data.alerts).toEqual({
      staleInquiryCount: 1,
      pendingQuotesOverSevenDays: 1,
    });
  });

  it("excludes deleted records from metrics while preserving voided quote lifecycle history", async () => {
    const deletedInquiryId = "test_analytics_inquiry_deleted";
    const deletedDraftQuoteId = "test_analytics_quote_deleted_draft";
    const voidedQuoteId = "test_analytics_quote_voided";

    await testDb.insert(inquiries).values({
      id: deletedInquiryId,
      businessId,
      businessInquiryFormId: primaryFormId,
      status: "new",
      subject: "Deleted spam inquiry",
      customerName: "Deleted Prospect",
      customerEmail: "deleted@example.com",
      serviceCategory: "Spam",
      details: "Should stay out of analytics.",
      submittedFieldSnapshot: {
        version: 1,
        businessType: "general_project_services",
        fields: [],
      },
      deletedAt: hoursAgo(12),
      deletedBy: userId,
      submittedAt: hoursAgo(12),
      createdAt: hoursAgo(12),
      updatedAt: hoursAgo(12),
    });

    await testDb.insert(quotes).values([
      {
        id: deletedDraftQuoteId,
        businessId,
        inquiryId: inquiryIds[1],
        status: "draft",
        quoteNumber: "Q-DELETED-DRAFT",
        publicToken: "analytics-deleted-draft-token",
        title: "Deleted draft quote",
        customerName: "Ben Prospect",
        customerEmail: "ben@example.com",
        currency: "USD",
        subtotalInCents: 5000,
        discountInCents: 0,
        totalInCents: 5000,
        validUntil: isoDate(hoursAgo(-48)),
        deletedAt: hoursAgo(10),
        deletedBy: userId,
        createdAt: hoursAgo(10),
        updatedAt: hoursAgo(10),
      },
      {
        id: voidedQuoteId,
        businessId,
        inquiryId: inquiryIds[1],
        status: "voided",
        quoteNumber: "Q-VOIDED-1004",
        publicToken: "analytics-voided-token",
        title: "Voided kitchen quote",
        customerName: "Ben Prospect",
        customerEmail: "ben@example.com",
        currency: "USD",
        subtotalInCents: 22000,
        discountInCents: 0,
        totalInCents: 22000,
        sentAt: hoursAgo(96),
        publicViewedAt: hoursAgo(95),
        voidedAt: hoursAgo(94),
        voidedBy: userId,
        validUntil: isoDate(hoursAgo(-24)),
        createdAt: hoursAgo(96),
        updatedAt: hoursAgo(94),
      },
    ]);

    try {
      const businessAnalytics = await getBusinessAnalyticsData(businessId);
      const conversionAnalytics = await getConversionAnalyticsData(businessId);

      expect(businessAnalytics.summary.inquirySubmissions).toBe(4);
      expect(conversionAnalytics.summary.inquirySubmissions).toBe(4);
      expect(conversionAnalytics.summary.quotesAccepted).toBe(1);
      expect(conversionAnalytics.summary.quotesRejected).toBe(1);
      expect(conversionAnalytics.summary.quotesSent).toBe(4);
      expect(conversionAnalytics.summary.quotesViewed).toBe(4);
    } finally {
      await testDb
        .delete(quotes)
        .where(inArray(quotes.id, [deletedDraftQuoteId, voidedQuoteId]));
      await testDb.delete(inquiries).where(eq(inquiries.id, deletedInquiryId));
    }
  });
});
