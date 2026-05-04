import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOptionalSessionMock } = vi.hoisted(() => ({
  getOptionalSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    ADMIN_EMAILS: " Owner@Example.com, support@example.com ",
  },
}));

import {
  AdminAuthorizationError,
  isAdminEmail,
  parseAdminEmailAllowlist,
  requireAdminOrNull,
  requireAdminOrThrow,
} from "@/features/admin/auth";

describe("admin auth helpers", () => {
  beforeEach(() => {
    getOptionalSessionMock.mockReset();
  });

  it("normalizes the ADMIN_EMAILS allowlist", () => {
    expect(
      parseAdminEmailAllowlist(
        "Owner@Example.com, support@example.com, owner@example.com, ",
      ),
    ).toEqual(["owner@example.com", "support@example.com"]);
  });

  it("matches admin emails case-insensitively", () => {
    expect(isAdminEmail("OWNER@example.com")).toBe(true);
    expect(isAdminEmail("customer@example.com")).toBe(false);
  });

  it("returns null when there is no session", async () => {
    getOptionalSessionMock.mockResolvedValue(null);

    await expect(requireAdminOrNull()).resolves.toBeNull();
  });

  it("returns null for logged-in non-admin users", async () => {
    getOptionalSessionMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "customer@example.com",
        name: "Customer",
      },
    });

    await expect(requireAdminOrNull()).resolves.toBeNull();
  });

  it("returns admin context for allowlisted users", async () => {
    getOptionalSessionMock.mockResolvedValue({
      user: {
        id: "admin_1",
        email: "owner@example.com",
        name: "Owner",
      },
    });

    await expect(requireAdminOrNull()).resolves.toEqual({
      userId: "admin_1",
      email: "owner@example.com",
      name: "Owner",
    });
  });

  it("throws a generic authorization error for non-admin actions", async () => {
    getOptionalSessionMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "customer@example.com",
        name: "Customer",
      },
    });

    await expect(requireAdminOrThrow()).rejects.toBeInstanceOf(
      AdminAuthorizationError,
    );
  });
});
