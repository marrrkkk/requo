import { describe, expect, it } from "vitest";

import {
  getRecommendedStarterWorkflow,
  starterWorkflowKeys,
  type StarterWorkflowKey,
} from "@/features/businesses/starter-workflows";
import {
  businessTypes,
  type BusinessType,
} from "@/features/inquiries/business-types";

describe("features/businesses/starter-workflows", () => {
  describe("getRecommendedStarterWorkflow", () => {
    it("maps every BusinessType to exactly one recommended workflow", () => {
      const results = new Map<BusinessType, StarterWorkflowKey>();

      for (const businessType of businessTypes) {
        const workflow = getRecommendedStarterWorkflow(businessType);
        results.set(businessType, workflow);

        expect(starterWorkflowKeys).toContain(workflow);
      }

      // Verify we tested all business types
      expect(results.size).toBe(businessTypes.length);
    });

    it("recommends recurring_service for cleaning, landscaping, and pet services", () => {
      expect(getRecommendedStarterWorkflow("cleaning_services")).toBe(
        "recurring_service",
      );
      expect(getRecommendedStarterWorkflow("landscaping_outdoor_services")).toBe(
        "recurring_service",
      );
      expect(getRecommendedStarterWorkflow("pet_services")).toBe(
        "recurring_service",
      );
    });

    it("recommends consultation_proposal for consulting/professional services", () => {
      expect(
        getRecommendedStarterWorkflow("consulting_professional_services"),
      ).toBe("consultation_proposal");
    });

    it("recommends project_quote for all other business types", () => {
      const projectQuoteTypes: BusinessType[] = [
        "contractor_home_improvement",
        "print_signage",
        "fabrication_custom_build",
        "creative_marketing_services",
        "web_it_services",
        "photo_video_production",
        "event_services_rentals",
        "repair_services",
        "moving_relocation",
        "auto_services",
        "general_project_services",
      ];

      for (const businessType of projectQuoteTypes) {
        expect(getRecommendedStarterWorkflow(businessType)).toBe(
          "project_quote",
        );
      }
    });

    it("uses project_quote as fallback for general_project_services", () => {
      expect(getRecommendedStarterWorkflow("general_project_services")).toBe(
        "project_quote",
      );
    });

    it("returns a valid StarterWorkflowKey for every input", () => {
      for (const businessType of businessTypes) {
        const workflow = getRecommendedStarterWorkflow(businessType);
        expect(typeof workflow).toBe("string");
        expect(starterWorkflowKeys).toContain(workflow);
      }
    });
  });
});
