import { describe, expect, it } from "vitest";

import {
  formatPrice,
  getCurrencySymbol,
  getMonthlyEquivalentLabel,
  getPlanPrice,
  getPlanPriceLabel,
  getYearlySavingsPercent,
  planPricing,
} from "@/lib/billing/plans";

describe("lib/billing/plans", () => {
  it("defines USD-only prices", () => {
    expect(planPricing.monthly.pro.USD).toBe(499);
    expect(planPricing.monthly.business.USD).toBe(999);
    expect(planPricing.yearly.pro.USD).toBe(4990);
    expect(planPricing.yearly.business.USD).toBe(9990);
  });

  it("returns USD plan prices", () => {
    expect(getPlanPrice("pro", "USD", "monthly")).toBe(499);
    expect(getPlanPrice("business", "USD", "yearly")).toBe(9990);
  });

  it("formats USD labels", () => {
    expect(formatPrice(499, "USD")).toBe("$4.99");
    expect(getPlanPriceLabel("pro", "USD")).toBe("$4.99/mo");
    expect(getMonthlyEquivalentLabel("pro", "USD")).toBe("$4.16/mo");
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("keeps yearly discount", () => {
    expect(getYearlySavingsPercent("pro", "USD")).toBeGreaterThan(0);
  });
});
