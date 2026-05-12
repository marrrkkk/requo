import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock "server-only" so the module can be imported.
vi.mock("server-only", () => ({}));

// Database query mocks. Each call returns a thenable chain that resolves
// to a predetermined array of rows.
type MockRow = Record<string, unknown>;

const paymentAttemptRows: MockRow[] = [];
const refundRows: MockRow[] = [];
const accountSubscriptionRows: MockRow[] = [];

function thenable(result: MockRow[]) {
  const promise = Promise.resolve(result);
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    orderBy: () => chain,
    innerJoin: () => chain,
    then: (resolve: (value: MockRow[]) => unknown) => promise.then(resolve),
    catch: (reject: (value: unknown) => unknown) => promise.catch(reject),
  };
  return chain;
}

function selectChain() {
  return {
    from: (table: unknown) => {
      if (table === "payment_attempts_table") {
        return thenable(paymentAttemptRows);
      }
      if (table === "refunds_table") {
        return thenable(refundRows);
      }
      if (table === "account_subscriptions_table") {
        return thenable(accountSubscriptionRows);
      }
      return thenable([]);
    },
  };
}

const insertReturning = vi.fn(async () => refundRows);
const updateReturning = vi.fn(async () => refundRows);

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => selectChain(),
    insert: () => ({
      values: () => ({ returning: insertReturning }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({ returning: updateReturning }),
      }),
    }),
  },
}));

vi.mock("@/lib/db/schema/subscriptions", () => ({
  paymentAttempts: "payment_attempts_table",
  refunds: "refunds_table",
  accountSubscriptions: "account_subscriptions_table",
}));

// Paddle client mock — controllable per-test.
const createAdjustmentMock = vi.fn<(...args: unknown[]) => unknown>();
vi.mock("@/lib/billing/providers/paddle", () => ({
  createPaddleAdjustment: (...args: unknown[]) => createAdjustmentMock(...args),
  mapPaddleAdjustmentStatus: (status: string) => {
    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";
    if (status === "reversed") return "reversed";
    return "pending_approval";
  },
}));

const cancelSubscriptionMock = vi.fn<(...args: unknown[]) => unknown>(async () => null);
const getAccountSubscriptionMock = vi.fn<(...args: unknown[]) => unknown>(async () => null);
vi.mock("@/lib/billing/subscription-service", () => ({
  cancelSubscription: (...args: unknown[]) => cancelSubscriptionMock(...args),
  getAccountSubscription: (...args: unknown[]) =>
    getAccountSubscriptionMock(...args),
}));

// drizzle-orm exports used inside refunds.ts (we don't care what the operators
// do, just that they're callable).
vi.mock("drizzle-orm", () => ({
  eq: (...args: unknown[]) => ({ op: "eq", args }),
  desc: (...args: unknown[]) => ({ op: "desc", args }),
  inArray: (...args: unknown[]) => ({ op: "inArray", args }),
}));

import {
  applyRefundStatusFromAdjustment,
  checkRefundEligibility,
  refundWindowDays,
  requestRefundForPayment,
} from "@/lib/billing/refunds";

function makePayment(overrides: Partial<MockRow> = {}) {
  return {
    id: "pay_123",
    userId: "user_123",
    businessId: "biz_123",
    plan: "pro",
    provider: "paddle",
    providerPaymentId: "txn_123",
    amount: 10_00,
    currency: "USD",
    status: "succeeded",
    createdAt: new Date(),
    ...overrides,
  } as MockRow;
}

