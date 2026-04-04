import type { InquiryPageConfig } from "@/features/inquiries/page-config";

export const workspaceAiTonePreferences = [
  "balanced",
  "warm",
  "direct",
  "formal",
] as const;

export type WorkspaceAiTonePreference =
  (typeof workspaceAiTonePreferences)[number];

export type WorkspaceSettingsView = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  contactEmail: string | null;
  logoStoragePath: string | null;
  logoContentType: string | null;
  defaultEmailSignature: string | null;
  defaultQuoteNotes: string | null;
  aiTonePreference: WorkspaceAiTonePreference;
  notifyOnNewInquiry: boolean;
  notifyOnQuoteSent: boolean;
  defaultCurrency: string;
  updatedAt: Date;
};

export type WorkspaceSettingsFieldName =
  | "name"
  | "slug"
  | "shortDescription"
  | "contactEmail"
  | "defaultEmailSignature"
  | "defaultQuoteNotes"
  | "aiTonePreference"
  | "defaultCurrency"
  | "logo";

export type WorkspaceSettingsFieldErrors = Partial<
  Record<WorkspaceSettingsFieldName, string[] | undefined>
>;

export type WorkspaceSettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: WorkspaceSettingsFieldErrors;
};

export type WorkspaceInquiryPageSettingsView = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  logoStoragePath: string | null;
  publicInquiryEnabled: boolean;
  inquiryPageConfig: InquiryPageConfig;
  updatedAt: Date;
};

export type WorkspaceInquiryPageFieldName =
  | "publicInquiryEnabled"
  | "template"
  | "eyebrow"
  | "headline"
  | "description"
  | "brandTagline"
  | "formTitle"
  | "formDescription"
  | "cards";

export type WorkspaceInquiryPageFieldErrors = Partial<
  Record<WorkspaceInquiryPageFieldName, string[] | undefined>
>;

export type WorkspaceInquiryPageActionState = {
  error?: string;
  success?: string;
  fieldErrors?: WorkspaceInquiryPageFieldErrors;
};
