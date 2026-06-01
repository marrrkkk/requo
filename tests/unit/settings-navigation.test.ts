import { describe, expect, it } from "vitest";

import {
  getUnifiedSettingsNavigation,
} from "@/features/settings/navigation";

describe("getUnifiedSettingsNavigation", () => {
  it("returns two groups: Personal and Business", () => {
    const groups = getUnifiedSettingsNavigation("acme");

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Personal");
    expect(groups[1].label).toBe("Business");
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

    expect(business.items).toHaveLength(9);
    expect(business.items.map((i) => i.label)).toEqual([
      "General",
      "Members",
      "Billing",
      "Quotes",
      "Email",
      "Pricing",
      "Knowledge",
      "Support",
      "Audit log",
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
