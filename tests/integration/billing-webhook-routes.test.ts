import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyPaddleWebhookSignatureMock,
  verifyPayMongoWebhookSignatureMock,
  mapPaddleStatusMock,
  recordWebhookEventMock,
  markEventProcessedMock,
  recordPaymentAttemptMock,
  updatePaymentAttemptStatusMock,
  activateSubscriptionMock,
  getWorkspaceSubscriptionMock,
  updateSubscriptionStatusMock,
  expireSubscriptionMock,
  finalizeScheduledWorkspaceDeletionIfDueMock,
  dbSelectOrderByMock,
  dbSelectWhereMock,
  dbSelectFromMock,
  dbSelectMock,
  dbSelectLimitMock,
  dbUpdateWhereMock,
  dbUpdateSetMock,
  dbUpdateMock,
} = vi.hoisted(() => ({
  verifyPaddleWebhookSignatureMock: vi.fn(),
  verifyPayMongoWebhookSignatureMock: vi.fn(),
  mapPaddleStatusMock: vi.fn(),
  recordWebhookEventMock: vi.fn(),
  markEventProcessedMock: vi.fn(),
  recordPaymentAttemptMock: vi.fn(),
  updatePaymentAttemptStatusMock: vi.fn(),
  activateSubscriptionMock: vi.fn(),
  getWorkspaceSubscriptionMock: vi.fn(),
  updateSubscriptionStatusMock: vi.fn(),
  expireSubscriptionMock: vi.fn(),
  finalizeScheduledWorkspaceDeletionIfDueMock: vi.fn(),
  dbSelectOrderByMock: vi.fn(),
  dbSelectWhereMock: vi.fn(),
  dbSelectFromMock: vi.fn(),
  dbSelectMock: vi.fn(),
  dbSelectLimitMock: vi.fn(),
  dbUpdateWhereMock: vi.fn(),
  dbUpdateSetMock: vi.fn(),
  dbUpdateMock: vi.fn(),
}));

vi.mock("@/lib/billing/providers/paddle", () => ({
  verifyPaddleWebhookSignature: verifyPaddleWebhookSignatureMock,
  mapPaddleStatus: mapPaddleStatusMock,
}));

vi.mock("@/lib/billing/providers/paymongo", () => ({
  verifyPayMongoWebhookSignature: verifyPayMongoWebhookSignatureMock,
}));

vi.mock("@/lib/billing/webhook-processor", () => ({
  markEventProcessed: markEventProcessedMock,
  recordPaymentAttempt: recordPaymentAttemptMock,
  recordWebhookEvent: recordWebhookEventMock,
  updatePaymentAttemptStatus: updatePaymentAttemptStatusMock,
}));

vi.mock("@/lib/billing/subscription-service", () => ({
  activateSubscription: activateSubscriptionMock,
  expireSubscription: expireSubscriptionMock,
  getWorkspaceSubscription: getWorkspaceSubscriptionMock,
  updateSubscriptionStatus: updateSubscriptionStatusMock,
}));

vi.mock("@/features/workspaces/mutations", () => ({
  finalizeScheduledWorkspaceDeletionIfDue:
    finalizeScheduledWorkspaceDeletionIfDueMock,
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: dbSelectMock,
    update: dbUpdateMock,
  },
}));

vi.mock("@/lib/db/schema/subscriptions", () => ({
  paymentAttempts: {
    amount: "amount",
    createdAt: "createdAt",
    currency: "currency",
    plan: "plan",
    provider: "provider",
    providerPaymentId: "providerPaymentId",
    status: "status",
    workspaceId: "workspaceId",
  },
}));

import { POST as postPaddleWebhook } from "@/app/api/billing/paddle/webhook/route";
import { POST as postPaymongoWebhook } from "@/app/api/billing/paymongo/webhook/route";

