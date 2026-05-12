import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserMock,
  getBusinessContextForUserMock,
  getAccountSubscriptionMock,
  recordPaymentAttemptMock,
  createPaddleTransactionMock,
} = vi.hoisted(() => ({
  createPaddleTransactionMock: vi.fn(),
  getAccountSubscriptionMock: vi.fn(),
  getBusinessContextForUserMock: vi.fn(),
  recordPaymentAttemptMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/lib/db/business-access", () => ({
  getBusinessContextForUser: getBusinessContextForUserMock,
}));

vi.mock("@/lib/billing/subscription-service", () => ({
  getAccountSubscription: getAccountSubscriptionMock,
  resolveEffectivePlanFromSubscription: () => "free",
}));

vi.mock("@/lib/billing/webhook-processor", () => ({
  recordPaymentAttempt: recordPaymentAttemptMock,
}));

vi.mock("@/lib/billing/providers/paddle", () => ({
  createPaddleTransaction: createPaddleTransactionMock,
  cancelPaddleSubscription: vi.fn(async () => true),
}));

vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgres://example",
  },
  isPaddleConfigured: true,
}));

import { createCheckoutAction } from "@/features/billing/actions";

describe("billing actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({
      id: "user_123",
      email: "owner@example.com",
      name: "Owner Example",
    });
    getBusinessContextForUserMock.mockResolvedValue({
      role: "owner",
      business: { id: "business_123", slug: "demo", plan: "free" },
    });
    getAccountSubscriptionMock.mockResolvedValue(null);
    createPaddleTransactionMock.mockResolvedValue({
      type: "redirect",
      url: "txn_123",
    });
  });

  it("rejects non-USD checkout", async () => {
    const formData = new FormData();
    formData.set("businessId", "business_123");
    formData.set("plan", "pro");
    formData.set("currency", "PHP");

    const result = await createCheckoutAction({}, formData);
    expect(result.error).toMatch(/USD/);
  });

  it("creates paddle checkout for USD", async () => {
    const formData = new FormData();
    formData.set("businessId", "business_123");
    formData.set("plan", "pro");
    formData.set("currency", "USD");
    formData.set("interval", "monthly");

    const result = await createCheckoutAction({}, formData);

    expect(createPaddleTransactionMock).toHaveBeenCalled();
    expect(recordPaymentAttemptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: "USD",
        provider: "paddle",
      }),
    );
    expect(result.paddleTransactionId).toBe("txn_123");
  });
});
