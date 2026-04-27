import { describe, expect, it } from "vitest";

import { getInquiryFormFieldInputName } from "@/features/inquiries/form-config";
import { createInquiryFormConfigDefaults } from "@/features/inquiries/form-config";
import {
  createManualQuickInquiryFormConfig,
  validateManualQuickInquirySubmission,
  validatePublicInquirySubmission,
} from "@/features/inquiries/schemas";

const baseConfig = createInquiryFormConfigDefaults({
  businessType: "general_project_services",
});

type InquiryValidationResult = ReturnType<typeof validatePublicInquirySubmission>;

function expectValidSubmission(result: InquiryValidationResult) {
  if (!result.success) {
    throw new Error("Expected inquiry submission validation to pass.");
  }

  return result.data;
}

function expectInvalidSubmission(result: InquiryValidationResult) {
  if (result.success) {
    throw new Error("Expected inquiry submission validation to fail.");
  }

  return result.error;
}

function validFormData() {
  const formData = new FormData();
  formData.set("customerName", "Taylor Nguyen");
  formData.set("customerContactMethod", "email");
  formData.set("customerContactHandle", "taylor@example.com");
  formData.set("serviceCategory", "Window graphics");
  formData.set("requestedDeadline", "2026-05-15");
  formData.set("budgetText", "Around $1,500");
  formData.set(
    "details",
    "Need two storefront panels and a door decal for a spring launch.",
  );

  return formData;
}

describe("inquiry validation schemas", () => {
  it("normalizes public inquiry submissions and captures submitted field snapshots", () => {
    const result = validatePublicInquirySubmission(baseConfig, validFormData());
    const data = expectValidSubmission(result);

    expect(data).toEqual(
      expect.objectContaining({
        customerName: "Taylor Nguyen",
        customerEmail: "taylor@example.com",
        customerContactMethod: "email",
        customerContactHandle: "taylor@example.com",
        serviceCategory: "Window graphics",
        requestedDeadline: "2026-05-15",
        budgetText: "Around $1,500",
      }),
    );
    expect(data.submittedFieldSnapshot.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "serviceCategory",
          displayValue: "Window graphics",
        }),
        expect.objectContaining({
          id: "details",
          displayValue:
            "Need two storefront panels and a door decal for a spring launch.",
        }),
      ]),
    );
  });

  it("rejects invalid email contact details before inquiry creation", () => {
    const formData = validFormData();
    formData.set("customerContactHandle", "not-an-email");

    const result = validatePublicInquirySubmission(baseConfig, formData);
    const error = expectInvalidSubmission(result);

    expect(error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["customerContactHandle"],
          message: "Enter a valid email address.",
        }),
      ]),
    );
  });

  it("rejects unsupported public inquiry attachments", () => {
    const attachmentField = baseConfig.projectFields.find(
      (field) => field.kind === "system" && field.key === "attachment",
    );
    const formData = validFormData();

    expect(attachmentField).toBeDefined();
    formData.set(
      getInquiryFormFieldInputName(attachmentField!),
      new File(["pretend binary"], "malware.exe", {
        type: "application/x-msdownload",
      }),
    );

    const result = validatePublicInquirySubmission(baseConfig, formData);
    const error = expectInvalidSubmission(result);

    expect(error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Upload a PDF, common document file, or image.",
        }),
      ]),
    );
  });

  it("keeps manual quick inquiry validation focused on actionable intake fields", () => {
    const quickConfig = createManualQuickInquiryFormConfig(baseConfig);

    expect(
      quickConfig.projectFields.map((field) =>
        field.kind === "system" ? field.key : field.id,
      ),
    ).toEqual([
      "serviceCategory",
      "requestedDeadline",
      "budgetText",
      "details",
    ]);

    const result = validateManualQuickInquirySubmission(
      baseConfig,
      validFormData(),
    );
    const data = expectValidSubmission(result);

    expect(data.submittedFieldSnapshot.fields).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "attachment" }),
      ]),
    );
  });
});
