import { z } from "zod";

import {
  getInquiryFormFieldInputName,
  getInquirySubmittedFieldValueDisplay,
  inquiryContactFieldKeys,
  type InquiryFormConfig,
  type InquiryFormCustomFieldDefinition,
  type InquiryFormFieldDefinition,
  type InquirySubmittedFieldSnapshot,
  type InquirySubmittedFieldSnapshotField,
} from "@/features/inquiries/form-config";
import { isAcceptedFileType } from "@/lib/files";
import {
  inquiryStatusFilterValues,
  inquiryStatuses,
} from "@/features/inquiries/types";

export const publicInquiryAttachmentBucket = "inquiry-attachments";
export const publicInquiryMaxAttachmentSize = 5 * 1024 * 1024;
export const publicInquiryAllowedExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".txt",
] as const;
export const publicInquiryAllowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const;
export const publicInquiryExtensionToMimeType: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".txt": "text/plain",
};
export const publicInquiryAttachmentAccept = [
  ...publicInquiryAllowedExtensions,
  ...publicInquiryAllowedMimeTypes,
].join(",");
export const publicInquiryAttachmentLabel =
  "PDF, DOC, DOCX, JPG, PNG, WEBP, or TXT up to 5 MB";

function emptyToUndefined(value: unknown) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function firstString(value: unknown) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function coercePositiveInteger(fieldLabel: string) {
  return z.preprocess(
    (value) => {
      const normalized = firstString(value);

      if (typeof normalized === "number") {
        return normalized;
      }

      if (typeof normalized !== "string") {
        return normalized;
      }

      const trimmed = normalized.trim();

      if (!trimmed) {
        return Number.NaN;
      }

      return Number(trimmed);
    },
    z
      .number()
      .int(`${fieldLabel} must be a whole number.`)
      .min(1, `${fieldLabel} must be at least 1.`),
  );
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

const publicInquiryAttachmentSchema = z.preprocess(
  (value) => {
    if (!(value instanceof File)) {
      return undefined;
    }

    if (value.size === 0 || value.name.trim() === "") {
      return undefined;
    }

    return value;
  },
  z
    .instanceof(File)
    .refine(
      (file) => file.size <= publicInquiryMaxAttachmentSize,
      "Upload a file that is 5 MB or smaller.",
    )
    .refine(
      (file) =>
        isAcceptedFileType(file, {
          allowedExtensions: publicInquiryAllowedExtensions,
          allowedMimeTypes: publicInquiryAllowedMimeTypes,
        }),
      "Upload a PDF, common document file, or image.",
    )
    .optional(),
);

export type PublicInquirySubmissionInput = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  serviceCategory: string;
  requestedDeadline?: string;
  budgetText?: string;
  details: string;
  attachment?: File;
  submittedFieldSnapshot: InquirySubmittedFieldSnapshot;
};

function getTextFieldMessage(label: string) {
  return `Enter ${label.toLowerCase()}.`;
}

function getMinLengthFieldMessage(label: string, minLength: number) {
  return `${label} must be at least ${minLength} characters.`;
}

function getMaxLengthFieldMessage(label: string, maxLength: number) {
  return `${label} must be ${maxLength} characters or fewer.`;
}

function getChoiceFieldMessage(label: string) {
  return `Choose ${label.toLowerCase()}.`;
}

function getRawFormValue(formData: FormData, name: string) {
  const value = formData.get(name);

  if (value instanceof File) {
    return value;
  }

  return typeof value === "string" ? value : undefined;
}

function getRawFormValues(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string");
}

function createRequiredTextSchema({
  label,
  minLength = 1,
  maxLength,
}: {
  label: string;
  minLength?: number;
  maxLength: number;
}) {
  return z
    .string()
    .trim()
    .min(
      minLength,
      minLength > 1
        ? getMinLengthFieldMessage(label, minLength)
        : getTextFieldMessage(label),
    )
    .max(maxLength, getMaxLengthFieldMessage(label, maxLength));
}

function createOptionalTextSchema(label: string, maxLength: number) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(maxLength, getMaxLengthFieldMessage(label, maxLength))
      .optional(),
  );
}

function createDateSchema(label: string, required: boolean) {
  const schema = z
    .string()
    .trim()
    .refine(isValidDateInput, `Enter a valid ${label.toLowerCase()}.`);

  if (required) {
    return z.preprocess(
      emptyToUndefined,
      schema.min(1, getTextFieldMessage(label)),
    );
  }

  return z.preprocess(emptyToUndefined, schema.optional());
}

function createNumberSchema(label: string, required: boolean) {
  const schema = z
    .string()
    .trim()
    .refine(
      (value) => /^-?\d+(?:\.\d+)?$/.test(value),
      "Enter a valid number.",
    )
    .max(80, getMaxLengthFieldMessage(label, 80))
    .refine((value) => Number(value) >= 0, `${label} cannot be negative.`)
    .refine((value) => Number(value) <= 1_000_000_000, `${label} is too large.`);

  if (required) {
    return z.preprocess(
      emptyToUndefined,
      schema.min(1, getTextFieldMessage(label)),
    );
  }

  return z.preprocess(emptyToUndefined, schema.optional());
}

