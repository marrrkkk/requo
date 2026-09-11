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

import { getDashboardMonthlyRevenue } from "@/features/analytics/queries";
import { businesses, quotes, user } from "@/lib/db/schema";

import { closeTestDb, testDb } from "@/tests/support/db";

const userId = "test_monthly_revenue_owner";
const businessId = "test_monthly_revenue_business";
const otherBusinessId = "test_monthly_revenue_business_other";

const quoteIds = [
  "test_monthly_revenue_quote_current",
  "test_monthly_revenue_quote_previous",
  "test_monthly_revenue_quote_previous_second",
  "test_monthly_revenue_quote_deleted",
  "test_monthly_revenue_quote_archived",
  "test_monthly_revenue_quote_unaccepted",
  "test_monthly_revenue_quote_other_business",
  "test_monthly_revenue_quote_out_of_window",
] as const;

const now = new Date();
const year = now.getUTCFullYear();
const month = now.getUTCMonth();
const secondMonth = (month + 5) % 12;

const utcDate = (y: number, m: number, day: number) =>
  new Date(Date.UTC(y, m, day, 12));
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

let quoteNumberSeq = 0;

function quoteFixture(
  id: string,
  overrides: Partial<typeof quotes.$inferInsert> &
    Pick<typeof quotes.$inferInsert, "validUntil">,
): typeof quotes.$inferInsert {
  const now = new Date();
  const quoteNumber = `Q-MR-${String(++quoteNumberSeq).padStart(2, "0")}`;
  return {
    id,
    businessId,
    status: "accepted" as const,
    quoteNumber,
    title: `Monthly revenue fixture ${id}`,
    customerName: "Monthly Revenue Customer",
    customerEmail: "monthly-revenue@example.com",
    currency: "EUR",
    subtotalInCents: 100000,
    discountInCents: 0,
    totalInCents: 100000,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function cleanupMonthlyRevenueFixtures() {
  await testDb.delete(quotes).where(inArray(quotes.id, [...quoteIds]));
  await testDb
    .delete(businesses)
    .where(inArray(businesses.id, [businessId, otherBusinessId]));
  await testDb.delete(user).where(eq(user.id, userId));
}

async function createMonthlyRevenueFixture() {
  await testDb.insert(user).values({
    id: userId,
    name: "Monthly Revenue Owner",
    email: "monthly-revenue.owner@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await testDb.insert(businesses).values([
    {
      id: businessId,
      ownerUserId: userId,
      name: "Monthly Revenue Business",
      slug: "monthly-revenue-business",
      plan: "free",
      businessType: "general_project_services",
      defaultCurrency: "EUR",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: otherBusinessId,
      ownerUserId: userId,
      name: "Other Monthly Revenue Business",
      slug: "monthly-revenue-business-other",
      plan: "free",
      businessType: "general_project_services",
      defaultCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await testDb.insert(quotes).values([
    // This year's running month: 150000 cents into the current series.
    quoteFixture(quoteIds[0], {
      totalInCents: 150000,
      subtotalInCents: 150000,
      acceptedAt: utcDate(year, month, 10),
      sentAt: utcDate(year, month, 5),
      customerRespondedAt: utcDate(year, month, 9),
      validUntil: isoDate(new Date(Date.UTC(year, month + 1, 0))),
    }),
    // Same month last year: 120000 cents into the previous series.
    quoteFixture(quoteIds[1], {
      totalInCents: 120000,
      subtotalInCents: 120000,
      acceptedAt: utcDate(year - 1, month, 10),
      sentAt: utcDate(year - 1, month, 5),
      customerRespondedAt: utcDate(year - 1, month, 9),
      validUntil: isoDate(new Date(Date.UTC(year - 1, month + 1, 0))),
    }),
    // A second month last year, so bucketing across months is visible.
    quoteFixture(quoteIds[2], {
      totalInCents: 45000,
      subtotalInCents: 45000,
      acceptedAt: utcDate(year - 1, secondMonth, 10),
      sentAt: utcDate(year - 1, secondMonth, 5),
      customerRespondedAt: utcDate(year - 1, secondMonth, 9),
      validUntil: isoDate(new Date(Date.UTC(year - 1, secondMonth + 1, 0))),
    }),
    // Deleted quotes never count, in either series.
    quoteFixture(quoteIds[3], {
      totalInCents: 99999,
      subtotalInCents: 99999,
      deletedAt: utcDate(year - 1, month, 12),
      acceptedAt: utcDate(year - 1, month, 10),
      sentAt: utcDate(year - 1, month, 5),
      validUntil: isoDate(new Date(Date.UTC(year - 1, month + 1, 0))),
    }),
    // Archived quotes are out of the operational set too.
    quoteFixture(quoteIds[4], {
      totalInCents: 88888,
      subtotalInCents: 88888,
      archivedAt: utcDate(year, month, 12),
      acceptedAt: utcDate(year, month, 10),
      sentAt: utcDate(year, month, 5),
      validUntil: isoDate(new Date(Date.UTC(year, month + 1, 0))),
    }),
    // Sent-but-not-accepted quotes carry no revenue.
    quoteFixture(quoteIds[5], {
      status: "sent",
      totalInCents: 77777,
      subtotalInCents: 77777,
      sentAt: utcDate(year, month, 5),
      validUntil: isoDate(new Date(Date.UTC(year, month + 1, 0))),
    }),
    // Another business's win stays out.
    quoteFixture(quoteIds[6], {
      businessId: otherBusinessId,
      totalInCents: 66666,
      subtotalInCents: 66666,
      currency: "USD",
      acceptedAt: utcDate(year, month, 10),
      sentAt: utcDate(year, month, 5),
      customerRespondedAt: utcDate(year, month, 9),
      validUntil: isoDate(new Date(Date.UTC(year, month + 1, 0))),
    }),
    // A win from two years ago falls outside both windows.
    quoteFixture(quoteIds[7], {
      totalInCents: 55555,
      subtotalInCents: 55555,
      acceptedAt: utcDate(year - 2, month, 10),
      sentAt: utcDate(year - 2, month, 5),
      customerRespondedAt: utcDate(year - 2, month, 9),
      validUntil: isoDate(new Date(Date.UTC(year - 2, month + 1, 0))),
    }),
  ]);
}

describe("getDashboardMonthlyRevenue", () => {
  beforeAll(async () => {
    await cleanupMonthlyRevenueFixtures();
    await createMonthlyRevenueFixture();
  }, 30_000);

  afterAll(async () => {
    await cleanupMonthlyRevenueFixtures();
    await closeTestDb();
  }, 30_000);

  it("buckets accepted-quote revenue by calendar month for this year and last", async () => {
    const result = await getDashboardMonthlyRevenue(businessId);

    expect(result.points).toHaveLength(12);
    expect(result.points.map((p) => p.label)).toEqual([
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]);

    // The running month pairs this year's win against the same month a
    // year earlier.
    expect(result.points[month]).toEqual({
      label: result.points[month].label,
      current: 150000,
      previous: 120000,
    });

    // The second fixture month only has a last-year win; its current-year
    // figure stays zero.
    expect(result.points[secondMonth].previous).toBe(45000);
    expect(result.points[secondMonth].current).toBe(0);
  });

  it("excludes deleted, archived, unaccepted, other-business, and out-of-window quotes", async () => {
    const result = await getDashboardMonthlyRevenue(businessId);

    const totalCurrent = result.points.reduce((sum, p) => sum + p.current, 0);
    const totalPrevious = result.points.reduce((sum, p) => sum + p.previous, 0);

    // 150000 (this month) — not +88888 (archived) / +77777 (sent) /
    // +66666 (other business) / +55555 (two years ago).
    expect(totalCurrent).toBe(150000);
    // 120000 + 45000 — not +99999 (deleted).
    expect(totalPrevious).toBe(165000);
  });

  it("scopes results to the requested business and reads its currency", async () => {
    const result = await getDashboardMonthlyRevenue(businessId);
    const other = await getDashboardMonthlyRevenue(otherBusinessId);

    expect(result.currency).toBe("EUR");
    expect(other.currency).toBe("USD");

    const otherTotal = other.points.reduce((sum, p) => sum + p.current + p.previous, 0);
    expect(otherTotal).toBe(66666);
  });

  it("returns twelve zeroed points for a business without accepted quotes", async () => {
    await testDb
      .delete(businesses)
      .where(eq(businesses.id, "test_monthly_revenue_business_empty"));
    await testDb.insert(businesses).values({
      id: "test_monthly_revenue_business_empty",
      ownerUserId: userId,
      name: "Empty Monthly Revenue Business",
      slug: "monthly-revenue-business-empty",
      plan: "free",
      businessType: "general_project_services",
      defaultCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    });

    try {
      const result = await getDashboardMonthlyRevenue(
        "test_monthly_revenue_business_empty",
      );

      expect(result.currency).toBe("USD");
      expect(result.points).toHaveLength(12);
      expect(result.points.every((p) => p.current === 0 && p.previous === 0)).toBe(
        true,
      );
    } finally {
      await testDb
        .delete(businesses)
        .where(eq(businesses.id, "test_monthly_revenue_business_empty"));
    }
  });
});
