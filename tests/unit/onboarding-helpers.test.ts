import { describe, expect, it } from "vitest";

import {
  createOnboardingPreviewBusiness,
  createEmptyOnboardingDraft,
  getDefaultOnboardingServiceName,
  getRecommendedStarterWorkflowForBusinessType,
  resolveFirstServiceNameOnTypeChange,
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
    services: [{ name: "Project inquiry" }],
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

  describe("getDefaultOnboardingServiceName", () => {
    it("derives the preset name from the business type", () => {
      expect(getDefaultOnboardingServiceName("cleaning_services")).toBe(
        "Service inquiry",
      );
      expect(getDefaultOnboardingServiceName("web_it_services")).toBe(
        "Project inquiry",
      );
    });

    it("falls back to a generic name for an empty business type", () => {
      expect(getDefaultOnboardingServiceName("")).toBe("Project inquiry");
    });
  });

  describe("resolveFirstServiceNameOnTypeChange", () => {
    it("updates an untouched pre-filled first service name to the new type", () => {
      const services = resolveFirstServiceNameOnTypeChange({
        services: [{ name: "Project inquiry" }, { name: "SEO audit" }],
        previousBusinessType: "web_it_services",
        nextBusinessType: "cleaning_services",
      });

      expect(services[0]?.name).toBe("Service inquiry");
      expect(services[1]?.name).toBe("SEO audit");
    });

    it("keeps a name the owner edited themselves", () => {
      const services = resolveFirstServiceNameOnTypeChange({
        services: [{ name: "Website packages" }],
        previousBusinessType: "web_it_services",
        nextBusinessType: "cleaning_services",
      });

      expect(services[0]?.name).toBe("Website packages");
    });

    it("updates a blank first row", () => {
      const services = resolveFirstServiceNameOnTypeChange({
        services: [{ name: "" }],
        previousBusinessType: "web_it_services",
        nextBusinessType: "consulting_professional_services",
      });

      expect(services[0]?.name).toBe("Discovery inquiry");
    });

    it("does nothing when the type has not changed", () => {
      const services = [{ name: "Project inquiry" }];

      expect(
        resolveFirstServiceNameOnTypeChange({
          services,
          previousBusinessType: "web_it_services",
          nextBusinessType: "web_it_services",
        }),
      ).toBe(services);
    });
  });

  describe("createEmptyOnboardingDraft", () => {
    it("starts with a single blank service row", () => {
      expect(createEmptyOnboardingDraft().services).toEqual([{ name: "" }]);
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
