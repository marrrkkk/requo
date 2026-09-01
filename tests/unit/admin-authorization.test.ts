import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOptionalSessionMock, redirectMock } = vi.hoisted(() => ({
  getOptionalSessionMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getOptionalSession: getOptionalSessionMock,
}));

import { requireAdminUser } from "@/features/admin/access";

const adminUser = {
  id: "admin_1",
  email: "admin@example.com",
  name: "Admin",
  role: "admin",
  emailVerified: true,
  banned: false,
};

const memberUser = {
  id: "user_1",
  email: "user@example.com",
  name: "Member",
  role: "user",
  emailVerified: true,
  banned: false,
};

function makeSession(user: Record<string, unknown> & { id: string }) {
  return {
    session: { id: "sess_1", userId: user.id, expiresAt: new Date() },
    user,
  };
}

describe("features/admin/access requireAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when there is no active session", async () => {
    getOptionalSessionMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT /login");
    });

    await expect(requireAdminUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when the session has no user", async () => {
    getOptionalSessionMock.mockResolvedValue({ session: {} });
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT /login");
    });

    await expect(requireAdminUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when the user role is not admin", async () => {
    getOptionalSessionMock.mockResolvedValue(makeSession(memberUser));
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT /login");
    });

    await expect(requireAdminUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when the user role is null", async () => {
    getOptionalSessionMock.mockResolvedValue(
      makeSession({ ...memberUser, role: null }),
    );
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT /login");
    });

    await expect(requireAdminUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("returns the session context for an admin user", async () => {
    const session = makeSession(adminUser);
    getOptionalSessionMock.mockResolvedValue(session);

    const context = await requireAdminUser();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(context).toEqual({
      session,
      user: session.user,
    });
  });
});
