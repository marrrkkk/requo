import "server-only";

import type { EmailProviderName, EmailType } from "@/lib/db/schema/email";

export type { EmailProviderName, EmailType };

export type SendEmailInput = {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  emailType?: EmailType;
  workspaceId?: string | null;
  businessId?: string | null;
  userId?: string | null;
};

export type NormalizedSendEmailInput = Omit<
  SendEmailInput,
  "to" | "cc" | "bcc" | "from" | "emailType" | "metadata" | "idempotencyKey"
> & {
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  emailType: EmailType;
  metadata: Record<string, unknown>;
  idempotencyKey: string;
};

export type SendEmailResult = {
  provider: EmailProviderName;
  providerMessageId: string;
  status: "sent" | "queued";
  raw?: unknown;
};

export type EmailProvider = {
  name: EmailProviderName;
  isConfigured: () => boolean;
  send: (input: NormalizedSendEmailInput) => Promise<SendEmailResult>;
};
