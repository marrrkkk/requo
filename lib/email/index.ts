export { sendEmailWithFallback } from "./send-email";
export { getEmailSender, getEmailSenderConfigurationError } from "./senders";
export { isRetryableEmailError } from "./errors";
export type { EmailProviderName, EmailType, SendEmailInput, SendEmailResult } from "./types";
