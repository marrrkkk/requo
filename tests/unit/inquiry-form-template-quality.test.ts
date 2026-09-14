import { describe, expect, it } from "vitest";

import {
  createInquiryFormConfigDefaults,
  getNormalizedInquiryFormConfig,
} from "@/features/inquiries/form-config";
import { businessTypes } from "@/features/inquiries/business-types";

describe("inquiry form template quality", () => {
  it("has exactly one large brief textbox per business type (no double brief)", () => {
    for (const businessType of businessTypes) {
      const config = createInquiryFormConfigDefaults({ businessType });

      const largeTextFields = config.projectFields.filter(
        (f) =>
          (f.kind === "system" && f.key === "details") ||
          (f.kind === "custom" && f.fieldType === "long_text"),
      );

      expect(
        largeTextFields,
        `${businessType} should have exactly one brief textbox`,
      ).toHaveLength(1);
    }
  });

  it("never asks a yes/no file-readiness question next to the direct upload", () => {
    for (const businessType of businessTypes) {
      const config = createInquiryFormConfigDefaults({ businessType });

      const readinessFields = config.projectFields.filter(
        (f) =>
          f.kind === "custom" &&
          (f.id === "reference-materials-ready" ||
            f.label.toLowerCase().includes("files ready")),
      );

      expect(
        readinessFields,
        `${businessType} should not ask if files are ready`,
      ).toHaveLength(0);
    }
  });

  it("offers a direct optional file upload in every template", () => {
    for (const businessType of businessTypes) {
      const config = createInquiryFormConfigDefaults({ businessType });

      const attachment = config.projectFields.find(
        (f) => f.kind === "system" && f.key === "attachment",
      );

      expect(attachment, `${businessType} should offer a file upload`).toBeDefined();

      if (attachment?.kind === "system") {
        expect(attachment.enabled).toBe(true);
        expect(attachment.required).toBe(false);
      }
    }
  });

  it("strips removed duplicate-brief fields from persisted configs", () => {
    const config = createInquiryFormConfigDefaults({
      businessType: "creative_marketing_services",
    });

    const legacy = {
      ...config,
      projectFields: [
        ...config.projectFields,
        {
          kind: "custom",
          id: "deliverables",
          fieldType: "long_text",
          label: "Deliverables",
          required: true,
        },
        {
          kind: "custom",
          id: "reference-materials-ready",
          fieldType: "boolean",
          label: "Reference files ready?",
          required: false,
        },
        {
          kind: "custom",
          id: "goal",
          fieldType: "long_text",
          label: "Goal",
          required: true,
        },
      ],
    };

    const normalized = getNormalizedInquiryFormConfig(legacy, {
      businessType: "creative_marketing_services",
    });

    const remainingIds = normalized.projectFields.map((f) =>
      f.kind === "system" ? f.key : f.id,
    );

    expect(remainingIds).not.toContain("deliverables");
    expect(remainingIds).not.toContain("reference-materials-ready");
    expect(remainingIds).not.toContain("goal");
    expect(remainingIds).toContain("details");
    expect(remainingIds).toContain("attachment");
  });
});
