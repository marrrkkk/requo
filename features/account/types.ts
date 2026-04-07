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
