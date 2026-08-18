import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { MobileRecordRow } from "@/components/shared/mobile-record-row";

vi.mock("next/navigation", () => ({
  usePathname: () => "/demo/inquiries",
}));

describe("MobileTopBar", () => {
  it("renders business control, title, notifications, and user control", () => {
    render(
      <MobileTopBar
        businessControl={<button type="button">Biz</button>}
        pageTitle="Inquiries"
        notificationSlot={<button type="button">Bell</button>}
        userControl={<button type="button">User</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Inquiries" })).toBeDefined();
    expect(screen.getByText("Biz")).toBeDefined();
    expect(screen.getByText("Bell")).toBeDefined();
    expect(screen.getByText("User")).toBeDefined();
  });
});

describe("MobileBottomNav", () => {
  it("renders 5 destinations: Home, Inquiries, Quotes, Follow-ups, More", async () => {
    const user = userEvent.setup();
    render(<MobileBottomNav businessSlug="demo" role="owner" />);

    expect(screen.getByRole("link", { name: /home/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /inquiries/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /quotes/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /follow-ups/i })).toBeDefined();
    
    const moreBtn = screen.getByRole("button", { name: /more/i });
    expect(moreBtn).toBeDefined();

    await user.click(moreBtn);
    expect(await screen.findByRole("heading", { name: "More" })).toBeDefined();
    expect(screen.getByRole("link", { name: /forms/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /analytics/i })).toBeDefined();
  });
});

describe("MobileRecordRow", () => {
  it("renders title, subtitle, badges, and supports selection", async () => {
    const toggleSpy = vi.fn();
    const user = userEvent.setup();

    render(
      <MobileRecordRow
        id="rec-1"
        href="/demo/inquiries/rec-1"
        title="Jane Doe"
        subtitle="jane@example.com"
        statusBadge={<span>New</span>}
        metadata={<span>Channel: Web</span>}
        isSelected={false}
        onToggleSelect={toggleSpy}
      />,
    );

    expect(screen.getByText("Jane Doe")).toBeDefined();
    expect(screen.getByText("jane@example.com")).toBeDefined();
    expect(screen.getByText("New")).toBeDefined();
    expect(screen.getByText("Channel: Web")).toBeDefined();

    const checkbox = screen.getByRole("checkbox", { name: /select record/i });
    await user.click(checkbox);
    expect(toggleSpy).toHaveBeenCalledWith("rec-1");
  });
});
