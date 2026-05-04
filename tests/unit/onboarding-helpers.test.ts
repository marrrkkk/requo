import { describe, expect, it } from "vitest";

import {
  createOnboardingPreviewBusiness,
  getRecommendedStarterTemplateForBusinessType,
  resolveOnboardingCurrencyChange,
  type OnboardingDraft,
} from "@/features/onboarding/helpers";

function createDraft(
  overrides: Partial<OnboardingDraft> = {},
): OnboardingDraft {
  return {
    workspaceName: "Northline Workspace",
    businessName: "Northline Studio",
    businessType: "web_it_services",
    starterTemplateBusinessType: "creative_marketing_services",
    countryCode: "US",
    defaultCurrency: "USD",
    jobTitle: "Owner",
    companySize: "2-5 people",
    referralSource: "Google Search",
    ...overrides,
  };
}

describe("features/onboarding/helpers", () => {
  describe("getRecommendedStarterTemplateForBusinessType", () => {
    it("maps detailed business categories to the closest starter template", () => {
      expect(
        getRecommendedStarterTemplateForBusinessType("web_it_services"),
      ).toBe("creative_marketing_services");
      expect(
        getRecommendedStarterTemplateForBusinessType("repair_services"),
      ).toBe("contractor_home_improvement");
      expect(
        getRecommendedStarterTemplateForBusinessType(
          "consulting_professional_services",
        ),
      ).toBe("consulting_professional_services");
    });
  });

  describe("resolveOnboardingCurrencyChange", () => {
    it("updates the currency when the current value still matches the previous country default", () => {
      const result = resolveOnboardingCurrencyChange({
        currentCurrency: "USD",
        previousCountryCode: "US",
        nextCountryCode: "PH",
      });

      expect(result).toBe("PHP");
    });

    it("preserves a manually chosen currency when the country changes", () => {
      const result = resolveOnboardingCurrencyChange({
        currentCurrency: "EUR",
        previousCountryCode: "US",
        nextCountryCode: "PH",
      });

      expect(result).toBe("EUR");
    });
  });

  describe("createOnboardingPreviewBusiness", () => {
    it("builds preview defaults from the selected starter template while keeping the chosen business category", () => {
      const preview = createOnboardingPreviewBusiness(createDraft());

      expect(preview.businessType).toBe("web_it_services");
      expect(preview.form.businessType).toBe("creative_marketing_services");
      expect(preview.inquiryPageConfig.headline).toContain("Northline Studio");
      expect(preview.inquiryFormConfig.projectFields.length).toBeGreaterThan(0);
    });

    it("falls back to the recommended starter template when none is selected yet", () => {
      const preview = createOnboardingPreviewBusiness(
        createDraft({
          starterTemplateBusinessType: "",
          businessType: "repair_services",
        }),
      );

      expect(preview.form.businessType).toBe("contractor_home_improvement");
    });
  });
});
