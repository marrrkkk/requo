import { describe, expect, it } from "vitest";

import {
  createInquiryFormConfigDefaults,
  getNormalizedInquiryFormConfig,
  inquiryFormConfigSchema,
} from "@/features/inquiries/form-config";
import {
  inquirySourceLabels,
  normalizeInquirySource,
} from "@/features/inquiries/types";
import { getInquirySourceLabel } from "@/features/inquiries/utils";

describe("service-owned inquiry forms", () => {
  it("has no customer-facing service selector in defaults", () => {
    const config = createInquiryFormConfigDefaults({
      businessType: "general_project_services",
    });

    expect(
      config.projectFields.some(
        (f) =>
          (f.kind === "system" &&
            (f as { key?: string }).key === "serviceCategory") ||
          (f.kind === "custom" &&
            (f as { id?: string }).id === "serviceCategory"),
      ),
    ).toBe(false);
  });

  it("labels the required description generically", () => {
    const config = createInquiryFormConfigDefaults({
      businessType: "general_project_services",
    });
    const details = config.projectFields.find(
      (f) => f.kind === "system" && f.key === "details",
    );

    expect(details?.kind).toBe("system");
    if (details?.kind === "system") {
      expect(details.label).toBe("What do you need help with?");
      expect(details.enabled).toBe(true);
      expect(details.required).toBe(true);
    }
  });

  it("keeps contact fields locked enabled+required", () => {
    const config = createInquiryFormConfigDefaults({
      businessType: "general_project_services",
    });

    expect(config.contactFields.customerName).toMatchObject({
      enabled: true,
      required: true,
    });
    expect(config.contactFields.email).toMatchObject({
      enabled: true,
      required: true,
    });
    expect(config.contactFields.preferredContact).toMatchObject({
      enabled: true,
      required: true,
    });
  });

  it("keeps timing/budget configurable and attachment optional", () => {
    const config = createInquiryFormConfigDefaults({
      businessType: "general_project_services",
    });

    const hiddenTiming = {
      ...config,
      projectFields: config.projectFields.map((f) =>
        f.kind === "system" && f.key === "requestedDeadline"
          ? { ...f, enabled: false, required: false }
          : f,
      ),
    };
    expect(inquiryFormConfigSchema.safeParse(hiddenTiming).success).toBe(true);

    const requiredBudget = {
      ...config,
      projectFields: config.projectFields.map((f) =>
        f.kind === "system" && f.key === "budgetText"
          ? { ...f, required: true }
          : f,
      ),
    };
    expect(inquiryFormConfigSchema.safeParse(requiredBudget).success).toBe(true);

    const requiredAttachment = {
      ...config,
      projectFields: config.projectFields.map((f) =>
        f.kind === "system" && f.key === "attachment"
          ? { ...f, required: true }
          : f,
      ),
    };
    expect(inquiryFormConfigSchema.safeParse(requiredAttachment).success).toBe(
      false,
    );
  });

  it("rejects a customer-facing service selector", () => {
    const config = createInquiryFormConfigDefaults({
      businessType: "general_project_services",
    });
    const withLegacy = {
      ...config,
      projectFields: [
        ...config.projectFields,
        {
          kind: "system",
          key: "serviceCategory",
          label: "Service needed",
          enabled: true,
          required: true,
        },
      ],
    };

    expect(inquiryFormConfigSchema.safeParse(withLegacy).success).toBe(false);
  });

  it("strips legacy serviceCategory from persisted configs", () => {
    const config = createInquiryFormConfigDefaults({
      businessType: "general_project_services",
    });
    const legacy = {
      ...config,
      projectFields: [
        ...config.projectFields,
        {
          kind: "system",
          key: "serviceCategory",
          label: "Service needed",
          enabled: true,
          required: true,
        },
      ],
    };

    const normalized = getNormalizedInquiryFormConfig(legacy, {
      businessType: "general_project_services",
    });

    expect(
      normalized.projectFields.some(
        (f) =>
          f.kind === "system" &&
          (f as { key?: string }).key === "serviceCategory",
      ),
    ).toBe(false);
    expect(
      normalized.projectFields.some(
        (f) => f.kind === "system" && f.key === "details",
      ),
    ).toBe(true);
  });
});

describe("inquiry source model", () => {
  it("exposes canonical human-readable labels", () => {
    expect(inquirySourceLabels.service_form).toBe("Service Form");
    expect(inquirySourceLabels.ai_assistant).toBe("AI Assistant");
    expect(inquirySourceLabels.manual).toBe("Manual");
    expect(inquirySourceLabels.api).toBe("API");
    expect(inquirySourceLabels.unknown).toBe("Unknown");
  });

  it("normalizes legacy source strings forward", () => {
    expect(normalizeInquirySource("public-inquiry-page")).toBe("service_form");
    expect(normalizeInquirySource("manual-dashboard")).toBe("manual");
    expect(normalizeInquirySource("ai_agent")).toBe("ai_assistant");
    expect(normalizeInquirySource("ai_agent_handoff")).toBe("ai_assistant");
    expect(normalizeInquirySource("ai")).toBe("ai_assistant");
  });

  it("falls back to Unknown instead of guessing", () => {
    expect(normalizeInquirySource(null)).toBe("unknown");
    expect(normalizeInquirySource(undefined)).toBe("unknown");
    expect(normalizeInquirySource("plumbing")).toBe("unknown");
    expect(getInquirySourceLabel(null)).toBe("Unknown");
    expect(getInquirySourceLabel("plumbing")).toBe("Unknown");
  });
});
