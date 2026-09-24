import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommandMenu } from "@/components/shell/command-menu";

const navState = vi.hoisted(() => ({ pathname: "/demo/home" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navState.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

const businessSlug = "demo";
const recentsKey = `requo:recent-records:${businessSlug}`;

function renderSearch() {
  return render(
    <CommandMenu
      businessSlug={businessSlug}
      open={true}
      onOpenChange={() => {}}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("CommandMenu search", () => {
  it("lists last opened with no tabs when the query is empty", () => {
    window.localStorage.setItem(
      recentsKey,
      JSON.stringify([
        {
          id: "inquiry-1",
          type: "inquiry",
          title: "Taylor Swift",
          subtitle: "taylor@example.com",
          href: "/demo/inquiries/inquiry-1",
        },
      ]),
    );

    renderSearch();

    expect(screen.getByText("Last opened")).toBeDefined();
    expect(
      screen.getByRole("link", { name: /taylor swift/i }),
    ).toBeDefined();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("shows hint text when there are no recent records", () => {
    renderSearch();

    expect(
      screen.getByText(/type to search inquiries, quotes, invoices/i),
    ).toBeDefined();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("shows type tabs and filters results after typing one character", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              id: "inquiry-1",
              type: "inquiry",
              title: "Taylor",
              subtitle: "taylor@example.com",
              href: "/demo/inquiries/inquiry-1",
            },
            {
              id: "quote-1",
              type: "quote",
              title: "Taylor quote",
              subtitle: "Q-1001",
              href: "/demo/quotes/quote-1",
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      renderSearch();

      await user.type(screen.getByRole("searchbox"), "t");

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/business/demo/mobile-search?q=t",
          expect.objectContaining({}),
        );
      });

      expect(await screen.findByRole("tab", { name: "All" })).toBeDefined();
      expect(screen.getByRole("tab", { name: "Inquiries" })).toBeDefined();
      expect(screen.getByRole("tab", { name: "Quotes" })).toBeDefined();
      expect(
        screen.getByRole("link", { name: /taylor quote/i }),
      ).toBeDefined();

      await user.click(screen.getByRole("tab", { name: "Quotes" }));

      expect(
        screen.getByRole("link", { name: /taylor quote/i }),
      ).toBeDefined();
      expect(
        screen.queryByRole("link", { name: /taylor · inquiry/i }),
      ).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("records a clicked result in last opened", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              id: "quote-1",
              type: "quote",
              title: "Taylor quote",
              subtitle: "Q-1001",
              href: "/demo/quotes/quote-1",
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      renderSearch();

      await user.type(screen.getByRole("searchbox"), "t");
      const link = await screen.findByRole("link", {
        name: /taylor quote/i,
      });
      await user.click(link);

      const stored = JSON.parse(window.localStorage.getItem(recentsKey) ?? "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ id: "quote-1", type: "quote" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
