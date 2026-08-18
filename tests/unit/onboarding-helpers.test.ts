import { describe, expect, it } from "vitest";

import {
  createOnboardingPreviewBusiness,
  getRecommendedStarterWorkflowForBusinessType,
  resolveOnboardingCurrencyChange,
  type OnboardingDraft,
} from "@/features/onboarding/helpers";

function createDraft(
  overrides: Partial<OnboardingDraft> = {},
): OnboardingDraft {
  return {
    firstName: "Alicia",
    lastName: "Cruz",
    businessName: "Northline Studio",
    businessSlug: "northline-studio",
    businessType: "web_it_services",
    starterWorkflow: "project_quote",
    countryCode: "US",
    defaultCurrency: "USD",
    customerContactChannel: "email",
    jobTitle: "Owner",
    companySize: "2-5 people",
    referralSource: "Google Search",
    ...overrides,
  };
}

describe("features/onboarding/helpers", () => {
  describe("getRecommendedStarterWorkflowForBusinessType", () => {
    it("maps business categories to recommended workflows", () => {
      expect(
        getRecommendedStarterWorkflowForBusinessType("web_it_services"),
      ).toBe("project_quote");
      expect(
        getRecommendedStarterWorkflowForBusinessType("cleaning_services"),
      ).toBe("recurring_service");
      expect(
        getRecommendedStarterWorkflowForBusinessType(
          "consulting_professional_services",
        ),
      ).toBe("consultation_proposal");
    });

    it("defaults to project_quote for empty business type", () => {
      expect(getRecommendedStarterWorkflowForBusinessType("")).toBe(
        "project_quote",
      );
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
    it("builds preview defaults from the selected workflow while keeping the chosen business category", () => {
      const preview = createOnboardingPreviewBusiness(createDraft());

      expect(preview.businessType).toBe("web_it_services");
      expect(preview.form.businessType).toBe("web_it_services");
      expect(preview.inquiryPageConfig.headline).toContain("Northline Studio");
      expect(preview.inquiryFormConfig.projectFields.length).toBeGreaterThan(0);
    });

    it("falls back to the recommended starter workflow when none is selected yet", () => {
      const preview = createOnboardingPreviewBusiness(
        createDraft({
          starterWorkflow: "",
          businessType: "cleaning_services",
        }),
      );

      expect(preview.businessType).toBe("cleaning_services");
    });
  });
});
