import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminUserMock, wrapAdminRouteWithViewLogMock } = vi.hoisted(() => ({
  requireAdminUserMock: vi.fn(),
  wrapAdminRouteWithViewLogMock: vi.fn(),
}));

vi.mock("@/features/admin/access", () => ({
  requireAdminUser: requireAdminUserMock,
}));

vi.mock("@/features/admin/audit", () => ({
  wrapAdminRouteWithViewLog: wrapAdminRouteWithViewLogMock,
}));

import type { AdminContext } from "@/features/admin/access";
import {
  toAdminAuditContext,
  withAdminViewLog,
} from "@/features/admin/page-shell";

type CapturedCall = {
  context: unknown;
  descriptor: unknown;
};

let captured: CapturedCall[] = [];

function makeAdminContext(impersonatedBy: string | null = null): AdminContext {
  const user = { id: "admin_1", email: "admin@example.com" };

  return {
    session: {
      session: {
        id: "sess_1",
        userId: user.id,
        expiresAt: new Date("2026-01-01T00:00:00Z"),
        impersonatedBy,
      },
      user,
    },
    user,
  } as unknown as AdminContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  captured = [];

  // Stand in for the real decorator: record the call and hand the handler back
  // so the test can assert on what the page actually rendered.
  wrapAdminRouteWithViewLogMock.mockImplementation(
    (
      handler: (...args: unknown[]) => unknown,
      context: unknown,
      descriptor: unknown,
    ) => {
      captured.push({ context, descriptor });
      return handler;
    },
  );
});

describe("features/admin/page-shell toAdminAuditContext", () => {
  it("maps the admin identity and leaves impersonation unset", () => {
    expect(toAdminAuditContext(makeAdminContext())).toEqual({
      adminUserId: "admin_1",
      adminEmail: "admin@example.com",
      impersonatedUserId: null,
    });
  });

  it("records the impersonated user when the session is an impersonation", () => {
    expect(toAdminAuditContext(makeAdminContext("admin_9"))).toEqual({
      adminUserId: "admin_1",
      adminEmail: "admin@example.com",
      impersonatedUserId: "admin_1",
    });
  });
});

describe("features/admin/page-shell withAdminViewLog", () => {
  it("passes the admin context to the render callback and returns its value", async () => {
    const adminContext = makeAdminContext();
    requireAdminUserMock.mockResolvedValue(adminContext);
    const render = vi.fn().mockReturnValue("rendered");

    const result = await withAdminViewLog(
      { action: "view.users", targetType: "user" },
      render,
    );

    expect(requireAdminUserMock).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(adminContext);
    expect(result).toBe("rendered");
  });

  it("forwards the descriptor and the projected audit context to the view log", async () => {
    requireAdminUserMock.mockResolvedValue(makeAdminContext());

    await withAdminViewLog(
      { action: "view.users", targetType: "user", targetId: "u1" },
      () => "ok",
    );

    expect(captured).toEqual([
      {
        context: {
          adminUserId: "admin_1",
          adminEmail: "admin@example.com",
          impersonatedUserId: null,
        },
        descriptor: {
          action: "view.users",
          targetType: "user",
          targetId: "u1",
        },
      },
    ]);
  });

  it("awaits an async render callback", async () => {
    requireAdminUserMock.mockResolvedValue(makeAdminContext());

    const result = await withAdminViewLog(
      { action: "view.users", targetType: "user" },
      async () => "async-rendered",
    );

    expect(result).toBe("async-rendered");
  });

  it("propagates the auth failure without invoking the render callback", async () => {
    requireAdminUserMock.mockRejectedValue(new Error("NEXT_REDIRECT /login"));
    const render = vi.fn();

    await expect(
      withAdminViewLog({ action: "view.users", targetType: "user" }, render),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(render).not.toHaveBeenCalled();
  });
});
