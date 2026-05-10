import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: {
    PADDLE_API_KEY: "test_key",
    PADDLE_WEBHOOK_SECRET: "pdl_test_secret",
    PADDLE_PRO_PRICE_ID: "pri_pro_123",
    PADDLE_BUSINESS_PRICE_ID: "pri_biz_456",
    PADDLE_PRO_YEARLY_PRICE_ID: "pri_pro_y_123",
    PADDLE_BUSINESS_YEARLY_PRICE_ID: "pri_biz_y_456",
    PADDLE_ENVIRONMENT: "sandbox",
  },
  isPaddleConfigured: true,
}));

import { mapPaddleStatus } from "@/lib/billing/providers/paddle";

describe("Paddle provider", () => {
  it("maps active statuses", () => {
    expect(mapPaddleStatus("active")).toBe("active");
    expect(mapPaddleStatus("past_due")).toBe("past_due");
    expect(mapPaddleStatus("canceled")).toBe("canceled");
  });

  it("maps unknown values to incomplete", () => {
    expect(mapPaddleStatus("whatever")).toBe("incomplete");
  });
});
