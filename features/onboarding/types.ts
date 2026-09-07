export type OnboardingFieldName =
  | "firstName"
  | "lastName"
  | "jobTitle"
  | "businessName"
  | "businessSlug"
  | "businessType"
  | "countryCode"
  | "defaultCurrency"
  | "customerContactChannel"
  | "starterWorkflow"
  | "companySize"
  | "referralSource"
  | "services";

export type OnboardingActionState = {
  error?: string;
  fieldErrors?: Partial<Record<OnboardingFieldName, string[] | undefined>>;
};
