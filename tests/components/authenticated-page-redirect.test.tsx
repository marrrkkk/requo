import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { AuthenticatedPageRedirect } from "@/features/auth/components/authenticated-page-redirect";

const { replaceMock, useSessionMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    useSession: useSessionMock,
  },
}));

describe("AuthenticatedPageRedirect", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useSessionMock.mockReset();
  });

  it("redirects authenticated users on the client", async () => {
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

    render(<AuthenticatedPageRedirect redirectTo="/workspaces" />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/workspaces"),
    );
  });

  it("does not redirect signed-out users", () => {
    useSessionMock.mockReturnValue({ data: null });

    render(<AuthenticatedPageRedirect redirectTo="/workspaces" />);

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
