import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
  ADMIN_EMAILS: "allowlisted@example.com, Second@Example.com" as
    | string
    | undefined,
}));

vi.mock("@/lib/env", () => ({ env: envMock }));

import {
  isAllowlistedAdminEmail,
  isOptimisticAdminUser,
} from "@/lib/auth/admin-identity";

beforeEach(() => {
  envMock.ADMIN_EMAILS = "allowlisted@example.com, Second@Example.com";
});

describe("isAllowlistedAdminEmail", () => {
  it("matches an entry in a comma-separated list", () => {
    expect(isAllowlistedAdminEmail("allowlisted@example.com")).toBe(true);
  });

  it("ignores case on both sides", () => {
    expect(isAllowlistedAdminEmail("ALLOWLISTED@EXAMPLE.COM")).toBe(true);
    expect(isAllowlistedAdminEmail("second@example.com")).toBe(true);
    expect(isAllowlistedAdminEmail("  Second@Example.com  ")).toBe(true);
  });

  it("does not match an email that is not listed", () => {
    expect(isAllowlistedAdminEmail("someone@example.com")).toBe(false);
  });

  it("returns false when the allowlist is unset or blank", () => {
    envMock.ADMIN_EMAILS = undefined;
    expect(isAllowlistedAdminEmail("allowlisted@example.com")).toBe(false);

    envMock.ADMIN_EMAILS = "   ";
    expect(isAllowlistedAdminEmail("allowlisted@example.com")).toBe(false);
  });

  it("returns false for a missing email", () => {
    expect(isAllowlistedAdminEmail(null)).toBe(false);
    expect(isAllowlistedAdminEmail(undefined)).toBe(false);
    expect(isAllowlistedAdminEmail("")).toBe(false);
  });
});

describe("isOptimisticAdminUser", () => {
  it("admits an explicit admin role", () => {
    expect(
      isOptimisticAdminUser({ email: "someone@example.com", role: "admin" }),
    ).toBe(true);
  });

  it("admits an allowlisted email whose role is not promoted yet", () => {
    expect(
      isOptimisticAdminUser({
        email: "allowlisted@example.com",
        role: "user",
      }),
    ).toBe(true);
  });

  it("refuses a plain member", () => {
    expect(
      isOptimisticAdminUser({ email: "someone@example.com", role: "user" }),
    ).toBe(false);
  });

  it("refuses a null role that is not allowlisted", () => {
    expect(
      isOptimisticAdminUser({ email: "someone@example.com", role: null }),
    ).toBe(false);
  });

  it("refuses a banned user even when the role says admin", () => {
    expect(
      isOptimisticAdminUser({
        email: "someone@example.com",
        role: "admin",
        banned: true,
      }),
    ).toBe(false);
  });

  it("refuses a banned user even when allowlisted", () => {
    expect(
      isOptimisticAdminUser({
        email: "allowlisted@example.com",
        role: "user",
        banned: true,
      }),
    ).toBe(false);
  });

  it("admits an admin whose banned flag is explicitly false", () => {
    expect(
      isOptimisticAdminUser({
        email: "someone@example.com",
        role: "admin",
        banned: false,
      }),
    ).toBe(true);
  });

  it("refuses a candidate with no email and no admin role", () => {
    expect(isOptimisticAdminUser({ email: null, role: null })).toBe(false);
  });
});
