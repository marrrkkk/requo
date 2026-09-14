import { describe, expect, it } from "vitest";

import {
  adminRecentActivityKindLabels,
  formatAdminActivityDate,
} from "@/features/admin/components/overview/admin-overview-activity";
import { getUnpricedCostNote } from "@/features/admin/components/overview/admin-overview-breakdowns";
import {
  buildAdminOverviewStats,
  formatAdminCostCents,
  formatAdminCount,
  formatAdminPercent,
} from "@/features/admin/components/overview/admin-overview-stats";
import type {
  AdminDashboardCounts,
  AdminOverviewMetrics,
  AdminRecentActivityKind,
} from "@/features/admin/types";

function makeCounts(overrides: Partial<AdminDashboardCounts> = {}): AdminDashboardCounts {
  return {
    totalUsers: 1200,
    totalBusinesses: 85,
    activeSubscriptionsByPlan: { pro: 10, business: 2 },
    totalActiveSubscriptions: 12,
    signUpsLast7d: 34,
    inquiriesLast7d: 56,
    quotesSentLast7d: 21,
    ...overrides,
  };
}

function makeMetrics(): AdminOverviewMetrics {
  return {
    inquiries: {
      total: 200,
      byStatus: {
        new: 50,
        quoted: 40,
        waiting: 30,
        won: 60,
        lost: 10,
        archived: 5,
        overdue: 5,
      },
    },
    quotes: {
      total: 150,
      byStatus: {
        draft: 60,
        sent: 40,
        revision_requested: 5,
        accepted: 25,
        rejected: 10,
        expired: 8,
        voided: 2,
      },
    },
    email: {
      last24h: {
        total: 100,
        byStatus: { pending: 2, sending: 1, sent: 95, failed: 2, unknown: 0 },
      },
      last7d: {
        total: 700,
        byStatus: { pending: 5, sending: 3, sent: 680, failed: 12, unknown: 0 },
      },
    },
    ai: {
      calls: 400,
      errors: 8,
      totalTokens: 1_250_000,
      estimatedCostCents: 12345,
      unpricedCalls: 0,
      cacheHits: 100,
      averageLatencyMs: 812.4,
    },
  };
}

describe("formatAdminCount", () => {
  it("formats zero and large values with thousands separators", () => {
    expect(formatAdminCount(0)).toBe("0");
    expect(formatAdminCount(42)).toBe("42");
    expect(formatAdminCount(1_234_567)).toBe("1,234,567");
  });
});

describe("formatAdminCostCents", () => {
  it("renders cents as dollars with two decimals", () => {
    expect(formatAdminCostCents(0)).toBe("$0.00");
    expect(formatAdminCostCents(1)).toBe("$0.01");
    expect(formatAdminCostCents(12345)).toBe("$123.45");
  });
});

describe("formatAdminPercent", () => {
  it("renders one decimal place", () => {
    expect(formatAdminPercent(1, 3)).toBe("33.3%");
    expect(formatAdminPercent(8, 400)).toBe("2.0%");
  });

  it("returns null when there is nothing to divide by", () => {
    expect(formatAdminPercent(0, 0)).toBeNull();
    expect(formatAdminPercent(5, -1)).toBeNull();
  });
});

describe("buildAdminOverviewStats", () => {
  it("builds four tiles pairing totals with 7-day momentum", () => {
    const stats = buildAdminOverviewStats(makeCounts(), makeMetrics());

    expect(stats.map((stat) => stat.label)).toEqual([
      "Total users",
      "Businesses",
      "Inquiries",
      "Quotes",
    ]);
    expect(stats.map((stat) => stat.value)).toEqual([
      "1,200",
      "85",
      "200",
      "150",
    ]);
    expect(stats.map((stat) => stat.delta)).toEqual([
      "+34 in 7d",
      "12 active subs",
      "56 in 7d",
      "21 sent in 7d",
    ]);
    // The quotes delta counts *sent* quotes only, while the value counts
    // every non-deleted quote — the "sent" qualifier keeps that honest.
    expect(stats[3]?.delta).toContain("sent");
    expect(stats.every((stat) => stat.deltaColor === "lime")).toBe(true);
  });

  it("falls back to neutral deltas when every window is empty", () => {
    const stats = buildAdminOverviewStats(
      makeCounts({
        totalActiveSubscriptions: 0,
        signUpsLast7d: 0,
        inquiriesLast7d: 0,
        quotesSentLast7d: 0,
      }),
      makeMetrics(),
    );

    expect(stats.map((stat) => stat.delta)).toEqual([
      "+0 in 7d",
      "0 active subs",
      "0 in 7d",
      "0 sent in 7d",
    ]);
    expect(stats.every((stat) => stat.deltaColor === "neutral")).toBe(true);
    expect(stats.every((stat) => stat.deltaDirection === "flat")).toBe(true);
  });
});

describe("getUnpricedCostNote", () => {
  it("stays quiet when every call was priced", () => {
    expect(getUnpricedCostNote(0)).toBeNull();
    expect(getUnpricedCostNote(-2)).toBeNull();
  });

  it("warns that the cost is a floor when calls went unpriced", () => {
    expect(getUnpricedCostNote(1)).toContain("1 call");
    expect(getUnpricedCostNote(17)).toContain("17 calls");
  });
});

describe("adminRecentActivityKindLabels", () => {
  it("labels every feed source kind", () => {
    const kinds: AdminRecentActivityKind[] = ["audit", "inquiry", "quote", "email"];

    for (const kind of kinds) {
      expect(adminRecentActivityKindLabels[kind]).toMatch(/\S/);
    }
  });
});

describe("formatAdminActivityDate", () => {
  it("formats valid dates and guards invalid ones", () => {
    expect(
      formatAdminActivityDate(new Date("2026-09-13T10:00:00Z")),
    ).toMatch(/2026/);
    expect(formatAdminActivityDate(new Date("not-a-date"))).toBe(
      "Unknown time",
    );
  });
});
