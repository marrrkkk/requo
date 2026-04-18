import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuthGetSession, mockConnection, mockHeaders } = vi.hoisted(() => ({
  mockAuthGetSession: vi.fn(),
  mockConnection: vi.fn(async () => undefined),
  mockHeaders: vi.fn(async () => new Headers()),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/server", () => ({
  connection: mockConnection,
}));

vi.mock("@/lib/auth/server", () => ({
  auth: {
    api: {
      getSession: mockAuthGetSession,
    },
  },
}));

import {
  getCurrentUser,
  getOptionalSession,
  getSession,
} from "@/lib/auth/session";

describe("lib/auth/session", () => {
  beforeEach(() => {
    mockAuthGetSession.mockReset();
    mockConnection.mockClear();
    mockHeaders.mockClear();
  });

  it("returns the optional session when the auth lookup succeeds", async () => {
    const session = {
      session: {
        id: "session-1",
      },
      user: {
        id: "user-1",
        email: "owner@example.com",
        name: "Owner",
      },
    };

    mockAuthGetSession.mockResolvedValue(session);

    await expect(getOptionalSession()).resolves.toEqual(session);
    expect(mockConnection).toHaveBeenCalledOnce();
    expect(mockHeaders).toHaveBeenCalledOnce();
    expect(mockAuthGetSession).toHaveBeenCalledOnce();
  });

  it("falls back to null for optional auth lookups when session resolution fails", async () => {
    mockAuthGetSession.mockRejectedValue(new Error("Failed to get session"));

    await expect(getOptionalSession()).resolves.toBeNull();
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("keeps the strict session helper throwing on lookup failures", async () => {
    mockAuthGetSession.mockRejectedValue(new Error("Failed to get session"));

    await expect(getSession()).rejects.toThrow("Failed to get session");
  });
});