describe("billing webhook routes", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    verifyPaddleWebhookSignatureMock.mockReturnValue(true);
    verifyPayMongoWebhookSignatureMock.mockReturnValue(true);
    mapPaddleStatusMock.mockReturnValue("active");
    getWorkspaceSubscriptionMock.mockResolvedValue(null);
    finalizeScheduledWorkspaceDeletionIfDueMock.mockResolvedValue({
      deleted: false,
    });
    recordWebhookEventMock.mockResolvedValue({
      eventId: "stored_evt_123",
      isNew: true,
    });
    updatePaymentAttemptStatusMock.mockResolvedValue(true);
    dbSelectWhereMock.mockReturnValue({
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
    dbSelectLimitMock.mockResolvedValue([]);
    dbUpdateSetMock.mockReturnValue({
      where: dbUpdateWhereMock,
    });
    dbUpdateMock.mockReturnValue({
      set: dbUpdateSetMock,
    });
    dbUpdateWhereMock.mockResolvedValue([]);
  });

  it("rejects Paddle webhook requests with an invalid signature", async () => {
    verifyPaddleWebhookSignatureMock.mockReturnValue(false);

    const response = await postPaddleWebhook(
      new Request("http://localhost/api/billing/paddle/webhook", {
        method: "POST",
        body: JSON.stringify({ event_type: "subscription.created" }),
        headers: {
          "content-type": "application/json",
          "paddle-signature": "bad-signature",
        },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid signature",
    });
    expect(recordWebhookEventMock).not.toHaveBeenCalled();
  });

  it("activates a subscription for a new Paddle subscription.created event", async () => {
    const response = await postPaddleWebhook(
      new Request("http://localhost/api/billing/paddle/webhook", {
        method: "POST",
        body: JSON.stringify({
          event_id: "evt_123",
          event_type: "subscription.created",
          data: {
            id: "sub_123",
            status: "active",
            customer_id: "cus_123",
            custom_data: {
              workspace_id: "workspace_123",
              plan: "pro",
            },
            current_billing_period: {
              starts_at: "2026-04-01T00:00:00.000Z",
              ends_at: "2026-05-01T00:00:00.000Z",
            },
          },
        }),
        headers: {
          "content-type": "application/json",
          "paddle-signature": "good-signature",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "OK" });
    expect(recordWebhookEventMock).toHaveBeenCalledWith({
      providerEventId: "evt_123",
      provider: "paddle",
      eventType: "subscription.created",
      payload: expect.any(Object),
      workspaceId: "workspace_123",
    });
    expect(activateSubscriptionMock).toHaveBeenCalledWith({
      currency: "USD",
      currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
      currentPeriodStart: new Date("2026-04-01T00:00:00.000Z"),
      plan: "pro",
      provider: "paddle",
      providerCustomerId: "cus_123",
      providerSubscriptionId: "sub_123",
      status: "active",
      workspaceId: "workspace_123",
    });
    expect(markEventProcessedMock).toHaveBeenCalledWith("stored_evt_123");
  });

  it("returns early for already-processed Paddle events", async () => {
    recordWebhookEventMock.mockResolvedValue({
      eventId: "stored_evt_123",
      isNew: false,
    });

    const response = await postPaddleWebhook(
      new Request("http://localhost/api/billing/paddle/webhook", {
        method: "POST",
        body: JSON.stringify({
          event_id: "evt_123",
          event_type: "transaction.completed",
          data: {
            id: "txn_123",
          },
        }),
        headers: {
          "content-type": "application/json",
          "paddle-signature": "good-signature",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Event already processed",
    });
    expect(recordPaymentAttemptMock).not.toHaveBeenCalled();
    expect(markEventProcessedMock).not.toHaveBeenCalled();
  });

  it("marks the existing Paddle payment attempt as succeeded on transaction.completed", async () => {
    const response = await postPaddleWebhook(
      new Request("http://localhost/api/billing/paddle/webhook", {
        method: "POST",
        body: JSON.stringify({
          event_id: "evt_456",
          event_type: "transaction.completed",
          data: {
            id: "txn_123",
            currency_code: "USD",
            custom_data: {
              workspace_id: "workspace_123",
              plan: "pro",
            },
            details: {
              totals: {
                total: "2900",
              },
            },
          },
        }),
        headers: {
          "content-type": "application/json",
          "paddle-signature": "good-signature",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(updatePaymentAttemptStatusMock).toHaveBeenCalledWith(
      "txn_123",
      "succeeded",
    );
    expect(recordPaymentAttemptMock).not.toHaveBeenCalled();
  });

  it("marks the existing Paddle payment attempt as failed on transaction.payment_failed", async () => {
    const response = await postPaddleWebhook(
      new Request("http://localhost/api/billing/paddle/webhook", {
        method: "POST",
        body: JSON.stringify({
          event_id: "evt_789",
          event_type: "transaction.payment_failed",
          data: {
            id: "txn_123",
            custom_data: {
              workspace_id: "workspace_123",
              plan: "pro",
            },
          },
        }),
        headers: {
          "content-type": "application/json",
          "paddle-signature": "good-signature",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(updatePaymentAttemptStatusMock).toHaveBeenCalledWith(
      "txn_123",
      "failed",
    );
    expect(recordPaymentAttemptMock).not.toHaveBeenCalled();
  });

  it("marks the existing PayMongo payment intent attempt as succeeded on payment.paid", async () => {
    dbSelectLimitMock.mockResolvedValueOnce([
      {
        plan: "pro",
        workspaceId: "workspace_123",
      },
    ]);

    const response = await postPaymongoWebhook(
      new Request("http://localhost/api/billing/paymongo/webhook", {
        method: "POST",
        body: JSON.stringify({
          data: {
            id: "evt_paymongo_123",
            attributes: {
              type: "payment.paid",
              data: {
                id: "pay_123",
                attributes: {
                  amount: 249900,
                  payment_intent_id: "pi_123",
                },
              },
            },
          },
        }),
        headers: {
          "content-type": "application/json",
          "paymongo-signature": "good-signature",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(updatePaymentAttemptStatusMock).toHaveBeenCalledWith(
      "pi_123",
      "succeeded",
    );
    expect(activateSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        provider: "paymongo",
        providerCheckoutId: "pay_123",
        workspaceId: "workspace_123",
      }),
    );
  });

  it("grants one year of access for a yearly PayMongo QRPh payment", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T00:00:00.000Z"));
    dbSelectLimitMock.mockResolvedValueOnce([
      {
        amount: 299000,
        plan: "pro",
        workspaceId: "workspace_123",
      },
    ]);

    const response = await postPaymongoWebhook(
      new Request("http://localhost/api/billing/paymongo/webhook", {
        method: "POST",
        body: JSON.stringify({
          data: {
            id: "evt_paymongo_yearly",
            attributes: {
              type: "payment.paid",
              data: {
                id: "pay_yearly",
                attributes: {
                  amount: 299000,
                  payment_intent_id: "pi_yearly",
                },
              },
            },
          },
        }),
        headers: {
          "content-type": "application/json",
          "paymongo-signature": "good-signature",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(activateSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPeriodEnd: new Date("2027-05-06T00:00:00.000Z"),
        currentPeriodStart: new Date("2026-05-06T00:00:00.000Z"),
        plan: "pro",
        provider: "paymongo",
        providerCheckoutId: "pay_yearly",
        workspaceId: "workspace_123",
      }),
    );
  });

  it("marks the existing PayMongo payment intent attempt as expired on qrph.expired", async () => {
    dbSelectLimitMock.mockResolvedValueOnce([
      {
        plan: "pro",
        workspaceId: "workspace_123",
      },
    ]);
    getWorkspaceSubscriptionMock.mockResolvedValue({
      status: "pending",
    });

    const response = await postPaymongoWebhook(
      new Request("http://localhost/api/billing/paymongo/webhook", {
        method: "POST",
        body: JSON.stringify({
          data: {
            id: "evt_paymongo_456",
            attributes: {
              type: "qrph.expired",
              data: {
                id: "src_123",
                attributes: {
                  payment_intent_id: "pi_123",
                },
              },
            },
          },
        }),
        headers: {
          "content-type": "application/json",
          "paymongo-signature": "good-signature",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(updatePaymentAttemptStatusMock).toHaveBeenCalledWith(
      "pi_123",
      "expired",
    );
    expect(updateSubscriptionStatusMock).toHaveBeenCalledWith(
      "workspace_123",
      "expired",
    );
  });
});
