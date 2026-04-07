export type AccountProfileRecord = {
  fullName: string;
  jobTitle: string | null;
  phone: string | null;
  onboardingCompletedAt: Date | null;
};

export type AccountProfileView = AccountProfileRecord & {
  email: string;
};

export type AccountProfileActionState = {
  error?: string;
  success?: string;
  fieldErrors?: {
    fullName?: string[] | undefined;
    jobTitle?: string[] | undefined;
    phone?: string[] | undefined;
  };
};
