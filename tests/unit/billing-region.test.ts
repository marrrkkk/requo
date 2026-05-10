import { describe, expect, it } from "vitest";

import {
  getBillingRegion,
  getBillingRegionFromCountry,
  getDefaultCurrency,
  getDefaultProvider,
  getProviderForCurrency,
} from "@/lib/billing/region";

describe("lib/billing/region", () => {
  it("always resolves global billing region", () => {
    expect(getBillingRegion(new Headers())).toBe("global");
    expect(
      getBillingRegion(
        new Headers({
          "cf-ipcountry": "PH",
          "x-vercel-ip-country": "US",
        }),
      ),
    ).toBe("global");
  });

  it("always resolves global from country", () => {
    expect(getBillingRegionFromCountry("PH")).toBe("global");
    expect(getBillingRegionFromCountry("US")).toBe("global");
    expect(getBillingRegionFromCountry(null)).toBe("global");
  });

  it("always uses USD + Paddle defaults", () => {
    expect(getDefaultCurrency("global")).toBe("USD");
    expect(getDefaultProvider("global")).toBe("paddle");
    expect(getProviderForCurrency("USD")).toBe("paddle");
  });
});
