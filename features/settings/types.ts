import type { BusinessType } from "@/features/inquiries/business-types";
import type {
  InquiryFormConfig,
  InquiryFormFieldDefinition,
} from "@/features/inquiries/form-config";
import type { InquiryPageConfig } from "@/features/inquiries/page-config";
import type { BusinessInquiryFormSummary } from "@/features/inquiries/types";

export const businessAiTonePreferences = [
  "balanced",
  "warm",
  "direct",
  "formal",
] as const;

export type BusinessAiTonePreference =
  (typeof businessAiTonePreferences)[number];

export type BusinessSettingsView = {
  id: string;
  name: string;
  slug: string;
  countryCode: string | null;
  shortDescription: string | null;
  contactEmail: string | null;
  logoStoragePath: string | null;
  logoContentType: string | null;
  defaultEmailSignature: string | null;
  defaultQuoteNotes: string | null;
  defaultQuoteValidityDays: number;
  aiTonePreference: BusinessAiTonePreference;
  notifyOnNewInquiry: boolean;
  notifyOnQuoteSent: boolean;
  notifyOnQuoteResponse: boolean;
  notifyInAppOnNewInquiry: boolean;
  notifyInAppOnQuoteResponse: boolean;
  defaultCurrency: string;
  updatedAt: Date;
};

export type BusinessGeneralSettingsFieldName =
  | "name"
  | "slug"
  | "countryCode"
  | "shortDescription"
  | "contactEmail"
  | "defaultCurrency"
  | "defaultEmailSignature"
  | "aiTonePreference"
  | "logo";

export type BusinessSettingsFieldErrors = Partial<
  Record<BusinessGeneralSettingsFieldName, string[] | undefined>
>;

export type BusinessSettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: BusinessSettingsFieldErrors;
};

export type BusinessNotificationSettingsFieldName =
  | "notifyOnNewInquiry"
  | "notifyOnQuoteSent"
  | "notifyOnQuoteResponse"
  | "notifyInAppOnNewInquiry"
  | "notifyInAppOnQuoteResponse";

export type BusinessNotificationSettingsFieldErrors = Partial<
  Record<BusinessNotificationSettingsFieldName, string[] | undefined>
>;

export type BusinessNotificationSettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: BusinessNotificationSettingsFieldErrors;
};

export type BusinessQuoteSettingsFieldName =
  | "defaultQuoteNotes"
  | "defaultQuoteValidityDays";

export type BusinessQuoteSettingsFieldErrors = Partial<
  Record<BusinessQuoteSettingsFieldName, string[] | undefined>
>;

export type BusinessQuoteSettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: BusinessQuoteSettingsFieldErrors;
};

export type BusinessDeleteFieldErrors = Partial<
  Record<"confirmation", string[] | undefined>
>;

export type BusinessDeleteActionState = {
  error?: string;
  success?: string;
  fieldErrors?: BusinessDeleteFieldErrors;
};

export type BusinessInquiryFormsSettingsView = {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  forms: Array<
    BusinessInquiryFormSummary & {
      submittedInquiryCount: number;
      inquiryFormConfig: InquiryFormConfig;
      inquiryPageConfig: InquiryPageConfig;
    }
  >;
};

export type BusinessInquiryPageSettingsView = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  logoStoragePath: string | null;
  formId: string;
  formName: string;
  formSlug: string;
  businessType: BusinessType;
  publicInquiryEnabled: boolean;
  isDefault: boolean;
  inquiryFormConfig: InquiryFormConfig;
  inquiryPageConfig: InquiryPageConfig;
  updatedAt: Date;
};

export type BusinessInquiryPageFieldName =
  | "formId"
  | "publicInquiryEnabled"
  | "template"
  | "eyebrow"
  | "headline"
  | "description"
  | "brandTagline"
  | "formTitle"
  | "formDescription"
  | "cards";

export type BusinessInquiryPageFieldErrors = Partial<
  Record<BusinessInquiryPageFieldName, string[] | undefined>
>;

export type BusinessInquiryPageActionState = {
  error?: string;
  success?: string;
  fieldErrors?: BusinessInquiryPageFieldErrors;
};

export type BusinessInquiryFormSettingsView = {
  id: string;
  name: string;
  slug: string;
  formId: string;
  formName: string;
  formSlug: string;
  businessType: BusinessType;
  publicInquiryEnabled: boolean;
  isDefault: boolean;
  inquiryFormConfig: InquiryFormConfig;
  inquiryPageConfig: InquiryPageConfig;
  updatedAt: Date;
};

export type BusinessInquiryFormEditorView = BusinessInquiryFormSettingsView & {
  shortDescription: string | null;
  logoStoragePath: string | null;
  activeFormCount: number;
  submittedInquiryCount: number;
};

export type BusinessInquiryFormFieldName =
  | "name"
  | "slug"
  | "businessType"
  | "inquiryFormConfig";

export type BusinessInquiryFormFieldErrors = Partial<
  Record<BusinessInquiryFormFieldName, string[] | undefined>
>;

export type BusinessInquiryFormActionState = {
  error?: string;
  success?: string;
  fieldErrors?: BusinessInquiryFormFieldErrors;
};

export type BusinessInquiryFormsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<
    Record<"name" | "businessType" | "formId" | "targetFormId", string[] | undefined>
  >;
};

export type BusinessInquiryFormDangerActionState = {
  error?: string;
  success?: string;
};

export type BusinessInquiryFieldDraft = InquiryFormFieldDefinition;
