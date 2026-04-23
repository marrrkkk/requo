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
  cancelPaymentIntentMock,
  createPaddleTransactionMock,
  cancelPaddleSubscriptionMock,
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
  cancelPaymentIntentMock: vi.fn(),
  createPaddleTransactionMock: vi.fn(),
  cancelPaddleSubscriptionMock: vi.fn(),
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
  cancelPaymentIntent: cancelPaymentIntentMock,
}));

vi.mock("@/lib/billing/providers/paddle", () => ({
  createPaddleTransaction: createPaddleTransactionMock,
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
} from "@/features/billing/actions";

describe("billing actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectWhereMock.mockReturnValue({
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
    cancelPaddleSubscriptionMock.mockResolvedValue(true);
    cancelPaymentIntentMock.mockResolvedValue({
      ok: true,
      status: "canceled",
    });
    dbSelectLimitMock.mockResolvedValue([{ id: "pay_123" }]);
    getWorkspaceSubscriptionMock.mockResolvedValue({
      status: "pending",
      billingProvider: "paymongo",
      providerSubscriptionId: null,
    });
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

  it("cancels pending PayMongo subscriptions locally and revalidates the workspace page", async () => {
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
