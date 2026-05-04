import { describe, expect, it } from "vitest";

import {
  createInquiryFormConfigDefaults,
  type InquiryFormCustomFieldDefinition,
} from "@/features/inquiries/form-config";
import { createInquiryPageConfigDefaults } from "@/features/inquiries/page-config";
import {
  countInquiryCustomFields,
  resolveInquiryFormConfigForPlan,
  resolveInquiryPageConfigForPlan,
} from "@/features/inquiries/plan-rules";

function customField(index: number): InquiryFormCustomFieldDefinition {
  return {
    kind: "custom",
    id: `custom_${index}`,
    fieldType: "short_text",
    label: `Custom ${index}`,
    required: false,
  };
}

describe("features/inquiries/plan-rules", () => {
  it("limits free inquiry forms to four custom fields", () => {
    const config = createInquiryFormConfigDefaults({
      businessType: "general_project_services",
    });
    const customFields = Array.from({ length: 6 }, (_, index) =>
      customField(index + 1),
    );
    const resolved = resolveInquiryFormConfigForPlan(
      {
        ...config,
        projectFields: [...config.projectFields, ...customFields],
      },
      "free",
    );

    expect(countInquiryCustomFields(resolved)).toBe(4);
    expect(
      resolved.projectFields
        .filter((field) => field.kind === "custom")
        .map((field) => field.id),
    ).toEqual(["site-location", "custom_1", "custom_2", "custom_3"]);
  });

  it("forces free inquiry pages to the no supporting cards layout", () => {
    const config = createInquiryPageConfigDefaults({
      businessName: "Northline",
      template: "split",
    });
    const resolved = resolveInquiryPageConfigForPlan(
      {
        ...config,
        showSupportingCards: true,
        showShowcaseImage: true,
      },
      "free",
    );

    expect(resolved).toEqual(
      expect.objectContaining({
        template: "no_supporting_cards",
        showSupportingCards: false,
        showShowcaseImage: false,
      }),
    );
  });

  it("keeps paid inquiry page customization intact", () => {
    const config = createInquiryPageConfigDefaults({
      businessName: "Northline",
      plan: "pro",
      template: "showcase",
    });

    expect(resolveInquiryPageConfigForPlan(config, "pro")).toEqual(config);
  });
});
