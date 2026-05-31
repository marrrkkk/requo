import {
  getInquiryFormFieldInputName,
  getInquirySubmittedFieldValueDisplay,
  type InquiryContactMethod,
  type InquiryFormFieldDefinition,
} from "@/features/inquiries/form-config";
import type { ProjectValues } from "./types";

export function getPreviewValueDisplay(
  field: InquiryFormFieldDefinition,
  values: ProjectValues,
) {
  const inputName = getInquiryFormFieldInputName(field);
  const rawValue = values[inputName];

  if (Array.isArray(rawValue)) {
    return getInquirySubmittedFieldValueDisplay(rawValue.length ? rawValue : null);
  }

  if (field.kind === "custom" && field.fieldType === "boolean") {
    if (rawValue === "true") {
      return getInquirySubmittedFieldValueDisplay(true);
    }

    if (rawValue === "false") {
      return getInquirySubmittedFieldValueDisplay(false);
    }

    return getInquirySubmittedFieldValueDisplay(null);
  }

  if (typeof rawValue === "string") {
    return getInquirySubmittedFieldValueDisplay(rawValue.trim() || null);
  }

  return getInquirySubmittedFieldValueDisplay(null);
}

export function getContactHandlePlaceholder(method: InquiryContactMethod) {
  switch (method) {
    case "email":
      return "customer@example.com";
    case "phone":
      return "+63 912 345 6789";
    case "facebook":
      return "username";
    case "instagram":
      return "username";
    case "whatsapp":
      return "+63 912 345 6789";
    case "other":
      return "Best contact details";
  }
}

export function getContactHandleInputType(method: InquiryContactMethod) {
  switch (method) {
    case "email":
      return "email";
    case "phone":
    case "whatsapp":
      return "tel";
    default:
      return "text";
  }
}

export function getContactHandleInputMode(method: InquiryContactMethod) {
  switch (method) {
    case "email":
      return "email" as const;
    case "phone":
    case "whatsapp":
      return "tel" as const;
    default:
      return "text" as const;
  }
}

export function getProjectFieldMaxLength(field: InquiryFormFieldDefinition) {
  if (field.kind === "system") {
    switch (field.key) {
      case "serviceCategory":
        return 120;
      case "budgetText":
        return 120;
      case "details":
        return 4000;
      default:
        return undefined;
    }
  }

  switch (field.fieldType) {
    case "short_text":
      return 160;
    case "long_text":
      return 4000;
    default:
      return undefined;
  }
}
