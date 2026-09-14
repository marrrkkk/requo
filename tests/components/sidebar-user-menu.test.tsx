import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardUserMenu } from "@/components/shell/dashboard-shell-slots";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsUserMenu } from "@/features/settings/components/settings-shell-frame";

const user = {
  id: "user-1",
  email: "jane@example.com",
  name: "Jane Doe",
  avatarSrc: "https://example.com/avatar.png",
};

function renderWithSidebar(children: React.ReactNode) {
  return render(
    <TooltipProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </TooltipProvider>,
  );
}

describe("Sidebar user profile row", () => {
  it("copies the team card UI with a background-free avatar (main sidebar)", () => {
    const { container } = renderWithSidebar(
      <DashboardUserMenu
        user={user}
        businessRole="owner"
        businessSlug="demo"
        plan="free"
        businessId="business-1"
      />,
    );

    const trigger = screen.getByRole("button", { name: /jane/i });
    expect(trigger.className).toContain("bg-sidebar-accent");
    expect(trigger.className).toContain("rounded-xl");

    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar?.className).not.toContain("bg-muted");
    expect(avatar?.className).toContain("border-0");

    const fallback = container.querySelector('[data-slot="avatar-fallback"]');
    expect(fallback?.className).not.toContain("bg-muted");
  });

  it("copies the team card UI with a background-free avatar (settings sidebar)", () => {    const { container } = renderWithSidebar(
      <SettingsUserMenu user={user} businessSlug="demo" />,
    );

    const trigger = screen.getByRole("button", { name: /jane/i });
    expect(trigger.className).toContain("bg-sidebar-accent");
    expect(trigger.className).toContain("rounded-xl");

    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar?.className).not.toContain("bg-muted");
    expect(avatar?.className).toContain("border-0");

    const fallback = container.querySelector('[data-slot="avatar-fallback"]');
    expect(fallback?.className).not.toContain("bg-muted");
  });

  it("truncates long names and emails instead of bleeding under the chevron", () => {
    const longUser = {
      ...user,
      name: "Mark Louie Alvarez",
      email: "alvarezmarklouie57@gmail.com",
    };
    renderWithSidebar(
      <DashboardUserMenu
        user={longUser}
        businessRole="owner"
        businessSlug="demo"
        plan="free"
        businessId="business-1"
      />,
    );

    const trigger = screen.getByRole("button", { name: /mark/i });
    const name = within(trigger).getByText("Mark");
    const email = within(trigger).getByText("alvarezmarklouie57@gmail.com");

    // Ellipsis truncation (not bare nowrap clipping) on both lines…
    expect(name.className).toContain("truncate");
    expect(email.className).toContain("truncate");
    // …and a shrinking text column so the chevron box keeps its slot.
    expect(name.parentElement?.className).toContain("flex-1");
    expect(name.parentElement?.className).toContain("min-w-0");
  });
});
