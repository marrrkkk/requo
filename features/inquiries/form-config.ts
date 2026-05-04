import { z } from "zod";

import { getStarterTemplateBusinessType } from "@/features/businesses/starter-templates";
import {
  businessTypes,
  normalizeBusinessType,
  type BusinessType,
} from "@/features/inquiries/business-types";

function emptyToUndefined(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function optionalText(maxLength: number) {
  return z.preprocess(
    emptyToUndefined,
    z.string().trim().max(maxLength).optional(),
  );
}

export const inquiryCustomFieldTypes = [
  "short_text",
  "long_text",
  "select",
  "multi_select",
  "number",
  "date",
  "boolean",
] as const;

export type InquiryCustomFieldType = (typeof inquiryCustomFieldTypes)[number];

export const inquiryFieldKinds = ["contact", "system", "custom"] as const;
export type InquiryFieldKind = (typeof inquiryFieldKinds)[number];

export const inquiryContactFieldKeys = [
  "customerName",
  "preferredContact",
] as const;

export type InquiryContactFieldKey = (typeof inquiryContactFieldKeys)[number];

/**
 * Fixed labels for contact fields in inquiry detail display.
 * These labels are used on the dashboard/detail side and cannot be renamed.
 * The form-facing labels (e.g. "Your name") remain editable for public form UX.
 */
export const contactFieldFixedLabels: Record<InquiryContactFieldKey, string> = {
  customerName: "Name",
  preferredContact: "Preferred Contact Method",
};

/**
 * Default labels for system (default inquiry) fields.
 * Used as fallback when no snapshot label is available.
 */
export const systemFieldDefaultLabels: Record<InquiryProjectSystemFieldKey, string> = {
  serviceCategory: "Service",
  requestedDeadline: "Deadline",
  budgetText: "Budget",
  details: "Message",
  attachment: "Attachment",
};

export const inquiryContactMethods = [
  "email",
  "phone",
  "facebook",
  "instagram",
  "whatsapp",
  "other",
] as const;

export type InquiryContactMethod = (typeof inquiryContactMethods)[number];

export const inquiryContactMethodLabels: Record<InquiryContactMethod, string> = {
  email: "Email Address",
  phone: "Phone Number",
  facebook: "Facebook URL",
  instagram: "Instagram Handle",
  whatsapp: "WhatsApp Number",
  other: "Other Contact Info",
};

export const inquiryProjectSystemFieldKeys = [
  "serviceCategory",
  "requestedDeadline",
  "budgetText",
  "details",
  "attachment",
] as const;

export type InquiryProjectSystemFieldKey =
  (typeof inquiryProjectSystemFieldKeys)[number];

export const inquiryCustomFieldTypeMeta: Record<
  InquiryCustomFieldType,
  { label: string }
> = {
  short_text: { label: "Short text" },
  long_text: { label: "Long text" },
  select: { label: "Select" },
  multi_select: { label: "Multi-select" },
  number: { label: "Number" },
  date: { label: "Date" },
  boolean: { label: "Yes / No" },
};

export type InquiryFieldOption = {
  id: string;
  label: string;
  value: string;
};

export type InquiryContactFieldConfig = {
  label: string;
  placeholder?: string;
  enabled: boolean;
  required: boolean;
};

export type InquiryFormSystemFieldDefinition = {
  kind: "system";
  key: InquiryProjectSystemFieldKey;
  label: string;
  placeholder?: string;
  enabled: boolean;
  required: boolean;
};

export type InquiryFormCustomFieldDefinition = {
  kind: "custom";
  id: string;
  fieldType: InquiryCustomFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: InquiryFieldOption[];
};

export type InquiryFormFieldDefinition =
  | InquiryFormSystemFieldDefinition
  | InquiryFormCustomFieldDefinition;

export type InquiryFormGroupLabels = {
  contact: string;
  project: string;
};

export type InquiryFormConfig = {
  version: 1;
  businessType: BusinessType;
  groupLabels: InquiryFormGroupLabels;
  contactFields: Record<InquiryContactFieldKey, InquiryContactFieldConfig>;
  projectFields: InquiryFormFieldDefinition[];
};

export type InquirySubmittedFieldSnapshotField = {
  id: string;
  label: string;
  value: string | string[] | boolean | null;
  displayValue: string;
  /** Added for field grouping in inquiry detail display. Optional for backward compat with old snapshots. */
  fieldKind?: InquiryFieldKind;
};

export type InquirySubmittedFieldSnapshot = {
  version: 1;
  businessType: BusinessType;
  fields: InquirySubmittedFieldSnapshotField[];
};

function normalizeInquiryFormConfigValue(
  value: unknown,
  fallbackBusinessType: BusinessType,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  return {
    ...value,
    businessType: normalizeBusinessType(
      (value as { businessType?: unknown }).businessType,
      fallbackBusinessType,
    ),
  };
}

function normalizeInquirySubmittedFieldSnapshotValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  return {
    ...value,
    businessType: normalizeBusinessType(
      (value as { businessType?: unknown }).businessType,
    ),
  };
}

const inquiryFieldOptionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(80),
});

const inquiryContactFieldConfigSchema = z.object({
  label: z.string().trim().min(1).max(80),
  placeholder: optionalText(160),
  enabled: z.boolean(),
  required: z.boolean(),
});

const inquiryFormGroupLabelsSchema = z
  .object({
    contact: z.string().trim().min(1).max(40),
    project: z.string().trim().min(1).max(40),
  })
  .partial();

export const inquiryFormSystemFieldSchema = z.object({
  kind: z.literal("system"),
  key: z.enum(inquiryProjectSystemFieldKeys),
  label: z.string().trim().min(1).max(80),
  placeholder: optionalText(160),
  enabled: z.boolean(),
  required: z.boolean(),
});

const inquiryFormCustomFieldBaseSchema = z.object({
  kind: z.literal("custom"),
  id: z.string().trim().min(1).max(120),
  fieldType: z.enum(inquiryCustomFieldTypes),
  label: z.string().trim().min(1).max(80),
  placeholder: optionalText(160),
  required: z.boolean(),
});

const inquiryFormCustomFieldOptionsSchema =
  inquiryFormCustomFieldBaseSchema.extend({
    fieldType: z.enum(["select", "multi_select"]),
    options: z.array(inquiryFieldOptionSchema).min(1).max(12),
  });

const inquiryFormCustomFieldSimpleSchema =
  inquiryFormCustomFieldBaseSchema.extend({
    fieldType: z.enum(["short_text", "long_text", "number", "date", "boolean"]),
    options: z.undefined().optional(),
  });

export const inquiryFormCustomFieldSchema = z.union([
  inquiryFormCustomFieldOptionsSchema,
  inquiryFormCustomFieldSimpleSchema,
]);

export const inquiryFormFieldSchema = z.union([
  inquiryFormSystemFieldSchema,
  inquiryFormCustomFieldSchema,
]);

export const inquirySubmittedFieldSnapshotFieldSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  value: z.union([z.string(), z.array(z.string()), z.boolean(), z.null()]),
  displayValue: z.string().trim().min(1).max(2000),
  fieldKind: z.enum(inquiryFieldKinds).optional(),
});

export const inquirySubmittedFieldSnapshotSchema = z.object({
  version: z.literal(1),
  businessType: z.enum(businessTypes),
  fields: z.array(inquirySubmittedFieldSnapshotFieldSchema).max(40),
});

export const inquiryFormConfigSchema = z
  .object({
    version: z.literal(1),
    businessType: z.enum(businessTypes),
    groupLabels: inquiryFormGroupLabelsSchema.optional(),
    contactFields: z.object({
      customerName: inquiryContactFieldConfigSchema,
      preferredContact: inquiryContactFieldConfigSchema,
    }),
    projectFields: z.array(inquiryFormFieldSchema).max(24),
  })
  .superRefine((value, context) => {
    const serviceCategoryFields = value.projectFields.filter(
      (field) => field.kind === "system" && field.key === "serviceCategory",
    );
    const detailsFields = value.projectFields.filter(
      (field) => field.kind === "system" && field.key === "details",
    );

    if (serviceCategoryFields.length !== 1) {
      context.addIssue({
        code: "custom",
        message: "Include exactly one service/category field.",
        path: ["projectFields"],
      });
    }

    if (detailsFields.length !== 1) {
      context.addIssue({
        code: "custom",
        message: "Include exactly one details field.",
        path: ["projectFields"],
      });
    }

    for (const contactKey of ["customerName", "preferredContact"] as const) {
      const field = value.contactFields[contactKey as keyof typeof value.contactFields];

      if (!field?.enabled || !field?.required) {
        context.addIssue({
          code: "custom",
          message: "Name and preferred contact must stay enabled and required.",
          path: ["contactFields", contactKey],
        });
      }
    }

    const ids = new Set<string>();

    for (const field of value.projectFields) {
      const id = field.kind === "system" ? field.key : field.id;

      if (ids.has(id)) {
        context.addIssue({
          code: "custom",
          message: "Each inquiry field must be unique.",
          path: ["projectFields"],
        });
      }

      ids.add(id);

      if (field.kind === "system") {
        if (
          (field.key === "serviceCategory" || field.key === "details") &&
          (!field.enabled || !field.required)
        ) {
          context.addIssue({
            code: "custom",
            message: "Service/category and details must stay enabled and required.",
            path: ["projectFields"],
          });
        }

        if (field.key === "attachment" && field.required) {
          context.addIssue({
            code: "custom",
            message: "Attachment cannot be required.",
            path: ["projectFields"],
          });
        }
      }
    }
  });

