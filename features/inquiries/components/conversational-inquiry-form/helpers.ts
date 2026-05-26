import {
  getInquiryFormFieldInputName,
} from "@/features/inquiries/form-config";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import type { CustomFieldMetaItem } from "./types";

let messageIdCounter = 0;
export function createMessageId() {
  messageIdCounter += 1;
  return `msg_${messageIdCounter}_${Date.now()}`;
}

/**
 * Build a map of all custom field input names from the form config, with
 * their labels and default empty values.
 */
export function getCustomFieldMeta(business: PublicInquiryBusiness): CustomFieldMetaItem[] {
  const fields: CustomFieldMetaItem[] = [];

  for (const field of business.inquiryFormConfig.projectFields) {
    if (field.kind !== "custom") continue;

    fields.push({
      inputName: getInquiryFormFieldInputName(field),
      fieldId: field.id,
      label: field.label,
      required: field.required,
      fieldType: field.fieldType,
    });
  }

  return fields;
}

/** Derive chatbot display config from the form's conversational mode. */
export function getChatbotConfig(business: PublicInquiryBusiness) {
  const conv = business.inquiryFormConfig.conversationalMode;

  return {
    assistantName: conv?.assistantName || `${business.name} Assistant`,
  };
}
