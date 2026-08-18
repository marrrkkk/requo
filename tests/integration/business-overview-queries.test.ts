import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import {
  getBusinessMoneySnapshot,
  getBusinessOverviewData,
} from "@/features/businesses/queries";
import {
  businesses,
  inquiries,
  quotes,
  user,
} from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const userId = "test_overview_owner";
const businessId = "test_overview_business";
const otherBusinessId = "test_overview_business_other";
const inquiryId = "test_overview_inquiry";

const quoteIds = [
  "test_overview_quote_won_recent",
  "test_overview_quote_won_old",
  "test_overview_quote_awaiting",
  "test_overview_quote_awaiting_older",
  "test_overview_quote_expiring_soon",
  "test_overview_quote_responded",
  "test_overview_quote_expired",
  "test_overview_quote_draft",
  "test_overview_quote_deleted",
  "test_overview_quote_other_business",
] as const;

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

async function cleanupOverviewFixtures() {
  await testDb.delete(quotes).where(inArray(quotes.id, [...quoteIds]));
  await testDb.delete(inquiries).where(eq(inquiries.id, inquiryId));
  await testDb
    .delete(businesses)
    .where(inArray(businesses.id, [businessId, otherBusinessId]));
  await testDb.delete(user).where(eq(user.id, userId));
}