type CreateInquiryFormConfigDefaultsInput = {
  businessType?: BusinessType;
};

function getDefaultInquiryFormGroupLabels(
  businessType: BusinessType,
): InquiryFormGroupLabels {
  const contact = "Contact details";

  switch (getStarterTemplateBusinessType(businessType)) {
    case "creative_marketing_services":
      return { contact, project: "Project brief" };
    case "consulting_professional_services":
      return { contact, project: "Discovery details" };
    case "contractor_home_improvement":
      return { contact, project: "Project details" };
    case "general_project_services":
    default:
      return { contact, project: "Inquiry details" };
  }
}


function createOption(value: string, label?: string): InquiryFieldOption {
  return {
    id: value,
    label: label ?? value,
    value,
  };
}

function createSystemField(
  key: InquiryProjectSystemFieldKey,
  {
    label,
    placeholder,
    enabled = true,
    required = false,
  }: {
    label: string;
    placeholder?: string;
    enabled?: boolean;
    required?: boolean;
  },
): InquiryFormSystemFieldDefinition {
  return {
    kind: "system",
    key,
    label,
    placeholder,
    enabled,
    required,
  };
}

function createCustomField(
  id: string,
  fieldType: InquiryCustomFieldType,
  {
    label,
    placeholder,
    required = false,
    options,
  }: {
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: InquiryFieldOption[];
  },
): InquiryFormCustomFieldDefinition {
  return {
    kind: "custom",
    id,
    fieldType,
    label,
    placeholder,
    required,
    options,
  };
}

function createContactFieldConfig(): Record<InquiryContactFieldKey, InquiryContactFieldConfig> {
  return {
    customerName: {
      label: "Your name",
      placeholder: "e.g. Alicia Cruz",
      enabled: true,
      required: true,
    },
    preferredContact: {
      label: "Preferred contact method",
      placeholder: "e.g. Email",
      enabled: true,
      required: true,
    },
  };
}

function createGeneralProjectServicesFields() {
  return [
    createSystemField("serviceCategory", {
      label: "Service needed",
      placeholder: "Tell us what you need help with",
      required: true,
    }),
    createCustomField("site-location", "short_text", {
      label: "Service location",
      placeholder: "City or site address",
    }),
    createSystemField("requestedDeadline", {
      label: "Preferred timing",
      enabled: true,
    }),
    createSystemField("budgetText", {
      label: "Budget range",
      enabled: true,
    }),
    createSystemField("details", {
      label: "Inquiry details",
      placeholder: "Share the scope, size, timing, and anything we should review before pricing.",
      required: true,
    }),
    createSystemField("attachment", {
      label: "Reference files",
      enabled: true,
    }),
  ] satisfies InquiryFormFieldDefinition[];
}

function normalizeLegacyContactFieldLabel(
  field: InquiryContactFieldConfig,
  _contactKey: InquiryContactFieldKey,
): InquiryContactFieldConfig {
  return field;
}

