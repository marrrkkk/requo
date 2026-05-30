import type { OnboardingDraft } from "@/features/onboarding/helpers";
import type {
  OnboardingActionState,
  OnboardingFieldName,
} from "@/features/onboarding/types";
import {
  onboardingBusinessContextSchema,
  onboardingOwnerProfileSchema,
  onboardingTemplateSchema,
} from "@/features/onboarding/schemas";

export type OnboardingFormProps = {
  action: (
    state: OnboardingActionState,
    formData: FormData,
  ) => Promise<OnboardingActionState>;
  detectedCountryCode?: string;
  initialProfile?: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
};

export type OnboardingStepId = "business" | "template" | "profile";

export const onboardingSteps = [
  {
    id: "business" as const,
    label: "Business",
    description: "Add the core details for your first business.",
    title: "Add your first business",
    body:
      "Set up your business identity so clients recognize you.",
    fields: [
      "businessName",
      "businessSlug",
      "countryCode",
      "defaultCurrency",
    ] as const satisfies readonly OnboardingFieldName[],
  },
  {
    id: "template" as const,
    label: "Template",
    description: "Choose the fastest path to a usable inquiry form.",
    title: "Configure your workflow",
    body:
      "Pick your business type and starting defaults. You can customize everything later.",
    fields: [
      "starterTemplateBusinessType",
    ] as const satisfies readonly OnboardingFieldName[],
  },
  {
    id: "profile" as const,
    label: "Profile",
    description: "Your avatar, name, and role.",
    title: "Finish your profile",
    body: "Add your photo and name so your team and clients can recognize you.",
    fields: [
      "firstName",
      "lastName",
    ] as const satisfies readonly OnboardingFieldName[],
  },
] satisfies ReadonlyArray<{
  id: OnboardingStepId;
  label: string;
  description: string;
  title: string;
  body: string;
  fields: readonly OnboardingFieldName[];
}>;

export const lastOnboardingStepIndex = onboardingSteps.length - 1;

export const onboardingInputClassName =
  "h-9 text-sm focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-border aria-invalid:border-input/95 aria-invalid:ring-0 aria-invalid:ring-transparent";

export const onboardingComboboxButtonClassName =
  "h-9 text-sm focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-border aria-invalid:border-border/85 aria-invalid:ring-0 aria-invalid:ring-transparent";

export function getFieldValidationError(
  field: OnboardingFieldName,
  draft: OnboardingDraft,
) {
  switch (field) {
    case "firstName": {
      const result = onboardingOwnerProfileSchema.shape.firstName.safeParse(
        draft.firstName,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "lastName": {
      const result = onboardingOwnerProfileSchema.shape.lastName.safeParse(
        draft.lastName,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "jobTitle": {
      if (!draft.jobTitle) return undefined;
      const result = onboardingOwnerProfileSchema.shape.jobTitle.safeParse(
        draft.jobTitle,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "businessName": {
      const result = onboardingBusinessContextSchema.shape.businessName.safeParse(
        draft.businessName,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "businessSlug": {
      const slug = draft.businessSlug.trim();
      if (!slug) return "Enter a URL slug.";
      if (slug.length < 2) return "Use at least 2 characters.";
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug))
        return "Use only lowercase letters, numbers, and hyphens.";
      return undefined;
    }
    case "businessType": {
      const result = onboardingBusinessContextSchema.shape.businessType.safeParse(
        draft.businessType,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "countryCode": {
      const result = onboardingBusinessContextSchema.shape.countryCode.safeParse(
        draft.countryCode,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "defaultCurrency": {
      const result =
        onboardingBusinessContextSchema.shape.defaultCurrency.safeParse(
          draft.defaultCurrency,
        );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "customerContactChannel": {
      const result =
        onboardingBusinessContextSchema.shape.customerContactChannel.safeParse(
          draft.customerContactChannel,
        );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "starterTemplateBusinessType": {
      const result =
        onboardingTemplateSchema.shape.starterTemplateBusinessType.safeParse(
          draft.starterTemplateBusinessType,
        );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "companySize":
    case "referralSource":
      return undefined;
  }
}

export function sanitizeDraft(
  value: Partial<OnboardingDraft> | undefined,
): Partial<OnboardingDraft> {
  if (!value) {
    return {};
  }

  return {
    firstName: typeof value.firstName === "string" ? value.firstName : "",
    lastName: typeof value.lastName === "string" ? value.lastName : "",
    jobTitle: typeof value.jobTitle === "string" ? value.jobTitle : "",
    businessName:
      typeof value.businessName === "string" ? value.businessName : "",
    businessSlug:
      typeof value.businessSlug === "string" ? value.businessSlug : "",
    businessType:
      typeof value.businessType === "string"
        ? (value.businessType as OnboardingDraft["businessType"])
        : "",
    starterTemplateBusinessType:
      typeof value.starterTemplateBusinessType === "string"
        ? (value.starterTemplateBusinessType as OnboardingDraft["starterTemplateBusinessType"])
        : "",
    countryCode: typeof value.countryCode === "string" ? value.countryCode : "",
    defaultCurrency:
      typeof value.defaultCurrency === "string" ? value.defaultCurrency : "",
    customerContactChannel:
      typeof value.customerContactChannel === "string"
        ? value.customerContactChannel
        : "",
    companySize:
      typeof value.companySize === "string" ? value.companySize : "",
    referralSource:
      typeof value.referralSource === "string" ? value.referralSource : "",
  };
}

export function mapServerFieldErrors(
  fieldErrors: OnboardingActionState["fieldErrors"],
): Partial<Record<OnboardingFieldName, string>> {
  return Object.fromEntries(
    Object.entries(fieldErrors ?? {}).flatMap(([field, errors]) => {
      const message = errors?.[0];

      return message ? [[field, message]] : [];
    }),
  ) as Partial<Record<OnboardingFieldName, string>>;
}

export function clampStepIndex(value: number, maxStepIndex: number) {
  return Math.min(Math.max(value, 0), maxStepIndex);
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