describe("lib/billing/refunds: checkRefundEligibility", () => {
  beforeEach(() => {
    paymentAttemptRows.length = 0;
    refundRows.length = 0;
    accountSubscriptionRows.length = 0;
    insertReturning.mockReset();
    updateReturning.mockReset();
    createAdjustmentMock.mockReset();
    cancelSubscriptionMock.mockReset();
    getAccountSubscriptionMock.mockReset();
  });

  it("accepts a fresh completed paddle payment with no prior refunds", async () => {
    const result = await checkRefundEligibility(
      makePayment() as Parameters<typeof checkRefundEligibility>[0],
    );
    expect(result.eligible).toBe(true);
  });

  it("rejects a non-completed payment", async () => {
    const result = await checkRefundEligibility(
      makePayment({ status: "pending" }) as Parameters<
        typeof checkRefundEligibility
      >[0],
    );
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("not_completed");
    }
  });

  it("rejects payments outside the refund window", async () => {
    const old = new Date(
      Date.now() - (refundWindowDays + 1) * 24 * 60 * 60 * 1000,
    );
    const result = await checkRefundEligibility(
      makePayment({ createdAt: old }) as Parameters<
        typeof checkRefundEligibility
      >[0],
    );
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("outside_window");
    }
  });

  it("rejects duplicate refund requests", async () => {
    refundRows.push({
      id: "ref_1",
      paymentAttemptId: "pay_123",
      status: "pending_approval",
    });
    const result = await checkRefundEligibility(
      makePayment() as Parameters<typeof checkRefundEligibility>[0],
    );
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("refund_in_progress");
    }
  });

  it("flags already-refunded payments as already_refunded", async () => {
    refundRows.push({
      id: "ref_1",
      paymentAttemptId: "pay_123",
      status: "approved",
    });
    const result = await checkRefundEligibility(
      makePayment() as Parameters<typeof checkRefundEligibility>[0],
    );
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("already_refunded");
    }
  });
});

