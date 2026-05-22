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
    expect(planPricing.monthly.pro.USD).toBe(699);
    expect(planPricing.monthly.business.USD).toBe(1699);
    expect(planPricing.yearly.pro.USD).toBe(6990);
    expect(planPricing.yearly.business.USD).toBe(16990);
  });

  it("returns USD plan prices", () => {
    expect(getPlanPrice("pro", "USD", "monthly")).toBe(699);
    expect(getPlanPrice("business", "USD", "yearly")).toBe(16990);
  });

  it("formats USD labels", () => {
    expect(formatPrice(699, "USD")).toBe("$6.99");
    expect(getPlanPriceLabel("pro", "USD")).toBe("$6.99/mo");
    expect(getMonthlyEquivalentLabel("pro", "USD")).toBe("$5.83/mo");
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("keeps yearly discount", () => {
    expect(getYearlySavingsPercent("pro", "USD")).toBeGreaterThan(0);
  });
});
