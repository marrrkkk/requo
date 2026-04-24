import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  revalidatePathMock,
  requireUserMock,
  getWorkspaceContextForUserMock,
  createPendingSubscriptionMock,
  getWorkspaceSubscriptionMock,
  cancelSubscriptionMock,
  updateSubscriptionStatusMock,
  recordPaymentAttemptMock,
  updatePaymentAttemptStatusMock,
  createQrPhCheckoutMock,
  getPaymentIntentMock,
  getPaymentIntentQrDataMock,
  cancelPaymentIntentMock,
  createPaddleTransactionMock,
  getPaddleTransactionMock,
  cancelPaddleSubscriptionMock,
  dbSelectOrderByMock,
  dbSelectMock,
  dbSelectFromMock,
  dbSelectWhereMock,
  dbSelectLimitMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  requireUserMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  createPendingSubscriptionMock: vi.fn(),
  getWorkspaceSubscriptionMock: vi.fn(),
  cancelSubscriptionMock: vi.fn(),
  updateSubscriptionStatusMock: vi.fn(),
  recordPaymentAttemptMock: vi.fn(),
  updatePaymentAttemptStatusMock: vi.fn(),
  createQrPhCheckoutMock: vi.fn(),
  getPaymentIntentMock: vi.fn(),
  getPaymentIntentQrDataMock: vi.fn(),
  cancelPaymentIntentMock: vi.fn(),
  createPaddleTransactionMock: vi.fn(),
  getPaddleTransactionMock: vi.fn(),
  cancelPaddleSubscriptionMock: vi.fn(),
  dbSelectOrderByMock: vi.fn(),
  dbSelectLimitMock: vi.fn(),
  dbSelectWhereMock: vi.fn(),
  dbSelectFromMock: vi.fn(),
  dbSelectMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/lib/db/workspace-access", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

vi.mock("@/lib/env", () => ({
  isPayMongoConfigured: true,
  isPaddleConfigured: true,
}));

vi.mock("@/lib/billing/subscription-service", () => ({
  createPendingSubscription: createPendingSubscriptionMock,
  getWorkspaceSubscription: getWorkspaceSubscriptionMock,
  cancelSubscription: cancelSubscriptionMock,
  updateSubscriptionStatus: updateSubscriptionStatusMock,
}));

vi.mock("@/lib/billing/webhook-processor", () => ({
  recordPaymentAttempt: recordPaymentAttemptMock,
  updatePaymentAttemptStatus: updatePaymentAttemptStatusMock,
}));

vi.mock("@/lib/billing/providers/paymongo", () => ({
  createQrPhCheckout: createQrPhCheckoutMock,
  getPaymentIntent: getPaymentIntentMock,
  getPaymentIntentQrData: getPaymentIntentQrDataMock,
  cancelPaymentIntent: cancelPaymentIntentMock,
}));

