export type OnboardingFieldName =
  | "businessName"
  | "businessType"
  | "countryCode"
  | "defaultCurrency"
  | "customerContactChannel"
  | "starterTemplateBusinessType"
  | "jobTitle"
  | "companySize"
  | "referralSource";

export type OnboardingActionState = {
  error?: string;
  fieldErrors?: Partial<Record<OnboardingFieldName, string[] | undefined>>;
};
