import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isRetryableEmailError } from "@/lib/email/errors";

describe("isRetryableEmailError", () => {
  it("returns true for rate limits, quota failures, and temporary outages", () => {
    expect(isRetryableEmailError({ statusCode: 429 })).toBe(true);
    expect(isRetryableEmailError(new Error("quota exceeded"))).toBe(true);
    expect(isRetryableEmailError({ statusCode: 503 })).toBe(true);
  });

  it("returns false for invalid input and configuration errors", () => {
    expect(isRetryableEmailError({ statusCode: 422, message: "invalid recipient" })).toBe(false);
    expect(isRetryableEmailError(new Error("domain is not verified"))).toBe(false);
    expect(isRetryableEmailError({ statusCode: 401 })).toBe(false);
  });
});
