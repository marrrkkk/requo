export type AccountProfileRecord = {
  fullName: string;
  jobTitle: string | null;
  phone: string | null;
  avatarStoragePath: string | null;
  avatarContentType: string | null;
  onboardingCompletedAt: Date | null;
  dashboardTourCompletedAt: Date | null;
  formEditorTourCompletedAt: Date | null;
  updatedAt: Date;
};

export type AccountProfileView = AccountProfileRecord & {
  email: string;
  avatarSrc: string | null;
  oauthAvatarSrc: string | null;
};

export type AccountSecurityView = {
  email: string;
  hasPassword: boolean;
  connectedProviders: string[];
  ownedBusinessCount: number;
  deletion: AccountDeletionPreflight;
  activeSessionCount: number;
  activeSessions: AccountSessionView[];
};

export type AccountDeletionBlocker = {
  code:
    | "owned_business_subscription"
    | "owned_business"
    | "sole_business_owner";
  message: string;
  businessName?: string;
  businessSlug?: string;
};

export type AccountDeletionBusinessSummary = {
  id: string;
  name: string;
  slug: string;
};

export type AccountDeletionPreflight = {
  allowed: boolean;
  blockers: AccountDeletionBlocker[];
  ownedBusinesses: AccountDeletionBusinessSummary[];
  soleOwnedBusinesses: AccountDeletionBusinessSummary[];
};

export type AccountSessionView = {
  id: string;
  token: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
  isCurrent: boolean;
};

export type AccountProfileActionState = {
  error?: string;
  success?: string;
  fieldErrors?: {
    fullName?: string[] | undefined;
    jobTitle?: string[] | undefined;
    phone?: string[] | undefined;
    avatar?: string[] | undefined;
  };
};

export type AccountPasswordFieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string[] | undefined>
>;

export type AccountPasswordActionState = {
  error?: string;
  success?: string;
  fieldErrors?: AccountPasswordFieldErrors;
};

export type AccountSessionActionState = {
  error?: string;
  success?: string;
};

export type AccountDeleteFieldErrors = Partial<
  Record<"email" | "password", string[] | undefined>
>;

export type AccountDeleteActionState = {
  error?: string;
  success?: string;
  fieldErrors?: AccountDeleteFieldErrors;
};
