export type AuthFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