function createSelectSchema(
  label: string,
  values: string[],
  required: boolean,
) {
  const optionSchema = z.enum(values as [string, ...string[]], {
    error: () => getChoiceFieldMessage(label),
  });

  if (required) {
    return z.preprocess(emptyToUndefined, optionSchema);
  }

  return z.preprocess(emptyToUndefined, optionSchema.optional());
}

function createMultiSelectSchema(
  label: string,
  values: string[],
  required: boolean,
) {
  const optionSchema = z.enum(values as [string, ...string[]], {
    error: () => getChoiceFieldMessage(label),
  });
  const arraySchema = z
    .array(optionSchema)
    .max(12, `Choose no more than 12 ${label.toLowerCase()} options.`);

  if (required) {
    return z.preprocess(
      (value) => {
        if (!Array.isArray(value)) {
          return [];
        }

        return value.filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.trim().length > 0,
        );
      },
      arraySchema.min(1, `Select at least one ${label.toLowerCase()} option.`),
    );
  }

  return z.preprocess(
    (value) => {
      if (!Array.isArray(value)) {
        return undefined;
      }

      const cleanedValue = value.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0,
      );

      return cleanedValue.length ? cleanedValue : undefined;
    },
    arraySchema.optional(),
  );
}

function createBooleanSchema(label: string, required: boolean) {
  if (required) {
    return z.preprocess(
      (value) => {
        if (value === "true") {
          return true;
        }

        if (value === "false") {
          return false;
        }

        return emptyToUndefined(value);
      },
      z.boolean({
        error: () => getChoiceFieldMessage(label),
      }),
    );
  }

  return z.preprocess(
    (value) => {
      if (value === "true") {
        return true;
      }

      if (value === "false") {
        return false;
      }

      return emptyToUndefined(value);
    },
    z
      .boolean({
        error: () => getChoiceFieldMessage(label),
      })
      .optional(),
  );
}

function createCustomFieldSchema(field: InquiryFormCustomFieldDefinition) {
  switch (field.fieldType) {
    case "short_text":
      return field.required
        ? createRequiredTextSchema({ label: field.label, maxLength: 160 })
        : createOptionalTextSchema(field.label, 160);
    case "long_text":
      return field.required
        ? createRequiredTextSchema({
            label: field.label,
            minLength: 1,
            maxLength: 4000,
          })
        : createOptionalTextSchema(field.label, 4000);
    case "number":
      return createNumberSchema(field.label, field.required);
    case "date":
      return createDateSchema(field.label, field.required);
    case "boolean":
      return createBooleanSchema(field.label, field.required);
    case "select":
      return createSelectSchema(
        field.label,
        (field.options ?? []).map((option) => option.value),
        field.required,
      );
    case "multi_select":
      return createMultiSelectSchema(
        field.label,
        (field.options ?? []).map((option) => option.value),
        field.required,
      );
  }
}

function createPublicInquirySubmissionSchema(config: InquiryFormConfig) {
  const shape: Record<string, z.ZodTypeAny> = {};

  if (config.contactFields.customerName.enabled) {
    shape.customerName = createRequiredTextSchema({
      label: config.contactFields.customerName.label,
      minLength: 2,
      maxLength: 120,
    });
  }

  if (config.contactFields.customerEmail.enabled) {
    shape.customerEmail = z
      .string()
      .trim()
      .min(1, getTextFieldMessage(config.contactFields.customerEmail.label))
      .max(320, "Email address must be 320 characters or fewer.")
      .email("Enter a valid email address.");
  }

  if (config.contactFields.customerPhone.enabled) {
    shape.customerPhone = config.contactFields.customerPhone.required
      ? createRequiredTextSchema({
          label: config.contactFields.customerPhone.label,
          maxLength: 40,
        })
      : createOptionalTextSchema(config.contactFields.customerPhone.label, 40);
  }

  if (config.contactFields.companyName.enabled) {
    shape.companyName = config.contactFields.companyName.required
      ? createRequiredTextSchema({
          label: config.contactFields.companyName.label,
          maxLength: 120,
        })
      : createOptionalTextSchema(config.contactFields.companyName.label, 120);
  }

  for (const field of config.projectFields) {
    if (field.kind === "system" && !field.enabled) {
      continue;
    }

    const inputName = getInquiryFormFieldInputName(field);

    if (field.kind === "custom") {
      shape[inputName] = createCustomFieldSchema(field);
      continue;
    }

    switch (field.key) {
      case "serviceCategory":
        shape[inputName] = createRequiredTextSchema({
          label: field.label,
          minLength: 2,
          maxLength: 120,
        });
        break;
      case "requestedDeadline":
        shape[inputName] = createDateSchema(field.label, field.required);
        break;
      case "budgetText":
        shape[inputName] = field.required
          ? createRequiredTextSchema({
              label: field.label,
              maxLength: 120,
            })
          : createOptionalTextSchema(field.label, 120);
        break;
      case "details":
        shape[inputName] = createRequiredTextSchema({
          label: field.label,
          minLength: 10,
          maxLength: 4000,
        });
        break;
      case "attachment":
        shape[inputName] = publicInquiryAttachmentSchema;
        break;
    }
  }

  return z.object(shape);
}

