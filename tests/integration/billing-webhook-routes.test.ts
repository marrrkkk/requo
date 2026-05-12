import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  verifyPaddleWebhookSignatureMock,
} = vi.hoisted(() => ({
  verifyPaddleWebhookSignatureMock: vi.fn(),
}));

vi.mock("@/lib/billing/providers/paddle", () => ({
  mapPaddleStatus: vi.fn(() => "active"),
  verifyPaddleWebhookSignature: verifyPaddleWebhookSignatureMock,
}));

import { POST as postPaddleWebhook } from "@/app/api/billing/paddle/webhook/route";

describe("billing webhook routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid Paddle signatures", async () => {
    verifyPaddleWebhookSignatureMock.mockReturnValue(false);
    const response = await postPaddleWebhook(
      new Request("http://localhost/api/billing/paddle/webhook", {
        body: JSON.stringify({
          event_id: "evt_1",
          event_type: "transaction.completed",
        }),
        headers: {
          "content-type": "application/json",
          "paddle-signature": "invalid",
        },
        method: "POST",
      }),
    );
    expect(response.status).toBe(401);
  });
});
