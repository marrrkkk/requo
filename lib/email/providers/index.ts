import "server-only";

import type { EmailProvider } from "@/lib/email/types";
import { brevoEmailProvider } from "./brevo";
import { mailtrapEmailProvider } from "./mailtrap";
import { resendEmailProvider } from "./resend";

export const emailProviders: EmailProvider[] = [
  resendEmailProvider,
  mailtrapEmailProvider,
  brevoEmailProvider,
];
