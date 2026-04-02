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
  publicInquiryEnabled: boolean;
  inquiryHeadline: string | null;
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
  | "inquiryHeadline"
  | "defaultEmailSignature"
  | "defaultQuoteNotes"
  | "aiTonePreference"
  | "logo";

export type WorkspaceSettingsFieldErrors = Partial<
  Record<WorkspaceSettingsFieldName, string[] | undefined>
>;

export type WorkspaceSettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: WorkspaceSettingsFieldErrors;
};
