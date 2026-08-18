import { describe, expect, it } from "vitest";

import {
  formatPrice,
  getCurrencySymbol,
  getMonthlyEquivalentLabel,
  getPlanPrice,
  getPlanPriceLabel,
  planPricing,
} from "@/lib/billing/plans";

describe("lib/billing/plans", () => {
  it("defines USD and PHP prices for the new tiers", () => {
    expect(planPricing.monthly.pro.USD).toBe(900);
    expect(planPricing.monthly.pro.PHP).toBe(49900);
    expect(planPricing.monthly.business.USD).toBe(2400);
    expect(planPricing.monthly.business.PHP).toBe(129900);
    expect(planPricing.yearly.pro.USD).toBe(9000);
    expect(planPricing.yearly.pro.PHP).toBe(499000);
    expect(planPricing.yearly.business.USD).toBe(24000);
    expect(planPricing.yearly.business.PHP).toBe(1299000);
  });

  it("returns plan prices", () => {
    expect(getPlanPrice("pro", "USD", "monthly")).toBe(900);
    expect(getPlanPrice("business", "USD", "yearly")).toBe(24000);
    expect(getPlanPrice("pro", "PHP", "monthly")).toBe(49900);
    expect(getPlanPrice("business", "PHP", "yearly")).toBe(1299000);
  });

  it("formats USD labels", () => {
    expect(formatPrice(900, "USD")).toBe("$9.00");
    expect(getPlanPriceLabel("pro", "USD")).toBe("$9.00/mo");
    expect(getMonthlyEquivalentLabel("pro", "USD")).toBe("$7.50/mo");
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("formats PHP labels in whole pesos", () => {
    expect(formatPrice(49900, "PHP")).toBe("₱499");
    expect(formatPrice(129900, "PHP")).toBe("₱1,299");
    expect(getPlanPriceLabel("pro", "PHP")).toBe("₱499/mo");
    expect(getPlanPriceLabel("business", "PHP", "yearly")).toBe("₱12,990/yr");
    expect(getCurrencySymbol("PHP")).toBe("₱");
  });

  it("bills yearly as two months free (10 for 12)", () => {
    for (const plan of ["pro", "business"] as const) {
      for (const currency of ["USD", "PHP"] as const) {
        const monthlyTotal = getPlanPrice(plan, currency, "monthly") * 12;
        const yearly = getPlanPrice(plan, currency, "yearly");
        expect(yearly).toBe(Math.round((monthlyTotal * 10) / 12));
      }
    }
  });
});
