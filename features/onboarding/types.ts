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
  | "starterTemplateBusinessType"
  | "companySize"
  | "referralSource";

export type OnboardingActionState = {
  error?: string;
  fieldErrors?: Partial<Record<OnboardingFieldName, string[] | undefined>>;
};