vi.mock("@/lib/billing/providers/paddle", () => ({
  createPaddleTransaction: createPaddleTransactionMock,
  getPaddleTransaction: getPaddleTransactionMock,
  cancelPaddleSubscription: cancelPaddleSubscriptionMock,
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock("@/lib/db/schema/subscriptions", () => ({
  paymentAttempts: {
    id: "id",
    provider: "provider",
    providerPaymentId: "providerPaymentId",
    status: "status",
    workspaceId: "workspaceId",
  },
}));

import {
  cancelPendingQrCheckoutAction,
  cancelSubscriptionAction,
  createCheckoutAction,
  getCheckoutStatusAction,
} from "@/features/billing/actions";

describe("billing actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectWhereMock.mockReturnValue({
      limit: dbSelectLimitMock,
      orderBy: dbSelectOrderByMock,
    });
    dbSelectOrderByMock.mockReturnValue({
      limit: dbSelectLimitMock,
    });
    dbSelectFromMock.mockReturnValue({
      where: dbSelectWhereMock,
    });
    dbSelectMock.mockReturnValue({
      from: dbSelectFromMock,
    });

    requireUserMock.mockResolvedValue({
      id: "user_123",
      email: "owner@example.com",
      name: "Owner Example",
    });
    getWorkspaceContextForUserMock.mockResolvedValue({
      id: "workspace_123",
      slug: "workspace-123",
      plan: "free",
      memberRole: "owner",
    });
    createQrPhCheckoutMock.mockResolvedValue({
      type: "qrph",
      qrCodeData: "000201010212",
      paymentIntentId: "pi_123",
      expiresAt: "2099-12-31T00:00:00.000Z",
      amount: 249900,
    });
    createPaddleTransactionMock.mockResolvedValue({
      type: "redirect",
      url: "txn_123",
    });
    getPaymentIntentMock.mockResolvedValue(null);
    getPaymentIntentQrDataMock.mockResolvedValue(null);
    getPaddleTransactionMock.mockResolvedValue(null);
    cancelPaddleSubscriptionMock.mockResolvedValue(true);
    cancelPaymentIntentMock.mockResolvedValue({
      ok: true,
      status: "canceled",
    });
    dbSelectLimitMock.mockResolvedValue([]);
    getWorkspaceSubscriptionMock.mockResolvedValue(null);
  });

  it("routes USD checkout requests to Paddle for workspace owners", async () => {
    const formData = new FormData();
    formData.set("workspaceId", "workspace_123");
    formData.set("plan", "pro");
    formData.set("currency", "USD");

    const result = await createCheckoutAction({}, formData);

    expect(result).toEqual({ paddleTransactionId: "txn_123" });
    expect(createPaddleTransactionMock).toHaveBeenCalledWith({
      plan: "pro",
      workspaceId: "workspace_123",
      userEmail: "owner@example.com",
      userName: "Owner Example",
      interval: "monthly",
    });
    expect(createQrPhCheckoutMock).not.toHaveBeenCalled();
  });

  it("creates pending PayMongo state only after a valid QR checkout response", async () => {
    const formData = new FormData();
    formData.set("workspaceId", "workspace_123");
    formData.set("plan", "business");
    formData.set("currency", "PHP");
    formData.set("interval", "yearly");

    const result = await createCheckoutAction({}, formData);

    expect(result).toEqual({
      qrData: {
        qrCodeData: "000201010212",
        paymentIntentId: "pi_123",
        expiresAt: "2099-12-31T00:00:00.000Z",
        amount: 249900,
        currency: "PHP",
      },
    });
    expect(createQrPhCheckoutMock).toHaveBeenCalledWith({
      plan: "business",
      workspaceId: "workspace_123",
      interval: "yearly",
    });
    expect(createPendingSubscriptionMock).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
      plan: "business",
      provider: "paymongo",
      currency: "PHP",
    });
    expect(recordPaymentAttemptMock).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
      plan: "business",
      provider: "paymongo",
      providerPaymentId: "pi_123",
      amount: 249900,
      currency: "PHP",
      status: "pending",
    });
  });

  it("reuses an existing pending PayMongo checkout instead of creating a new QR code", async () => {
    getWorkspaceSubscriptionMock.mockResolvedValue({
      status: "pending",
      billingProvider: "paymongo",
    });
    dbSelectLimitMock.mockResolvedValue([
      {
        providerPaymentId: "pi_existing",
      },
    ]);
    getPaymentIntentMock.mockResolvedValue({
      id: "pi_existing",
      attributes: {
        amount: 249900,
        created_at: 4102444800,
        status: "awaiting_next_action",
        next_action: {
          code: {
            test_url: "000201010299",
          },
          type: "consume_qr",
        },
      },
    });

    const formData = new FormData();
    formData.set("workspaceId", "workspace_123");
    formData.set("plan", "pro");
    formData.set("currency", "PHP");

    const result = await createCheckoutAction({}, formData);

    expect(result).toEqual({
      qrData: {
        amount: 249900,
        currency: "PHP",
        expiresAt: "2100-01-01T00:30:00.000Z",
        paymentIntentId: "pi_existing",
        qrCodeData: "000201010299",
      },
    });
    expect(createQrPhCheckoutMock).not.toHaveBeenCalled();
    expect(createPendingSubscriptionMock).not.toHaveBeenCalled();
  });

  it("creates a fresh Paddle transaction instead of resuming pending card checkout", async () => {
    dbSelectLimitMock.mockResolvedValue([
      {
        plan: "pro",
        providerPaymentId: "txn_existing",
      },
    ]);
    getPaddleTransactionMock.mockResolvedValue({
      custom_data: {
        interval: "monthly",
      },
      details: {
        totals: {
          total: "2900",
        },
      },
      id: "txn_existing",
      status: "ready",
    });

    const formData = new FormData();
    formData.set("workspaceId", "workspace_123");
    formData.set("plan", "pro");
    formData.set("currency", "USD");

    const result = await createCheckoutAction({}, formData);

    expect(result).toEqual({ paddleTransactionId: "txn_123" });
    expect(getPaddleTransactionMock).not.toHaveBeenCalled();
    expect(createPaddleTransactionMock).toHaveBeenCalledWith({
      plan: "pro",
      workspaceId: "workspace_123",
      userEmail: "owner@example.com",
      userName: "Owner Example",
      interval: "monthly",
    });
  });

  it("returns the current subscription and payment attempt status for checkout sync", async () => {
    getWorkspaceSubscriptionMock.mockResolvedValue({
      plan: "pro",
      status: "active",
    });
    dbSelectLimitMock.mockResolvedValue([
      {
        providerPaymentId: "pi_123",
        status: "succeeded",
      },
    ]);

    const result = await getCheckoutStatusAction("workspace_123", "pi_123");

    expect(result).toEqual({
      subscription: {
        plan: "pro",
        status: "active",
      },
      paymentAttempt: {
        providerPaymentId: "pi_123",
        status: "succeeded",
      },
    });
  });

  it("cancels pending PayMongo subscriptions locally and revalidates the workspace page", async () => {
    getWorkspaceSubscriptionMock.mockResolvedValue({
      status: "pending",
      billingProvider: "paymongo",
      providerSubscriptionId: null,
    });

    const formData = new FormData();
    formData.set("workspaceId", "workspace_123");

    const result = await cancelSubscriptionAction({}, formData);

    expect(cancelSubscriptionMock).toHaveBeenCalledWith("workspace_123");
    expect(result).toEqual({
      success: "Pending payment canceled.",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/workspaces/workspace-123");
    expect(cancelPaddleSubscriptionMock).not.toHaveBeenCalled();
  });

  it("cancels pending QR Ph checkout state when the modal is closed", async () => {
    getWorkspaceSubscriptionMock.mockResolvedValue({
      status: "pending",
      billingProvider: "paymongo",
      providerSubscriptionId: null,
    });
    dbSelectLimitMock.mockResolvedValue([{ id: "pay_123" }]);

    const result = await cancelPendingQrCheckoutAction(
      "workspace_123",
      "pi_123",
    );

    expect(result).toEqual({
      ok: true,
      outcome: "canceled",
    });
    expect(cancelPaymentIntentMock).toHaveBeenCalledWith("pi_123");
    expect(updatePaymentAttemptStatusMock).toHaveBeenCalledWith(
      "pi_123",
      "expired",
    );
    expect(updateSubscriptionStatusMock).toHaveBeenCalledWith(
      "workspace_123",
      "incomplete",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/workspaces/workspace-123");
  });

  it("returns already_paid when PayMongo confirms the QR checkout was already completed", async () => {
    getWorkspaceSubscriptionMock.mockResolvedValue({
      status: "pending",
      billingProvider: "paymongo",
      providerSubscriptionId: null,
    });
    dbSelectLimitMock.mockResolvedValue([{ id: "pay_123" }]);
    cancelPaymentIntentMock.mockResolvedValue({
      ok: true,
      status: "active",
    });

    const result = await cancelPendingQrCheckoutAction(
      "workspace_123",
      "pi_123",
    );

    expect(result).toEqual({
      ok: true,
      outcome: "already_paid",
    });
    expect(updatePaymentAttemptStatusMock).not.toHaveBeenCalled();
    expect(updateSubscriptionStatusMock).not.toHaveBeenCalledWith(
      "workspace_123",
      "incomplete",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/workspaces/workspace-123");
  });

  it("falls back to local cleanup when PayMongo cancel does not succeed", async () => {
    getWorkspaceSubscriptionMock.mockResolvedValue({
      status: "pending",
      billingProvider: "paymongo",
      providerSubscriptionId: null,
    });
    dbSelectLimitMock.mockResolvedValue([{ id: "pay_123" }]);
    cancelPaymentIntentMock.mockResolvedValue({
      ok: false,
      message: "PayMongo did not confirm the cancellation yet.",
    });

    const result = await cancelPendingQrCheckoutAction(
      "workspace_123",
      "pi_123",
    );

    expect(result).toEqual({
      ok: true,
      outcome: "canceled",
    });
    expect(updatePaymentAttemptStatusMock).toHaveBeenCalledWith(
      "pi_123",
      "expired",
    );
    expect(updateSubscriptionStatusMock).toHaveBeenCalledWith(
      "workspace_123",
      "incomplete",
    );
  });
});
