import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PublicHeaderActions } from "@/components/marketing/public-header-actions";

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    useSession: useSessionMock,
  },
}));

vi.mock("@/components/marketing/marketing-mobile-nav", () => ({
  MarketingMobileNav: ({
    isAuthenticated,
  }: {
    isAuthenticated: boolean;
  }) => (
    <div
      data-authenticated={String(isAuthenticated)}
      data-testid="marketing-mobile-nav"
    />
  ),
}));

describe("PublicHeaderActions", () => {
  beforeEach(() => {
    useSessionMock.mockReset();
  });

  it("shows signed-out actions when there is no session", () => {
    useSessionMock.mockReturnValue({ data: null });

    render(<PublicHeaderActions />);

    expect(screen.getAllByRole("link", { name: "Log in" })).not.toHaveLength(0);
    expect(
      screen.getAllByRole("link", { name: "Start free" }),
    ).not.toHaveLength(0);
    expect(screen.getByTestId("marketing-mobile-nav")).toHaveAttribute(
      "data-authenticated",
      "false",
    );
  });

  it("shows app actions when the session is available", () => {
    useSessionMock.mockReturnValue({
      data: {
        session: {
          id: "session-1",
        },
        user: {
          id: "user-1",
          email: "owner@example.com",
          name: "Owner",
        },
      },
    });

    render(<PublicHeaderActions />);

    expect(
      screen.getAllByRole("link", { name: "Visit app" }),
    ).not.toHaveLength(0);
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
    expect(screen.getByTestId("marketing-mobile-nav")).toHaveAttribute(
      "data-authenticated",
      "true",
    );
  });
});
