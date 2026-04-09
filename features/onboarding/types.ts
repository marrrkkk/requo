export type OnboardingActionState = {
  error?: string;
  fieldErrors?: {
    businessName?: string[] | undefined;
    businessType?: string[] | undefined;
    countryCode?: string[] | undefined;
    shortDescription?: string[] | undefined;
    fullName?: string[] | undefined;
    jobTitle?: string[] | undefined;
    phone?: string[] | undefined;
  };
};