function getSubmittedFieldSnapshotValue(
  field: InquiryFormFieldDefinition | (typeof inquiryContactFieldKeys)[number],
  parsedValues: Record<string, unknown>,
): InquirySubmittedFieldSnapshotField["value"] {
  const inputName =
    typeof field === "string" ? field : getInquiryFormFieldInputName(field);
  const value = parsedValues[inputName];

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    return trimmedValue ? trimmedValue : null;
  }

  if (Array.isArray(value)) {
    return value.length ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value instanceof File) {
    return value.name.trim() ? value.name : null;
  }

  return null;
}

function buildSubmittedFieldSnapshot(
  config: InquiryFormConfig,
  parsedValues: Record<string, unknown>,
) {
  const fields: InquirySubmittedFieldSnapshotField[] = [];

  for (const contactKey of inquiryContactFieldKeys) {
    const field = config.contactFields[contactKey];

    if (!field.enabled) {
      continue;
    }

    const value = getSubmittedFieldSnapshotValue(contactKey, parsedValues);

    fields.push({
      id: contactKey,
      label: field.label,
      value,
      displayValue: getInquirySubmittedFieldValueDisplay(value),
    });
  }

  for (const field of config.projectFields) {
    if (field.kind === "system" && !field.enabled) {
      continue;
    }

    const value = getSubmittedFieldSnapshotValue(field, parsedValues);

    fields.push({
      id: field.kind === "system" ? field.key : field.id,
      label: field.label,
      value,
      displayValue: getInquirySubmittedFieldValueDisplay(value),
    });
  }

  return {
    version: 1,
    businessType: config.businessType,
    fields,
  } satisfies InquirySubmittedFieldSnapshot;
}

export function validatePublicInquirySubmission(
  config: InquiryFormConfig,
  formData: FormData,
) {
  const schema = createPublicInquirySubmissionSchema(config);
  const candidate: Record<string, unknown> = {};

  for (const contactKey of inquiryContactFieldKeys) {
    if (!config.contactFields[contactKey].enabled) {
      continue;
    }

    candidate[contactKey] = getRawFormValue(formData, contactKey);
  }

  for (const field of config.projectFields) {
    if (field.kind === "system" && !field.enabled) {
      continue;
    }

    const inputName = getInquiryFormFieldInputName(field);
    candidate[inputName] =
      field.kind === "custom" && field.fieldType === "multi_select"
        ? getRawFormValues(formData, inputName)
        : getRawFormValue(formData, inputName);
  }

  const validationResult = schema.safeParse(candidate);

  if (!validationResult.success) {
    return validationResult;
  }

  const parsedValues = validationResult.data as Record<string, unknown>;

  return {
    success: true as const,
    data: {
      customerName: String(parsedValues.customerName ?? ""),
      customerEmail: String(parsedValues.customerEmail ?? ""),
      customerPhone:
        typeof parsedValues.customerPhone === "string"
          ? parsedValues.customerPhone
          : undefined,
      companyName:
        typeof parsedValues.companyName === "string"
          ? parsedValues.companyName
          : undefined,
      serviceCategory: String(parsedValues.serviceCategory ?? ""),
      requestedDeadline:
        typeof parsedValues.requestedDeadline === "string"
          ? parsedValues.requestedDeadline
          : undefined,
      budgetText:
        typeof parsedValues.budgetText === "string"
          ? parsedValues.budgetText
          : undefined,
      details: String(parsedValues.details ?? ""),
      attachment:
        parsedValues.attachment instanceof File
          ? parsedValues.attachment
          : undefined,
      submittedFieldSnapshot: buildSubmittedFieldSnapshot(config, parsedValues),
    } satisfies PublicInquirySubmissionInput,
  };
}

export const inquiryIdSchema = z.string().trim().min(1).max(128);

export const inquiryRouteParamsSchema = z.object({
  id: inquiryIdSchema,
});

export const inquiryAttachmentRouteParamsSchema = z.object({
  id: inquiryIdSchema,
  attachmentId: z.string().trim().min(1).max(128),
});

export const inquiryListFiltersSchema = z.object({
  q: z
    .preprocess(
      (value) => emptyToUndefined(firstString(value)),
      z.string().trim().max(120).optional(),
    )
    .catch(undefined),
  status: z
    .preprocess(
      (value) => firstString(value) ?? "all",
      z.enum(inquiryStatusFilterValues),
    )
    .catch("all"),
  form: z
    .preprocess(
      (value) => firstString(value) ?? "all",
      z.string().trim().max(120),
    )
    .catch("all"),
  sort: z
    .preprocess(
      (value) => firstString(value) ?? "newest",
      z.enum(["newest", "oldest"]),
    )
    .catch("newest"),
  page: coercePositiveInteger("Page").catch(1),
});

export const inquiryNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Enter an internal note.")
    .max(2000, "Notes must be 2,000 characters or fewer."),
});

export const inquiryStatusChangeSchema = z.object({
  status: z.enum(inquiryStatuses),
});
