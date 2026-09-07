import { describe, expect, it } from "vitest";

import {
  getUnifiedSettingsNavigation,
} from "@/features/settings/navigation";

describe("getUnifiedSettingsNavigation", () => {
  it("returns three groups: Personal, Business, and Account", () => {
    const groups = getUnifiedSettingsNavigation("acme");

    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe("Personal");
    expect(groups[1].label).toBe("Business");
    expect(groups[2].label).toBe("Account");
  });

  it("Personal group contains Profile, Appearance, Notifications", () => {
    const [personal] = getUnifiedSettingsNavigation("acme");

    expect(personal.items).toHaveLength(3);
    expect(personal.items.map((i) => i.label)).toEqual([
      "Profile",
      "Appearance",
      "Notifications",
    ]);
  });

  it("Business group contains all current business settings items", () => {
    const [, business] = getUnifiedSettingsNavigation("acme");

    expect(business.items.map((i) => i.label)).toEqual([
      "Profile",
      "Quotes",
      "Templates",
      "Email templates",
      "Assistant",
      "Knowledge base",
    ]);
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
