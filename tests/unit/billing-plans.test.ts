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
    expect(planPricing.monthly.pro.USD).toBe(599);
    expect(planPricing.monthly.business.USD).toBe(1299);
    expect(planPricing.yearly.pro.USD).toBe(5990);
    expect(planPricing.yearly.business.USD).toBe(12990);
  });

  it("returns USD plan prices", () => {
    expect(getPlanPrice("pro", "USD", "monthly")).toBe(599);
    expect(getPlanPrice("business", "USD", "yearly")).toBe(12990);
  });

  it("formats USD labels", () => {
    expect(formatPrice(599, "USD")).toBe("$5.99");
    expect(getPlanPriceLabel("pro", "USD")).toBe("$5.99/mo");
    expect(getMonthlyEquivalentLabel("pro", "USD")).toBe("$4.99/mo");
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("keeps yearly discount", () => {
    expect(getYearlySavingsPercent("pro", "USD")).toBeGreaterThan(0);
  });
});
