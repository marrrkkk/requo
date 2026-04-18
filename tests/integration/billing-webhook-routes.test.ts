import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyPaddleWebhookSignatureMock,
  mapPaddleStatusMock,
  recordWebhookEventMock,
  markEventProcessedMock,
  recordPaymentAttemptMock,
  activateSubscriptionMock,
  updateSubscriptionStatusMock,
  expireSubscriptionMock,
} = vi.hoisted(() => ({
  verifyPaddleWebhookSignatureMock: vi.fn(),
  mapPaddleStatusMock: vi.fn(),
  recordWebhookEventMock: vi.fn(),
  markEventProcessedMock: vi.fn(),
  recordPaymentAttemptMock: vi.fn(),
  activateSubscriptionMock: vi.fn(),
  updateSubscriptionStatusMock: vi.fn(),
  expireSubscriptionMock: vi.fn(),
}));

vi.mock("@/lib/billing/providers/paddle", () => ({
  verifyPaddleWebhookSignature: verifyPaddleWebhookSignatureMock,
  mapPaddleStatus: mapPaddleStatusMock,
}));

vi.mock("@/lib/billing/webhook-processor", () => ({
  markEventProcessed: markEventProcessedMock,
  recordPaymentAttempt: recordPaymentAttemptMock,
  recordWebhookEvent: recordWebhookEventMock,
}));

vi.mock("@/lib/billing/subscription-service", () => ({
  activateSubscription: activateSubscriptionMock,
  expireSubscription: expireSubscriptionMock,
  updateSubscriptionStatus: updateSubscriptionStatusMock,
}));

import { POST as postPaddleWebhook } from "@/app/api/billing/paddle/webhook/route";

describe("billing webhook routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyPaddleWebhookSignatureMock.mockReturnValue(true);
    mapPaddleStatusMock.mockReturnValue("active");
    recordWebhookEventMock.mockResolvedValue({
      eventId: "stored_evt_123",
      isNew: true,
    });
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
});