function createContractorHomeImprovementFields() {
  return [
    createSystemField("serviceCategory", {
      label: "Project or service needed",
      placeholder: "Remodel, install, repair, cleanup",
      required: true,
    }),
    createCustomField("service-address", "short_text", {
      label: "Service location",
      placeholder: "Street, city, or service area",
    }),
    createCustomField("property-type", "select", {
      label: "Location type",
      options: [
        createOption("house", "House"),
        createOption("condo", "Condo"),
        createOption("apartment", "Apartment"),
        createOption("commercial", "Commercial"),
      ],
    }),
    createCustomField("preferred-visit", "date", {
      label: "Preferred visit or start date",
    }),
    createCustomField("access-notes", "short_text", {
      label: "Access notes",
      placeholder: "Gate code, parking, unit number",
    }),
    createSystemField("requestedDeadline", {
      label: "Target completion",
      enabled: true,
    }),
    createSystemField("details", {
      label: "Project details",
      placeholder: "Describe the scope, site conditions, and anything we should review before pricing.",
      required: true,
    }),
    createSystemField("attachment", {
      label: "Photos or plans",
      enabled: true,
    }),
  ] satisfies InquiryFormFieldDefinition[];
}

function createCreativeMarketingServicesFields() {
  return [
    createSystemField("serviceCategory", {
      label: "Project or service needed",
      placeholder: "Branding, design, website, content, production",
      required: true,
    }),
    createCustomField("deliverables", "long_text", {
      label: "Deliverables",
      placeholder: "What needs to be created, delivered, or completed?",
      required: true,
    }),
    createCustomField("project-timing", "date", {
      label: "Target date",
    }),
    createCustomField("delivery-focus", "multi_select", {
      label: "Where this will be used",
      options: [
        createOption("web", "Web"),
        createOption("social", "Social"),
        createOption("print", "Print"),
        createOption("email", "Email"),
        createOption("video", "Video"),
      ],
    }),
    createCustomField("reference-materials-ready", "boolean", {
      label: "Reference files ready?",
    }),
    createSystemField("budgetText", {
      label: "Budget",
      enabled: true,
    }),
    createSystemField("details", {
      label: "Project brief",
      placeholder: "Share the goal, scope, audience, and anything we should review before pricing.",
      required: true,
    }),
    createSystemField("attachment", {
      label: "Brief or reference files",
      enabled: true,
    }),
  ] satisfies InquiryFormFieldDefinition[];
}

function createConsultingProfessionalServicesFields() {
  return [
    createSystemField("serviceCategory", {
      label: "Service needed",
      placeholder: "Consulting, advisory, audit, workshop",
      required: true,
    }),
    createCustomField("goal", "long_text", {
      label: "Goal",
      placeholder: "What are you trying to solve or improve?",
      required: true,
    }),
    createCustomField("format", "select", {
      label: "Preferred format",
      options: [
        createOption("online", "Online"),
        createOption("in-person", "In person"),
        createOption("either", "Either"),
      ],
    }),
    createCustomField("participant-count", "number", {
      label: "Participant count",
    }),
    createCustomField("desired-start", "date", {
      label: "Desired start date",
    }),
    createSystemField("budgetText", {
      label: "Budget",
      enabled: true,
    }),
    createSystemField("details", {
      label: "Background",
      placeholder: "Share the context, goals, and current challenges.",
      required: true,
    }),
    createSystemField("attachment", {
      label: "Reference file",
      enabled: true,
    }),
  ] satisfies InquiryFormFieldDefinition[];
}

export function createInquiryFormConfigDefaults({
  businessType = "general_project_services",
}: CreateInquiryFormConfigDefaultsInput = {}): InquiryFormConfig {
  const resolvedBusinessType = normalizeBusinessType(businessType);
  const starterTemplateBusinessType =
    getStarterTemplateBusinessType(resolvedBusinessType);

  let projectFields: InquiryFormFieldDefinition[];

  switch (starterTemplateBusinessType) {
    case "creative_marketing_services":
      projectFields = createCreativeMarketingServicesFields();
      break;
    case "consulting_professional_services":
      projectFields = createConsultingProfessionalServicesFields();
      break;
    case "contractor_home_improvement":
      projectFields = createContractorHomeImprovementFields();
      break;
    case "general_project_services":
    default:
      projectFields = createGeneralProjectServicesFields();
      break;
  }

  return {
    version: 1,
    businessType: resolvedBusinessType,
    groupLabels: getDefaultInquiryFormGroupLabels(resolvedBusinessType),
    contactFields: createContactFieldConfig(),
    projectFields,
  };
}