async function createOverviewFixture() {
  const now = new Date();

  await testDb.insert(user).values({
    id: userId,
    name: "Overview Owner",
    email: "overview.owner@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await testDb.insert(businesses).values([
    {
      id: businessId,
      ownerUserId: userId,
      name: "Overview Business",
      slug: "overview-business",
      plan: "free",
      businessType: "general_project_services",
      defaultCurrency: "EUR",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: otherBusinessId,
      ownerUserId: userId,
      name: "Other Overview Business",
      slug: "overview-business-other",
      plan: "free",
      businessType: "general_project_services",
      defaultCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await testDb.insert(inquiries).values({
    id: inquiryId,
    businessId,
    status: "new",
    subject: "Overview inquiry",
    customerName: "Overview Customer",
    customerEmail: "overview@example.com",
    customerContactMethod: "email",
    customerContactHandle: "overview@example.com",
    serviceCategory: "General",
    details: "Overview fixture inquiry.",
    submittedFieldSnapshot: {
      version: 1,
      businessType: "general_project_services",
      fields: [],
    },
    submittedAt: daysAgo(40),
    createdAt: daysAgo(40),
    updatedAt: daysAgo(40),
  });

  await testDb.insert(quotes).values([
    {
      id: quoteIds[0],
      businessId,
      status: "accepted",
      quoteNumber: "Q-OV-1",
      title: "Won recently",
      customerName: "Recent Winner",
      customerEmail: "recent@example.com",
      currency: "EUR",
      subtotalInCents: 100000,
      discountInCents: 0,
      totalInCents: 100000,
      sentAt: daysAgo(12),
      acceptedAt: daysAgo(10),
      customerRespondedAt: daysAgo(10),
      validUntil: isoDate(daysAgo(-2)),
      createdAt: daysAgo(14),
      updatedAt: daysAgo(10),
    },
    {
      id: quoteIds[1],
      businessId,
      status: "accepted",
      quoteNumber: "Q-OV-2",
      title: "Won long ago",
      customerName: "Old Winner",
      customerEmail: "old@example.com",
      currency: "EUR",
      subtotalInCents: 50000,
      discountInCents: 0,
      totalInCents: 50000,
      sentAt: daysAgo(50),
      acceptedAt: daysAgo(45),
      customerRespondedAt: daysAgo(45),
      validUntil: isoDate(daysAgo(-30)),
      createdAt: daysAgo(52),
      updatedAt: daysAgo(45),
    },
    {
      id: quoteIds[2],
      businessId,
      status: "sent",
      quoteNumber: "Q-OV-3",
      title: "Open far out",
      customerName: "Open Prospect",
      customerEmail: "open@example.com",
      currency: "EUR",
      subtotalInCents: 200000,
      discountInCents: 0,
      totalInCents: 200000,
      sentAt: daysAgo(3),
      validUntil: isoDate(daysAgo(-30)),
      createdAt: daysAgo(4),
      updatedAt: daysAgo(3),
    },
    {
      id: quoteIds[3],
      businessId,
      status: "sent",
      quoteNumber: "Q-OV-4",
      title: "Open older",
      customerName: "Older Prospect",
      customerEmail: "older@example.com",
      currency: "EUR",
      subtotalInCents: 150000,
      discountInCents: 0,
      totalInCents: 150000,
      sentAt: daysAgo(8),
      validUntil: isoDate(daysAgo(-25)),
      createdAt: daysAgo(9),
      updatedAt: daysAgo(8),
    },
    {
      id: quoteIds[4],
      businessId,
      status: "sent",
      quoteNumber: "Q-OV-5",
      title: "Expiring soon",
      customerName: "Urgent Prospect",
      customerEmail: "urgent@example.com",
      currency: "EUR",
      subtotalInCents: 175000,
      discountInCents: 0,
      totalInCents: 175000,
      sentAt: daysAgo(2),
      validUntil: isoDate(daysAgo(-5)),
      createdAt: daysAgo(3),
      updatedAt: daysAgo(2),
    },
    {
      id: quoteIds[5],
      businessId,
      status: "sent",
      quoteNumber: "Q-OV-6",
      title: "Responded already",
      customerName: "Responded Prospect",
      customerEmail: "responded@example.com",
      currency: "EUR",
      subtotalInCents: 125000,
      discountInCents: 0,
      totalInCents: 125000,
      sentAt: daysAgo(6),
      customerRespondedAt: daysAgo(1),
      validUntil: isoDate(daysAgo(-20)),
      createdAt: daysAgo(7),
      updatedAt: daysAgo(1),
    },
    {
      id: quoteIds[6],
      businessId,
      status: "sent",
      quoteNumber: "Q-OV-7",
      title: "Already expired",
      customerName: "Late Prospect",
      customerEmail: "late@example.com",
      currency: "EUR",
      subtotalInCents: 90000,
      discountInCents: 0,
      totalInCents: 90000,
      sentAt: daysAgo(15),
      validUntil: isoDate(daysAgo(1)),
      createdAt: daysAgo(16),
      updatedAt: daysAgo(15),
    },
    {
      id: quoteIds[7],
      businessId,
      status: "draft",
      quoteNumber: "Q-OV-8",
      title: "Draft in progress",
      customerName: "Draft Prospect",
      customerEmail: "draft@example.com",
      currency: "EUR",
      subtotalInCents: 30000,
      discountInCents: 0,
      totalInCents: 30000,
      validUntil: isoDate(daysAgo(-14)),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
    {
      id: quoteIds[8],
      businessId,
      status: "accepted",
      quoteNumber: "Q-OV-9",
      title: "Deleted win",
      customerName: "Deleted Prospect",
      customerEmail: "deleted@example.com",
      currency: "EUR",
      subtotalInCents: 40000,
      discountInCents: 0,
      totalInCents: 40000,
      sentAt: daysAgo(10),
      acceptedAt: daysAgo(9),
      customerRespondedAt: daysAgo(9),
      validUntil: isoDate(daysAgo(-1)),
      deletedAt: daysAgo(5),
      createdAt: daysAgo(11),
      updatedAt: daysAgo(9),
    },
    {
      id: quoteIds[9],
      businessId: otherBusinessId,
      status: "accepted",
      quoteNumber: "Q-OV-10",
      title: "Other business win",
      customerName: "Other Prospect",
      customerEmail: "other@example.com",
      currency: "USD",
      subtotalInCents: 900000,
      discountInCents: 0,
      totalInCents: 900000,
      sentAt: daysAgo(8),
      acceptedAt: daysAgo(7),
      customerRespondedAt: daysAgo(7),
      validUntil: isoDate(daysAgo(-1)),
      createdAt: daysAgo(9),
      updatedAt: daysAgo(7),
    },
  ]);
}

describe("business overview queries", () => {
  beforeAll(async () => {
    await cleanupOverviewFixtures();
    await createOverviewFixture();
  }, 30_000);

  afterAll(async () => {
    await cleanupOverviewFixtures();
    await closeTestDb();
  }, 30_000);

  it("returns won and in-play money sums in the business currency", async () => {
    const snapshot = await getBusinessMoneySnapshot(businessId);

    expect(snapshot.currency).toBe("EUR");
    expect(snapshot.wonInCents).toBe(100000);
    expect(snapshot.wonCount).toBe(1);
    expect(snapshot.inPlayInCents).toBe(525000);
    expect(snapshot.inPlayCount).toBe(3);
  });

  it("excludes deleted quotes, stale wins, responded quotes, and already-expired quotes from the money snapshot", async () => {
    const snapshot = await getBusinessMoneySnapshot(businessId);

    // 100000 (recent win) — not 100000+50000 (stale) or +40000 (deleted).
    expect(snapshot.wonInCents).toBe(100000);
    // 200000+150000+175000 — the deleted, responded, and already-expired
    // quotes never appear in either figure.
    expect(snapshot.inPlayInCents).toBe(525000);
  });

  it("scopes the money snapshot to the requested business", async () => {
    const snapshot = await getBusinessMoneySnapshot(otherBusinessId);

    expect(snapshot.currency).toBe("USD");
    expect(snapshot.wonInCents).toBe(900000);
    expect(snapshot.wonCount).toBe(1);
    expect(snapshot.inPlayInCents).toBe(0);
    expect(snapshot.inPlayCount).toBe(0);
  });

  it("returns zeroed money values for a business without quote activity", async () => {
    const snapshot = await getBusinessMoneySnapshot("test_overview_business_empty");

    expect(snapshot).toEqual({
      currency: "USD",
      wonInCents: 0,
      wonCount: 0,
      inPlayInCents: 0,
      inPlayCount: 0,
    });
  });

  it("lists open sent quotes that are not expiring soon in the awaiting response slice", async () => {
    const overview = await getBusinessOverviewData(businessId);

    expect(overview.awaitingResponseQuotes.map((q) => q.id)).toEqual([
      quoteIds[3],
      quoteIds[2],
    ]);
    expect(overview.counts.awaitingResponseQuotes).toBe(2);
  });

  it("keeps expiring-soon, responded, and expired quotes out of the awaiting response slice", async () => {
    const overview = await getBusinessOverviewData(businessId);

    const awaitingIds = overview.awaitingResponseQuotes.map((q) => q.id);

    expect(awaitingIds).not.toContain(quoteIds[4]);
    expect(awaitingIds).not.toContain(quoteIds[5]);
    expect(awaitingIds).not.toContain(quoteIds[6]);

    expect(overview.expiringSoonQuotes.map((q) => q.id)).toEqual([quoteIds[4]]);
    expect(overview.draftQuotes.map((q) => q.id)).toEqual([quoteIds[7]]);
  });
});