import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockHeaders,
  mockCountWhere,
  mockSelectFrom,
  mockSelect,
  mockInsertValues,
  mockInsert,
} = vi.hoisted(() => ({
  mockHeaders: vi.fn(async () => new Headers()),
  mockCountWhere: vi.fn(),
  mockSelectFrom: vi.fn(() => ({
    where: mockCountWhere,
  })),
  mockSelect: vi.fn(() => ({
    from: mockSelectFrom,
  })),
  mockInsertValues: vi.fn(),
  mockInsert: vi.fn(() => ({
    values: mockInsertValues,
  })),
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));

import {
  assertPublicActionRateLimit,
  getForwardedIpAddress,
  getPublicActionClientIpAddress,
  isUsableClientIp,
} from "@/lib/public-action-rate-limit";

describe("lib/public-action-rate-limit", () => {
  beforeEach(() => {
    mockHeaders.mockReset();
    mockHeaders.mockResolvedValue(new Headers());
    mockCountWhere.mockReset();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
    mockInsertValues.mockReset();
    mockInsert.mockClear();
  });

  it("skips unusable forwarded IPs and falls back to a real client IP header", () => {
    const headerStore = new Headers({
      "x-forwarded-for": "::, 0000:0000:0000:0000:0000:0000:0000:0000",
      "x-real-ip": "203.0.113.10",
    });

    expect(isUsableClientIp("::")).toBe(false);
    expect(
      isUsableClientIp("0000:0000:0000:0000:0000:0000:0000:0000"),
    ).toBe(false);
    expect(getForwardedIpAddress(headerStore.get("x-forwarded-for"))).toBeNull();
    expect(getPublicActionClientIpAddress(headerStore)).toBe("203.0.113.10");
  });

  it("fails open when the rate-limit query cannot reach the database", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    mockHeaders.mockResolvedValue(
      new Headers({
        "x-forwarded-for": "::",
        "x-real-ip": "203.0.113.10",
        "user-agent": "vitest",
      }),
    );
    mockCountWhere.mockRejectedValue(new Error("connect timeout"));

    await expect(
      assertPublicActionRateLimit({
        action: "public-inquiry-submit",
        scope: "business-1",
        limit: 6,
        windowMs: 15 * 60 * 1000,
      }),
    ).resolves.toBe(true);

    expect(mockInsert).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledOnce();

    consoleError.mockRestore();
  });

  it("still blocks requests once the limit has been reached", async () => {
    mockHeaders.mockResolvedValue(
      new Headers({
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "vitest",
      }),
    );
    mockCountWhere.mockResolvedValue([{ count: 6 }]);

    await expect(
      assertPublicActionRateLimit({
        action: "public-inquiry-submit",
        scope: "business-1",
        limit: 6,
        windowMs: 15 * 60 * 1000,
      }),
    ).resolves.toBe(false);

    expect(mockInsert).not.toHaveBeenCalled();
  });
});