export function getNormalizedInquiryFormConfig(
  value: unknown,
  defaults?: CreateInquiryFormConfigDefaultsInput,
) {
  const fallback = createInquiryFormConfigDefaults(defaults);
  const parsed = inquiryFormConfigSchema.safeParse(
    normalizeInquiryFormConfigValue(value, fallback.businessType),
  );

  if (!parsed.success) {
    return fallback;
  }

  return {
    ...parsed.data,
    groupLabels: {
      ...fallback.groupLabels,
      ...(parsed.data.groupLabels ?? {}),
    },
    contactFields: {
      customerName: normalizeLegacyContactFieldLabel(
        parsed.data.contactFields.customerName,
        "customerName",
      ),
      preferredContact: normalizeLegacyContactFieldLabel(
        parsed.data.contactFields.preferredContact,
        "preferredContact",
      ),
    },
  } satisfies InquiryFormConfig;
}

export function getNormalizedInquirySubmittedFieldSnapshot(value: unknown) {
  const parsed = inquirySubmittedFieldSnapshotSchema.safeParse(
    normalizeInquirySubmittedFieldSnapshotValue(value),
  );

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function getInquiryFormFieldInputName(
  field: InquiryFormFieldDefinition | InquiryContactFieldKey,
) {
  if (typeof field === "string") {
    return field;
  }

  if (field.kind === "system") {
    return field.key;
  }

  return `custom_${field.id}`;
}

export function getInquirySubmittedFieldValueDisplay(
  value: string | string[] | boolean | null,
) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    return value.trim() || "Not provided";
  }

  return "Not provided";
}


function resolveFieldKind(field: InquirySubmittedFieldSnapshotField): InquiryFieldKind {
  if (field.fieldKind) {
    return field.fieldKind;
  }

  if ((inquiryContactFieldKeys as readonly string[]).includes(field.id)) {
    return "contact";
  }

  if ((inquiryProjectSystemFieldKeys as readonly string[]).includes(field.id)) {
    return "system";
  }

  return "custom";
}

/**
 * @deprecated Use `getCustomSubmittedFields()` instead.
 */
export function getAdditionalInquirySubmittedFields(
  snapshot: InquirySubmittedFieldSnapshot | null | undefined,
) {
  return getCustomSubmittedFields(snapshot);
}

/** Contact fields from the submitted snapshot. */
export function getContactSubmittedFields(
  snapshot: InquirySubmittedFieldSnapshot | null | undefined,
) {
  if (!snapshot) {
    return [];
  }

  return snapshot.fields.filter((field) => resolveFieldKind(field) === "contact");
}

/**
 * Summary-level system fields (category, budget, deadline).
 * Excludes details and attachment which are displayed in their own sections.
 */
const summaryFieldIds = new Set<string>(["serviceCategory", "requestedDeadline", "budgetText"]);

export function getSummarySubmittedFields(
  snapshot: InquirySubmittedFieldSnapshot | null | undefined,
) {
  if (!snapshot) {
    return [];
  }

  return snapshot.fields.filter(
    (field) => resolveFieldKind(field) === "system" && summaryFieldIds.has(field.id),
  );
}

/**
 * Detail-level system fields (details/message, and any other system fields not in summary).
 * Excludes attachment which is displayed in its own section.
 */
export function getDetailSubmittedFields(
  snapshot: InquirySubmittedFieldSnapshot | null | undefined,
) {
  if (!snapshot) {
    return [];
  }

  return snapshot.fields.filter(
    (field) =>
      resolveFieldKind(field) === "system" &&
      !summaryFieldIds.has(field.id) &&
      field.id !== "attachment",
  );
}

/** Custom fields from the submitted snapshot. Displayed under "Additional Details". */
export function getCustomSubmittedFields(
  snapshot: InquirySubmittedFieldSnapshot | null | undefined,
) {
  if (!snapshot) {
    return [];
  }

  return snapshot.fields.filter((field) => resolveFieldKind(field) === "custom");
}

/**
 * Returns the best display label for a submitted field.
 * Fallback chain: snapshot label → current field label → default label → humanized key.
 */
export function getFieldDisplayLabel(
  snapshotField: InquirySubmittedFieldSnapshotField | undefined,
  fieldKey: string,
  currentLabel?: string,
) {
  if (snapshotField?.label) {
    return snapshotField.label;
  }

  if (currentLabel) {
    return currentLabel;
  }

  const systemDefault = systemFieldDefaultLabels[fieldKey as InquiryProjectSystemFieldKey];

  if (systemDefault) {
    return systemDefault;
  }

  const contactDefault = contactFieldFixedLabels[fieldKey as InquiryContactFieldKey];

  if (contactDefault) {
    return contactDefault;
  }

  // Humanize: "budgetText" → "Budget Text", "service-address" → "Service Address"
  return fieldKey
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
