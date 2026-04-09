export type AccountProfileRecord = {
  fullName: string;
  jobTitle: string | null;
  phone: string | null;
  avatarStoragePath: string | null;
  avatarContentType: string | null;
  onboardingCompletedAt: Date | null;
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
  activeSessionCount: number;
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
