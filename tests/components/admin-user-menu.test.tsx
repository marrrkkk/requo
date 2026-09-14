import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { assignMock, signOutMock, clearPersistedThemePreferenceMock } = vi.hoisted(
  () => ({
    assignMock: vi.fn(),
    signOutMock: vi.fn(),
    clearPersistedThemePreferenceMock: vi.fn(),
  }),
);

vi.mock("@/lib/auth/client", () => ({
  authClient: { signOut: signOutMock },
}));

vi.mock("@/features/theme/persistence", () => ({
  clearPersistedThemePreference: clearPersistedThemePreferenceMock,
}));

// The appearance submenu is irrelevant here and drags in the theme provider tree.
vi.mock("@/features/theme/components/appearance-menu", () => ({
  AppearanceMenuSubmenu: () => null,
}));

import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AdminMobileUserMenu,
  AdminUserMenu,
} from "@/features/admin/components/shell/admin-user-menu";

const user = {
  id: "admin-1",
  name: "Jane Doe",
  email: "jane@example.com",
  avatarSrc: "https://example.com/avatar.png",
};

function renderMenu(menu: "sidebar" | "mobile" = "sidebar") {
  return render(
    <TooltipProvider>
      <SidebarProvider>
        {menu === "sidebar" ? (
          <AdminUserMenu user={user} />
        ) : (
          <AdminMobileUserMenu user={user} />
        )}
      </SidebarProvider>
    </TooltipProvider>,
  );
}

/**
 * Regression guard for the admin sign-out bug.
 *
 * The legacy console posted to `/api/admin/logout`, a deprecated shim that
 * answers `410 Gone`, so signing out could never succeed. Sign-out now goes
 * through Better Auth, which owns the session.
 */
describe("admin user menu", () => {
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignMock, origin: "http://localhost" },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  beforeEach(() => {
    assignMock.mockReset();
    signOutMock.mockReset();
    clearPersistedThemePreferenceMock.mockReset();
    window.localStorage.clear();
    signOutMock.mockResolvedValue({});
  });

  it("reuses the main app's sidebar user-row treatment", () => {
    const { container } = renderMenu();

    const trigger = screen.getByRole("button", { name: /jane doe/i });
    expect(trigger.className).toContain("bg-sidebar-accent");
    expect(trigger.className).toContain("rounded-xl");

    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar?.className).toContain("border-0");
  });

  it("signs out through Better Auth and lands on /login", async () => {
    const browser = userEvent.setup();
    renderMenu();

    await browser.click(screen.getByRole("button", { name: /jane doe/i }));
    const menu = await screen.findByRole("menu");
    await browser.click(within(menu).getByText("Sign out"));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(clearPersistedThemePreferenceMock).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith("/login");
  });

  it("never posts to the deprecated logout route", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const browser = userEvent.setup();
    renderMenu();

    await browser.click(screen.getByRole("button", { name: /jane doe/i }));
    const menu = await screen.findByRole("menu");
    await browser.click(within(menu).getByText("Sign out"));

    const calledUrls = fetchSpy.mock.calls.map(([input]) =>
      typeof input === "string" ? input : String(input),
    );
    expect(calledUrls.some((url) => url.includes("/api/admin/logout"))).toBe(false);

    fetchSpy.mockRestore();
  });

  it("stays on the page when sign-out fails", async () => {
    signOutMock.mockResolvedValue({ error: { message: "network" } });
    const browser = userEvent.setup();
    renderMenu();

    await browser.click(screen.getByRole("button", { name: /jane doe/i }));
    const menu = await screen.findByRole("menu");
    await browser.click(within(menu).getByText("Sign out"));

    expect(assignMock).not.toHaveBeenCalled();
    expect(clearPersistedThemePreferenceMock).not.toHaveBeenCalled();
  });

  it("offers the same sign-out from the mobile menu", async () => {
    const browser = userEvent.setup();
    renderMenu("mobile");

    await browser.click(
      screen.getByRole("button", { name: /admin profile menu/i }),
    );
    const menu = await screen.findByRole("menu");
    await browser.click(within(menu).getByText("Sign out"));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith("/login");
  });
});
