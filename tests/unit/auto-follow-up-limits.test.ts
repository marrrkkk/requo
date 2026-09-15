import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

type EligibleRow = {
  quoteId: string;
  businessId: string;
  businessName: string;
  businessPlan: string;
  businessContactEmail: string | null;
  defaultEmailSignature: string | null;
  quoteFollowUpTemplate: unknown;
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  publicToken: string | null;
  sentAt: Date | null;
  autoFollowUpDelayDays: number;
  autoFollowUpMaxAttempts: number;
  autoFollowUpAttempts: number;
  autoFollowUpLastSentAt: Date | null;
};

function makeRow(overrides: Partial<EligibleRow> = {}): EligibleRow {
  return {
    quoteId: "quote_1",
    businessId: "business_1",
    businessName: "BrightSide Print Studio",
    businessPlan: "pro",
    businessContactEmail: "owner@example.com",
    defaultEmailSignature: null,
    quoteFollowUpTemplate: null,
    quoteNumber: "Q-1001",
    title: "Storefront sign",
    customerName: "Ava Cruz",
    customerEmail: "ava@example.com",
    publicToken: "token_1",
    // Far enough in the past that the delay window has elapsed.
    sentAt: new Date("2020-01-01T00:00:00.000Z"),
    autoFollowUpDelayDays: 3,
    autoFollowUpMaxAttempts: 2,
    autoFollowUpAttempts: 0,
    autoFollowUpLastSentAt: null,
    ...overrides,
  };
}

async function importJobHarness({
  rows,
  dailyUsed,
  monthlyUsed,
}: {
  rows: EligibleRow[];
  dailyUsed: number;
  monthlyUsed: number;
}) {
  vi.resetModules();

  const sendQuoteAutoFollowUpEmail = vi.fn(async () => undefined);

  const limit = vi.fn(async () => rows);
  const where = vi.fn(() => ({ limit }));
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ innerJoin }));
  const select = vi.fn(() => ({ from }));

  const updateWhere = vi.fn(async () => ({}));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  const insertValues = vi.fn(async () => ({}));
  const insert = vi.fn(() => ({ values: insertValues }));

  const getDailyAutoFollowUpSendCount = vi.fn(async () => dailyUsed);
  const getMonthlyAutoFollowUpSendCount = vi.fn(async () => monthlyUsed);

  vi.doMock("@/lib/env", () => ({
    env: { BETTER_AUTH_URL: "http://127.0.0.1:3000" },
    isQuoteAutoFollowUpEmailEnabled: true,
  }));
  vi.doMock("@/lib/db/client", () => ({
    db: { select, update, insert },
  }));
  vi.doMock("@/lib/plans/usage", () => ({
    getDailyAutoFollowUpSendCount,
    getMonthlyAutoFollowUpSendCount,
  }));
  vi.doMock("@/lib/resend/client", () => ({
    sendQuoteAutoFollowUpEmail,
  }));

  const { processQuoteAutoFollowUps } = await import(
    "@/features/quotes/jobs/auto-follow-ups"
  );

  return {
    processQuoteAutoFollowUps,
    sendQuoteAutoFollowUpEmail,
    insertValues,
    updateWhere,
    getDailyAutoFollowUpSendCount,
    getMonthlyAutoFollowUpSendCount,
  };
}

describe("auto follow-up send budgets", () => {
  it("sends when the plan budget has room and records the attempt", async () => {
    const harness = await importJobHarness({
      rows: [makeRow()],
      dailyUsed: 0,
      monthlyUsed: 0,
    });

    const summary = await harness.processQuoteAutoFollowUps();

    expect(harness.sendQuoteAutoFollowUpEmail).toHaveBeenCalledTimes(1);
    expect(harness.updateWhere).toHaveBeenCalledTimes(1);
    expect(harness.insertValues).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({ processed: 1, sent: 1, skipped: 0, errors: 0 });
  });

  it("skips without sending or advancing attempts when the monthly budget is spent", async () => {
    const harness = await importJobHarness({
      rows: [makeRow()],
      dailyUsed: 0,
      // Pro monthly allowance is 30.
      monthlyUsed: 30,
    });

    const summary = await harness.processQuoteAutoFollowUps();

    expect(harness.sendQuoteAutoFollowUpEmail).not.toHaveBeenCalled();
    // Skipping must not advance attempts, so the sequence resumes next month.
    expect(harness.updateWhere).not.toHaveBeenCalled();
    expect(summary).toEqual({ processed: 0, sent: 0, skipped: 1, errors: 0 });
  });

  it("skips when the daily burst guard is exhausted", async () => {
    const harness = await importJobHarness({
      rows: [makeRow()],
      // Pro daily allowance is 5.
      dailyUsed: 5,
      monthlyUsed: 0,
    });

    const summary = await harness.processQuoteAutoFollowUps();

    expect(harness.sendQuoteAutoFollowUpEmail).not.toHaveBeenCalled();
    expect(summary).toEqual({ processed: 0, sent: 0, skipped: 1, errors: 0 });
  });

  it("caps a single batch at the remaining monthly allowance", async () => {
    const harness = await importJobHarness({
      rows: [
        makeRow({ quoteId: "quote_1", quoteNumber: "Q-1" }),
        makeRow({ quoteId: "quote_2", quoteNumber: "Q-2" }),
      ],
      dailyUsed: 0,
      // One send left in the month.
      monthlyUsed: 29,
    });

    const summary = await harness.processQuoteAutoFollowUps();

    expect(harness.sendQuoteAutoFollowUpEmail).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({ processed: 1, sent: 1, skipped: 1, errors: 0 });
  });

  it("does not send for a business that downgraded off the feature", async () => {
    const harness = await importJobHarness({
      rows: [makeRow({ businessPlan: "free" })],
      dailyUsed: 0,
      monthlyUsed: 0,
    });

    const summary = await harness.processQuoteAutoFollowUps();

    expect(harness.sendQuoteAutoFollowUpEmail).not.toHaveBeenCalled();
    expect(summary).toEqual({ processed: 0, sent: 0, skipped: 1, errors: 0 });
  });
});
