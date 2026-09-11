import { describe, expect, it } from "vitest";

import {
  getUnifiedSettingsNavigation,
} from "@/features/settings/navigation";

describe("getUnifiedSettingsNavigation", () => {
  it("returns three groups: User, Workspace, and Other", () => {
    const groups = getUnifiedSettingsNavigation("acme");

    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe("User");
    expect(groups[1].label).toBe("Workspace");
    expect(groups[2].label).toBe("Other");
  });

  it("User group contains Profile, Appearance, Notifications", () => {
    const [user] = getUnifiedSettingsNavigation("acme");

    expect(user.items).toHaveLength(3);
    expect(user.items.map((i) => i.label)).toEqual([
      "Profile",
      "Appearance",
      "Notifications",
    ]);
  });

  it("Workspace group contains all current business settings items", () => {
    const [, workspace] = getUnifiedSettingsNavigation("acme");

    expect(workspace.items.map((i) => i.label)).toEqual([
      "General",
      "Quotes",
      "Email templates",
      "Assistant",
      "Billing",
      "Members",
      "Audit log",
    ]);
  });

  it("Other group contains Help & Support", () => {
    const [, , other] = getUnifiedSettingsNavigation("acme");

    expect(other.items.map((i) => i.label)).toEqual(["Help & Support"]);
  });

  it("generates correct href paths scoped to slug", () => {
    const groups = getUnifiedSettingsNavigation("my-biz");

    const allItems = groups.flatMap((g) => g.items);
    for (const item of allItems) {
      expect(item.href).toMatch(/^\/my-biz\/settings\//);
    }
  });

  it("each item has an icon string", () => {
    const groups = getUnifiedSettingsNavigation("test");

    const allItems = groups.flatMap((g) => g.items);
    for (const item of allItems) {
      expect(item.icon).toBeTruthy();
      expect(typeof item.icon).toBe("string");
    }
  });
});
