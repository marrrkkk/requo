import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getAdminGateUserMock: vi.fn(),
  adminEmails: "allowlisted@example.com" as string | undefined,
}));

vi.mock("@/lib/auth/proxy-session", () => ({
  getAdminGateUser: mocks.getAdminGateUserMock,
}));

vi.mock("@/lib/env", () => ({
  env: {
    get ADMIN_EMAILS() {
      return mocks.adminEmails;
    },
    BETTER_AUTH_URL: "http://127.0.0.1:3000",
  },
}));

import { proxy } from "@/proxy";

const { getAdminGateUserMock } = mocks;

const adminUser = {
  email: "admin@example.com",
  role: "admin",
  banned: false,
};

const memberUser = {
  email: "member@example.com",
  role: "user",
  banned: false,
};

function request(pathname: string, method = "GET", accept?: string) {
  return new NextRequest(new URL(`http://127.0.0.1:3000${pathname}`), {
    method,
    headers: accept ? { accept } : undefined,
  });
}

/** `NextResponse.next()` — the request continues to the route. */
function isPassthrough(response: Response): boolean {
  return response.status === 200 && Boolean(response.headers.get("x-middleware-next"));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.adminEmails = "allowlisted@example.com";
  getAdminGateUserMock.mockResolvedValue(null);
});

describe("proxy /admin gate", () => {
  it("redirects an unauthenticated request to /login", async () => {
    getAdminGateUserMock.mockResolvedValue(null);

    const response = await proxy(request("/admin"));

    expect(response.status).toBe(307);
    // Assert on the pathname only: jsdom normalises the request host, so the
    // origin is not what this test is about.
    const location = response.headers.get("location");
    expect(location).not.toBeNull();
    expect(new URL(location as string).pathname).toBe("/login");
  });

  it("answers a signed-in non-admin with a real 403", async () => {
    getAdminGateUserMock.mockResolvedValue(memberUser);

    const response = await proxy(request("/admin"));

    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const text = await response.text();
    expect(text).toContain("403");
    expect(text).toContain("Access forbidden");
    expect(text).toContain("You don't have permission to access this page.");
  });

  it("answers a nested non-admin request with a 403", async () => {
    getAdminGateUserMock.mockResolvedValue(memberUser);

    const response = await proxy(request("/admin/users"));

    expect(response.status).toBe(403);
  });

  it("answers a banned admin with a 403", async () => {
    getAdminGateUserMock.mockResolvedValue({ ...adminUser, banned: true });

    const response = await proxy(request("/admin"));

    expect(response.status).toBe(403);
  });

  it("lets an admin through", async () => {
    getAdminGateUserMock.mockResolvedValue(adminUser);

    const response = await proxy(request("/admin"));

    expect(isPassthrough(response)).toBe(true);
  });

  it("lets an allowlisted email through even without the admin role", async () => {
    getAdminGateUserMock.mockResolvedValue({
      ...memberUser,
      email: "allowlisted@example.com",
    });

    const response = await proxy(request("/admin"));

    expect(isPassthrough(response)).toBe(true);
  });

  it("does not gate the impersonation exit path", async () => {
    getAdminGateUserMock.mockResolvedValue(null);

    const response = await proxy(
      request("/admin/stop-impersonating", "POST"),
    );

    expect(isPassthrough(response)).toBe(true);
    expect(getAdminGateUserMock).not.toHaveBeenCalled();
  });

  it("does not touch non-admin paths and never reads a session for them", async () => {
    for (const pathname of ["/home", "/pricing", "/administration"]) {
      const response = await proxy(request(pathname));

      expect(isPassthrough(response), `${pathname} should pass through`).toBe(
        true,
      );
    }

    expect(getAdminGateUserMock).not.toHaveBeenCalled();
  });

  it("gates /admin sub-paths but not lookalike prefixes", async () => {
    getAdminGateUserMock.mockResolvedValue(memberUser);

    const nested = await proxy(request("/admin/settings/roles"));
    expect(nested.status).toBe(403);

    const lookalike = await proxy(request("/administrators"));
    expect(isPassthrough(lookalike)).toBe(true);
  });

  it("does not noindex public trust pages", async () => {
    for (const pathname of [
      "/security",
      "/legal/dpa",
      "/subprocessors",
      "/solutions/contractors-home-services",
    ]) {
      const response = await proxy(request(pathname));
      expect(
        response.headers.get("x-robots-tag"),
        `${pathname} should be indexable`,
      ).toBeNull();
    }
  });

  it("serves HTML for / by default, markdown only when preferred", async () => {
    const htmlFirst = await proxy(
      request("/", "GET", "text/html, text/markdown"),
    );
    expect(isPassthrough(htmlFirst)).toBe(true);

    const markdownOnly = await proxy(request("/", "GET", "text/markdown"));
    expect(markdownOnly.headers.get("x-middleware-rewrite")).toContain(
      "/api/public/markdown",
    );
  });
});