describe("lib/billing/refunds: requestRefundForPayment", () => {
  beforeEach(() => {
    paymentAttemptRows.length = 0;
    refundRows.length = 0;
    accountSubscriptionRows.length = 0;
    insertReturning.mockReset();
    updateReturning.mockReset();
    createAdjustmentMock.mockReset();
    cancelSubscriptionMock.mockReset();
    getAccountSubscriptionMock.mockReset();
    getAccountSubscriptionMock.mockResolvedValue(null);
  });

  it("rejects requests when the payment does not belong to the user", async () => {
    paymentAttemptRows.push(makePayment({ userId: "someone_else" }));
    const result = await requestRefundForPayment({
      paymentAttemptId: "pay_123",
      userId: "user_123",
      reason: "cx change of mind",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_yours");
    }
    expect(createAdjustmentMock).not.toHaveBeenCalled();
  });

  it("rejects ineligible payments before calling Paddle", async () => {
    paymentAttemptRows.push(
      makePayment({
        createdAt: new Date(
          Date.now() - (refundWindowDays + 10) * 24 * 60 * 60 * 1000,
        ),
      }),
    );
    const result = await requestRefundForPayment({
      paymentAttemptId: "pay_123",
      userId: "user_123",
      reason: "too late",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("outside_window");
    }
    expect(createAdjustmentMock).not.toHaveBeenCalled();
  });

  it("blocks duplicate refund requests before calling Paddle", async () => {
    paymentAttemptRows.push(makePayment());
    refundRows.push({
      id: "ref_1",
      paymentAttemptId: "pay_123",
      status: "pending_approval",
    });

    const result = await requestRefundForPayment({
      paymentAttemptId: "pay_123",
      userId: "user_123",
      reason: "dup",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("refund_in_progress");
    }
    expect(createAdjustmentMock).not.toHaveBeenCalled();
  });

  it("creates a Paddle adjustment and records a refund row", async () => {
    paymentAttemptRows.push(makePayment());
    createAdjustmentMock.mockResolvedValue({
      type: "ok",
      adjustmentId: "adj_123",
      status: "pending_approval",
    });
    insertReturning.mockResolvedValue([
      {
        id: "ref_999",
        userId: "user_123",
        paymentAttemptId: "pay_123",
        status: "pending_approval",
        providerAdjustmentId: "adj_123",
      },
    ]);

    const result = await requestRefundForPayment({
      paymentAttemptId: "pay_123",
      userId: "user_123",
      reason: "cx change of mind",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.refund.status).toBe("pending_approval");
      expect(result.refund.providerAdjustmentId).toBe("adj_123");
    }
    expect(createAdjustmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "txn_123",
        reason: "cx change of mind",
      }),
    );
    expect(cancelSubscriptionMock).not.toHaveBeenCalled();
  });

  it("propagates Paddle errors without writing a refund row", async () => {
    paymentAttemptRows.push(makePayment());
    createAdjustmentMock.mockResolvedValue({
      type: "error",
      message: "Paddle 500",
    });

    const result = await requestRefundForPayment({
      paymentAttemptId: "pay_123",
      userId: "user_123",
      reason: "retry me",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("provider_error");
    }
    expect(insertReturning).not.toHaveBeenCalled();
  });

  it("cancels the user's subscription when Paddle immediately approves", async () => {
    paymentAttemptRows.push(makePayment());
    createAdjustmentMock.mockResolvedValue({
      type: "ok",
      adjustmentId: "adj_inst",
      status: "approved",
    });
    insertReturning.mockResolvedValue([
      { id: "ref_inst", status: "approved" },
    ]);
    getAccountSubscriptionMock.mockResolvedValue({
      id: "sub_1",
      userId: "user_123",
      status: "active",
      plan: "pro",
    });

    const result = await requestRefundForPayment({
      paymentAttemptId: "pay_123",
      userId: "user_123",
      reason: "instant approve",
    });

    expect(result.ok).toBe(true);
    expect(cancelSubscriptionMock).toHaveBeenCalledWith("user_123");
  });
});

describe("lib/billing/refunds: applyRefundStatusFromAdjustment", () => {
  beforeEach(() => {
    refundRows.length = 0;
    updateReturning.mockReset();
    cancelSubscriptionMock.mockReset();
    getAccountSubscriptionMock.mockReset();
    getAccountSubscriptionMock.mockResolvedValue({
      id: "sub_1",
      userId: "user_123",
      status: "active",
      plan: "pro",
    });
  });

  it("returns null when no refund exists for the adjustment", async () => {
    const result = await applyRefundStatusFromAdjustment({
      providerAdjustmentId: "adj_missing",
      paddleStatus: "approved",
    });
    expect(result).toBeNull();
  });

  it("updates the refund status and cancels subscription on approval", async () => {
    refundRows.push({
      id: "ref_1",
      userId: "user_123",
      paymentAttemptId: "pay_123",
      providerAdjustmentId: "adj_1",
      status: "pending_approval",
    });
    updateReturning.mockResolvedValue([
      {
        id: "ref_1",
        userId: "user_123",
        status: "approved",
        providerAdjustmentId: "adj_1",
      },
    ]);

    const result = await applyRefundStatusFromAdjustment({
      providerAdjustmentId: "adj_1",
      paddleStatus: "approved",
    });

    expect(result?.status).toBe("approved");
    expect(cancelSubscriptionMock).toHaveBeenCalledWith("user_123");
  });

  it("marks the refund as rejected without touching the subscription", async () => {
    refundRows.push({
      id: "ref_2",
      userId: "user_123",
      paymentAttemptId: "pay_123",
      providerAdjustmentId: "adj_2",
      status: "pending_approval",
    });
    updateReturning.mockResolvedValue([
      {
        id: "ref_2",
        userId: "user_123",
        status: "rejected",
        providerAdjustmentId: "adj_2",
      },
    ]);

    const result = await applyRefundStatusFromAdjustment({
      providerAdjustmentId: "adj_2",
      paddleStatus: "rejected",
    });

    expect(result?.status).toBe("rejected");
    expect(cancelSubscriptionMock).not.toHaveBeenCalled();
  });

  it("is idempotent when the status is unchanged", async () => {
    refundRows.push({
      id: "ref_3",
      userId: "user_123",
      paymentAttemptId: "pay_123",
      providerAdjustmentId: "adj_3",
      status: "approved",
    });

    const result = await applyRefundStatusFromAdjustment({
      providerAdjustmentId: "adj_3",
      paddleStatus: "approved",
    });

    expect(result?.id).toBe("ref_3");
    expect(updateReturning).not.toHaveBeenCalled();
    expect(cancelSubscriptionMock).not.toHaveBeenCalled();
  });
});
