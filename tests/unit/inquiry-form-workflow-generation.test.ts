import { describe, expect, it } from "vitest";

import { createInquiryFormConfigDefaults } from "@/features/inquiries/form-config";
import {
  starterWorkflowKeys,
  type StarterWorkflowKey,
} from "@/features/businesses/starter-workflows";
import {
  businessTypes,
  type BusinessType,
} from "@/features/inquiries/business-types";

describe("inquiry form generation with workflows", () => {
  describe("backward compatibility without explicit workflow", () => {
    it("generates valid form config for every BusinessType without starterWorkflow param", () => {
      for (const businessType of businessTypes) {
        const config = createInquiryFormConfigDefaults({ businessType });

        expect(config.version).toBe(1);
        expect(config.businessType).toBe(businessType);
        expect(config.contactFields.customerName).toBeDefined();
        expect(config.contactFields.email).toBeDefined();
        expect(config.contactFields.preferredContact).toBeDefined();
        expect(config.projectFields.length).toBeGreaterThan(0);

        // Verify required fields exist
        const serviceCategoryFields = config.projectFields.filter(
          (f) => f.kind === "system" && f.key === "serviceCategory",
        );
        const detailsFields = config.projectFields.filter(
          (f) => f.kind === "system" && f.key === "details",
        );

        expect(serviceCategoryFields).toHaveLength(1);
        expect(detailsFields).toHaveLength(1);
      }
    });

    it("uses business type to derive workflow when starterWorkflow is absent", () => {
      // Cleaning services should get recurring service fields
      const cleaningConfig = createInquiryFormConfigDefaults({
        businessType: "cleaning_services",
      });

      const hasFrequencyField = cleaningConfig.projectFields.some(
        (f) => f.kind === "custom" && f.id === "frequency",
      );
      expect(hasFrequencyField).toBe(true);

      // Consulting should get consultation fields
      const consultingConfig = createInquiryFormConfigDefaults({
        businessType: "consulting_professional_services",
      });

      const hasGoalField = consultingConfig.projectFields.some(
        (f) => f.kind === "custom" && f.id === "goal",
      );
      expect(hasGoalField).toBe(true);
    });
  });

  describe("explicit workflow selection", () => {
    it("generates valid form config for every workflow key", () => {
      for (const starterWorkflow of starterWorkflowKeys) {
        const config = createInquiryFormConfigDefaults({
          businessType: "general_project_services",
          starterWorkflow,
        });

        expect(config.version).toBe(1);
        expect(config.contactFields.customerName).toBeDefined();
        expect(config.projectFields.length).toBeGreaterThan(0);

        // Verify required system fields exist
        const serviceCategoryFields = config.projectFields.filter(
          (f) => f.kind === "system" && f.key === "serviceCategory",
        );
        const detailsFields = config.projectFields.filter(
          (f) => f.kind === "system" && f.key === "details",
        );

        expect(serviceCategoryFields).toHaveLength(1);
        expect(detailsFields).toHaveLength(1);
        expect(serviceCategoryFields[0]?.required).toBe(true);
        expect(detailsFields[0]?.required).toBe(true);
      }
    });

    it("generates recurring service fields when starterWorkflow is recurring_service", () => {
      const config = createInquiryFormConfigDefaults({
        businessType: "contractor_home_improvement", // Different business type
        starterWorkflow: "recurring_service", // But explicit workflow
      });

      // Should have recurring-specific fields
      const hasFrequencyField = config.projectFields.some(
        (f) => f.kind === "custom" && f.id === "frequency",
      );
      const hasPropertySizeField = config.projectFields.some(
        (f) => f.kind === "custom" && f.id === "property-size",
      );

      expect(hasFrequencyField).toBe(true);
      expect(hasPropertySizeField).toBe(true);

      // Should NOT have contractor-specific fields
      const hasPropertyTypeField = config.projectFields.some(
        (f) => f.kind === "custom" && f.id === "property-type",
      );
      expect(hasPropertyTypeField).toBe(false);
    });

    it("generates consultation fields when starterWorkflow is consultation_proposal", () => {
      const config = createInquiryFormConfigDefaults({
        businessType: "event_services_rentals", // Different business type
        starterWorkflow: "consultation_proposal", // But explicit workflow
      });

      // Should have consultation-specific fields
      const hasGoalField = config.projectFields.some(
        (f) => f.kind === "custom" && f.id === "goal",
      );
      const hasFormatField = config.projectFields.some(
        (f) => f.kind === "custom" && f.id === "format",
      );

      expect(hasGoalField).toBe(true);
      expect(hasFormatField).toBe(true);

      // Should NOT have event-specific fields
      const hasEventDateField = config.projectFields.some(
        (f) => f.kind === "custom" && f.id === "event-date",
      );
      expect(hasEventDateField).toBe(false);
    });

    it("generates project quote fields when starterWorkflow is project_quote", () => {
      const config = createInquiryFormConfigDefaults({
        businessType: "cleaning_services", // Normally recurring service
        starterWorkflow: "project_quote", // But explicit project quote workflow
      });

      // Should NOT have recurring-specific fields
      const hasFrequencyField = config.projectFields.some(
        (f) => f.kind === "custom" && f.id === "frequency",
      );
      expect(hasFrequencyField).toBe(false);

      // Should have general project fields or business-type-appropriate project fields
      const hasServiceCategoryField = config.projectFields.some(
        (f) => f.kind === "system" && f.key === "serviceCategory",
      );
      const hasDetailsField = config.projectFields.some(
        (f) => f.kind === "system" && f.key === "details",
      );

      expect(hasServiceCategoryField).toBe(true);
      expect(hasDetailsField).toBe(true);
    });

    it("explicit workflow overrides business type recommendation", () => {
      // Landscaping normally gets recurring_service workflow
      const configWithoutExplicit = createInquiryFormConfigDefaults({
        businessType: "landscaping_outdoor_services",
      });

      const hasFrequency1 = configWithoutExplicit.projectFields.some(
        (f) => f.kind === "custom" && f.id === "frequency",
      );
      expect(hasFrequency1).toBe(true);

      // But explicit consultation_proposal should override
      const configWithExplicit = createInquiryFormConfigDefaults({
        businessType: "landscaping_outdoor_services",
        starterWorkflow: "consultation_proposal",
      });

      const hasFrequency2 = configWithExplicit.projectFields.some(
        (f) => f.kind === "custom" && f.id === "frequency",
      );
      const hasGoal = configWithExplicit.projectFields.some(
        (f) => f.kind === "custom" && f.id === "goal",
      );

      expect(hasFrequency2).toBe(false);
      expect(hasGoal).toBe(true);
    });
  });

  describe("form config validation", () => {
    it("preserves businessType in generated config regardless of workflow", () => {
      const businessType: BusinessType = "creative_marketing_services";

      for (const starterWorkflow of starterWorkflowKeys) {
        const config = createInquiryFormConfigDefaults({
          businessType,
          starterWorkflow,
        });

        expect(config.businessType).toBe(businessType);
      }
    });

    it("ensures all required contact fields are enabled and required", () => {
      for (const starterWorkflow of starterWorkflowKeys) {
        const config = createInquiryFormConfigDefaults({
          businessType: "general_project_services",
          starterWorkflow,
        });

        expect(config.contactFields.customerName.enabled).toBe(true);
        expect(config.contactFields.customerName.required).toBe(true);
        expect(config.contactFields.email?.enabled).toBe(true);
        expect(config.contactFields.email?.required).toBe(true);
        expect(config.contactFields.preferredContact.enabled).toBe(true);
        expect(config.contactFields.preferredContact.required).toBe(true);
      }
    });

    it("ensures serviceCategory and details fields are always required", () => {
      for (const starterWorkflow of starterWorkflowKeys) {
        const config = createInquiryFormConfigDefaults({
          businessType: "general_project_services",
          starterWorkflow,
        });

        const serviceField = config.projectFields.find(
          (f) => f.kind === "system" && f.key === "serviceCategory",
        );
        const detailsField = config.projectFields.find(
          (f) => f.kind === "system" && f.key === "details",
        );

        expect(serviceField).toBeDefined();
        if (serviceField?.kind === "system") {
          expect(serviceField.enabled).toBe(true);
          expect(serviceField.required).toBe(true);
        }

        expect(detailsField).toBeDefined();
        if (detailsField?.kind === "system") {
          expect(detailsField.enabled).toBe(true);
          expect(detailsField.required).toBe(true);
        }
      }
    });
  });
});
