import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, requireAdminOrNullMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  requireAdminOrNullMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("@/features/admin/auth", () => ({
  requireAdminOrNull: requireAdminOrNullMock,
}));

import { requireAdminPage } from "@/features/admin/page-guard";

describe("admin page guard", () => {
  beforeEach(() => {
    notFoundMock.mockClear();
    requireAdminOrNullMock.mockReset();
  });

  it("returns 404 for logged-out admin route access", async () => {
    requireAdminOrNullMock.mockResolvedValue(null);

    await expect(requireAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it("returns admin context for allowlisted users", async () => {
    const admin = {
      userId: "admin_1",
      email: "owner@example.com",
      name: "Owner",
    };
    requireAdminOrNullMock.mockResolvedValue(admin);

    await expect(requireAdminPage()).resolves.toEqual(admin);
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
