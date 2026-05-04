import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { hasAdminProxyAccessMock } = vi.hoisted(() => ({
  hasAdminProxyAccessMock: vi.fn(),
}));

vi.mock("@/features/admin/proxy-auth", () => ({
  hasAdminProxyAccess: hasAdminProxyAccessMock,
}));

import { proxy } from "@/proxy";

describe("admin proxy guard", () => {
  beforeEach(() => {
    hasAdminProxyAccessMock.mockReset();
  });

  it("returns 404 before rendering admin routes without a session", async () => {
    hasAdminProxyAccessMock.mockResolvedValue(false);

    const response = await proxy(new NextRequest("http://localhost/admin"));

    expect(response.status).toBe(404);
  });

  it("returns 404 before rendering admin routes for non-admin sessions", async () => {
    hasAdminProxyAccessMock.mockResolvedValue(false);

    const response = await proxy(
      new NextRequest("http://localhost/admin/users"),
    );

    expect(response.status).toBe(404);
  });

  it("allows allowlisted admins through admin routes", async () => {
    hasAdminProxyAccessMock.mockResolvedValue(true);

    const response = await proxy(new NextRequest("http://localhost/admin"));

    expect(response.status).toBe(200);
  });
});
