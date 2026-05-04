export type OnboardingFieldName =
  | "workspaceName"
  | "businessName"
  | "businessType"
  | "countryCode"
  | "defaultCurrency"
  | "starterTemplateBusinessType"
  | "jobTitle"
  | "companySize"
  | "referralSource";

export type OnboardingActionState = {
  error?: string;
  fieldErrors?: Partial<Record<OnboardingFieldName, string[] | undefined>>;
};
