import { createHash } from "node:crypto";

import type { QuoteEmailTemplateConfig } from "@/features/settings/email-templates";
import { renderBusinessMemberInviteEmail } from "@/emails/templates/business-member-invite";
import { renderEmailVerificationEmail } from "@/emails/templates/email-verification";
import { renderPasswordResetEmail } from "@/emails/templates/password-reset";
import { renderPublicInquiryNotificationEmail } from "@/emails/templates/public-inquiry-notification";
import { renderQuoteEmail } from "@/emails/templates/quote-email";
import { renderQuoteResponseOwnerNotificationEmail } from "@/emails/templates/quote-response-owner-notification";
import { renderQuoteSentOwnerNotificationEmail } from "@/emails/templates/quote-sent-owner-notification";
import {
  EmailSendError,
} from "@/lib/email/errors";
import { getDefaultReplyToEmail, getEmailSender, normalizeEmailAddress } from "@/lib/email/senders";
import { getEmailSenderConfigurationError } from "@/lib/email/senders";
import { sendEmailWithFallback } from "@/lib/email/send-email";
import type { EmailType, SendEmailInput } from "@/lib/email/types";
import { isEmailConfigured } from "@/lib/env";
import type { BusinessMemberAssignableRole } from "@/lib/business-members";

type SendPasswordResetEmailInput = {
  userId: string;
  email: string;
  name: string;
  url: string;
  token: string;
};

type SendVerificationEmailInput = {
  userId: string;
  email: string;
  name: string;
  token: string;
  url: string;
};

type SendBusinessMemberInviteEmailInput = {
  inviteId: string;
  token: string;
  email: string;
  businessName: string;
  inviterName: string;
  role: BusinessMemberAssignableRole;
  inviteUrl: string;
  businessId?: string | null;
  userId?: string | null;
};

type SendPublicInquiryNotificationEmailInput = {
  inquiryId: string;
  recipients: string[];
  businessName: string;
  dashboardUrl: string;
  inquiryFormName: string;
  customerName: string;
  customerEmail?: string;
  customerContactMethod: string;
  customerContactHandle: string;
  serviceCategory: string;
  deadline?: string;
  budget?: string;
  details: string;
  attachmentName?: string | null;
  additionalFields?: Array<{
    label: string;
    value: string;
  }>;
  businessId?: string | null;
};

type SendQuoteEmailInput = {
  quoteId: string;
  updatedAt: Date;
  businessName: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod?: string;
  customerContactHandle?: string;
  quoteNumber: string;
  title: string;
  publicQuoteUrl: string;
  currency: string;
  validUntil: string;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  notes?: string | null;
  emailSignature?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceInCents: number;
    lineTotalInCents: number;
  }>;
  templateOverrides?: QuoteEmailTemplateConfig | null;
  replyToEmail?: string;
  businessId?: string | null;
  userId?: string | null;
};

type SendQuoteSentOwnerNotificationEmailInput = {
  quoteId: string;
  updatedAt: Date;
  recipients: string[];
  businessName: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod?: string;
  customerContactHandle?: string;
  quoteNumber: string;
  title: string;
  dashboardUrl: string;
  publicQuoteUrl: string;
  businessId?: string | null;
};

type SendQuoteResponseOwnerNotificationEmailInput = {
  quoteId: string;
  updatedAt: Date;
  recipients: string[];
  businessName: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod?: string;
  customerContactHandle?: string;
  customerMessage?: string | null;
  quoteNumber: string;
  title: string;
  response: "accepted" | "rejected";
  dashboardUrl: string;
  businessId?: string | null;
};

function hashIdempotencyPart(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function getRecipientKey(email: string) {
  return normalizeEmailAddress(email) ?? email.trim().toLowerCase();
}

function getRecipientSetKey(recipients: string[]) {
  return hashIdempotencyPart(
    recipients.map(getRecipientKey).sort((a, b) => a.localeCompare(b)).join(","),
  );
}

function getFallbackReplyTo(preferred?: string) {
  return preferred ?? getDefaultReplyToEmail();
}

function getConfigurationError(emailType: EmailType) {
  return getEmailSenderConfigurationError(emailType);
}

function logDeliverySkipped(reason: string, emailType: EmailType) {
  console.warn(reason, { emailType });
}

async function sendBrandedEmail(input: SendEmailInput) {
  await sendEmailWithFallback({
    ...input,
    from: input.from ?? getEmailSender(input.emailType ?? "notification"),
  });
}

export function getResendFromEmailConfigurationError(
  fromEmail = getEmailSender("quote"),
) {
  return getEmailSenderConfigurationError("quote", fromEmail);
}

export function getResendSendFailureMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message.includes("domain is not verified")) {
    return "Email sender must use an address on a verified sending domain. Personal mailbox addresses belong in the reply-to setting instead.";
  }

  if (!(error instanceof EmailSendError)) {
    return null;
  }

  switch (error.code) {
    case "email_not_configured":
      return "Quote email delivery is unavailable right now. Configure email and try again.";
    case "email_delivery_unknown":
      return "We couldn't confirm whether the email was accepted. Check provider logs before retrying.";
    case "email_send_in_progress":
      return "That email is already being sent. Wait a moment before trying again.";
    case "email_delivery_rejected":
      return error.message;
    default:
      return null;
  }
}

export async function sendPasswordResetEmail({
  userId,
  email,
  name,
  url,
  token,
}: SendPasswordResetEmailInput) {
  if (!isEmailConfigured) {
    logDeliverySkipped(
      "Email is not configured yet. Password reset email delivery was skipped.",
      "auth",
    );
    return;
  }

  const senderConfigurationError = getConfigurationError("auth");

  if (senderConfigurationError) {
    logDeliverySkipped(
      `Email sender is misconfigured. Password reset email delivery was skipped. ${senderConfigurationError}`,
      "auth",
    );
    return;
  }

  const template = renderPasswordResetEmail({
    name,
    resetUrl: url,
  });

  await sendBrandedEmail({
    emailType: "auth",
    to: email,
    replyTo: getFallbackReplyTo(),
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `auth:password-reset:${userId}:${hashIdempotencyPart(token)}`,
    userId,
    metadata: {
      userId,
      authEvent: "password_reset",
    },
    tags: {
      type: "auth",
      event: "password_reset",
    },
  });
}

export async function sendVerificationEmail({
  userId,
  email,
  name,
  token,
  url,
}: SendVerificationEmailInput) {
  if (!isEmailConfigured) {
    throw new Error("Email verification delivery is not configured yet.");
  }

  const senderConfigurationError = getConfigurationError("auth");

  if (senderConfigurationError) {
    throw new Error(senderConfigurationError);
  }

  const template = renderEmailVerificationEmail({
    name,
    verificationUrl: url,
  });

  await sendBrandedEmail({
    emailType: "auth",
    to: email,
    replyTo: getFallbackReplyTo(),
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `auth:email-verification:${userId}:${hashIdempotencyPart(token)}`,
    userId,
    metadata: {
      userId,
      authEvent: "email_verification",
    },
    tags: {
      type: "auth",
      event: "email_verification",
    },
  });
}

export async function sendBusinessMemberInviteEmail({
  inviteId,
  token,
  email,
  businessName,
  inviterName,
  role,
  inviteUrl,
  businessId,
  userId,
}: SendBusinessMemberInviteEmailInput) {
  if (!isEmailConfigured) {
    logDeliverySkipped(
      "Email is not configured yet. Business member invite delivery was skipped.",
      "system",
    );
    return false;
  }

  const senderConfigurationError = getConfigurationError("system");

  if (senderConfigurationError) {
    logDeliverySkipped(
      `Email sender is misconfigured. Business member invite delivery was skipped. ${senderConfigurationError}`,
      "system",
    );
    return false;
  }

  const template = renderBusinessMemberInviteEmail({
    businessName,
    inviterName,
    role,
    inviteUrl,
  });

  await sendBrandedEmail({
    emailType: "system",
    to: email,
    replyTo: getFallbackReplyTo(),
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `business-member-invite:${inviteId}:${hashIdempotencyPart(token)}:${getRecipientKey(email)}`,
    businessId,
    userId,
    metadata: {
      inviteId,
      businessId,
      role,
    },
    tags: {
      type: "system",
      event: "business_member_invite",
    },
  });

  return true;
}

export async function sendPublicInquiryNotificationEmail({
  inquiryId,
  recipients,
  businessName,
  dashboardUrl,
  inquiryFormName,
  customerName,
  customerEmail,
  customerContactMethod,
  customerContactHandle,
  serviceCategory,
  deadline,
  budget,
  details,
  attachmentName,
  additionalFields,
  businessId,
}: SendPublicInquiryNotificationEmailInput) {
  if (!recipients.length) {
    return;
  }

  if (!isEmailConfigured) {
    logDeliverySkipped(
      "Email is not configured yet. Inquiry notification email delivery was skipped.",
      "inquiry",
    );
    return;
  }

  const senderConfigurationError = getConfigurationError("inquiry");

  if (senderConfigurationError) {
    logDeliverySkipped(
      `Email sender is misconfigured. Inquiry notification email delivery was skipped. ${senderConfigurationError}`,
      "inquiry",
    );
    return;
  }

  const template = renderPublicInquiryNotificationEmail({
    businessName,
    dashboardUrl,
    inquiryFormName,
    customerName,
    customerEmail,
    customerContactMethod,
    customerContactHandle,
    serviceCategory,
    deadline,
    budget,
    details,
    attachmentName,
    additionalFields,
  });

  await sendBrandedEmail({
    emailType: "inquiry",
    to: recipients,
    replyTo: getFallbackReplyTo(),
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `inquiry:${inquiryId}:notification:${getRecipientSetKey(recipients)}`,
    businessId,
    metadata: {
      inquiryId,
      businessId,
      inquiryFormName,
    },
    tags: {
      type: "inquiry",
      event: "public_inquiry_notification",
    },
  });
}

export async function sendQuoteEmail({
  quoteId,
  updatedAt,
  businessName,
  customerName,
  customerEmail,
  quoteNumber,
  title,
  publicQuoteUrl,
  currency,
  validUntil,
  subtotalInCents,
  discountInCents,
  totalInCents,
  notes,
  emailSignature,
  items,
  templateOverrides,
  replyToEmail,
  businessId,
  userId,
}: SendQuoteEmailInput) {
  if (!customerEmail) {
    return;
  }

  if (!isEmailConfigured) {
    throw new Error("Quote delivery email is not configured yet.");
  }

  const senderConfigurationError = getConfigurationError("quote");

  if (senderConfigurationError) {
    throw new Error(senderConfigurationError);
  }

  const template = renderQuoteEmail({
    businessName,
    customerName,
    quoteNumber,
    title,
    publicQuoteUrl,
    currency,
    validUntil,
    subtotalInCents,
    discountInCents,
    totalInCents,
    notes,
    emailSignature,
    items,
    templateOverrides,
  });

  await sendBrandedEmail({
    emailType: "quote",
    to: customerEmail,
    replyTo: getFallbackReplyTo(replyToEmail),
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `quote:${quoteId}:sent:${getRecipientKey(customerEmail)}`,
    businessId,
    userId,
    metadata: {
      quoteId,
      quoteNumber,
      businessId,
      updatedAt: updatedAt.toISOString(),
    },
    tags: {
      type: "quote",
      event: "quote_sent",
    },
  });
}

export async function sendQuoteSentOwnerNotificationEmail({
  quoteId,
  updatedAt,
  recipients,
  businessName,
  customerName,
  customerEmail,
  quoteNumber,
  title,
  dashboardUrl,
  publicQuoteUrl,
  businessId,
}: SendQuoteSentOwnerNotificationEmailInput) {
  if (!recipients.length) {
    return;
  }

  if (!isEmailConfigured) {
    logDeliverySkipped(
      "Email is not configured yet. Quote owner notification email delivery was skipped.",
      "quote",
    );
    return;
  }

  const senderConfigurationError = getConfigurationError("quote");

  if (senderConfigurationError) {
    logDeliverySkipped(
      `Email sender is misconfigured. Quote owner notification email delivery was skipped. ${senderConfigurationError}`,
      "quote",
    );
    return;
  }

  const template = renderQuoteSentOwnerNotificationEmail({
    businessName,
    customerName,
    customerEmail: customerEmail ?? "Not provided",
    quoteNumber,
    title,
    dashboardUrl,
    publicQuoteUrl,
  });

  await sendBrandedEmail({
    emailType: "quote",
    to: recipients,
    replyTo: getFallbackReplyTo(),
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `quote:${quoteId}:sent-owner-notification:${getRecipientSetKey(recipients)}`,
    businessId,
    metadata: {
      quoteId,
      quoteNumber,
      businessId,
      updatedAt: updatedAt.toISOString(),
    },
    tags: {
      type: "quote",
      event: "quote_sent_owner_notification",
    },
  });
}

export async function sendQuoteResponseOwnerNotificationEmail({
  quoteId,
  updatedAt,
  recipients,
  businessName,
  customerName,
  customerEmail,
  customerMessage,
  quoteNumber,
  title,
  response,
  dashboardUrl,
  businessId,
}: SendQuoteResponseOwnerNotificationEmailInput) {
  if (!recipients.length) {
    return;
  }

  if (!isEmailConfigured) {
    logDeliverySkipped(
      "Email is not configured yet. Quote response owner notification email delivery was skipped.",
      "quote",
    );
    return;
  }

  const senderConfigurationError = getConfigurationError("quote");

  if (senderConfigurationError) {
    logDeliverySkipped(
      `Email sender is misconfigured. Quote response owner notification email delivery was skipped. ${senderConfigurationError}`,
      "quote",
    );
    return;
  }

  const template = renderQuoteResponseOwnerNotificationEmail({
    businessName,
    customerName,
    customerEmail: customerEmail ?? "Not provided",
    customerMessage,
    quoteNumber,
    title,
    response,
    dashboardUrl,
  });

  await sendBrandedEmail({
    emailType: "quote",
    to: recipients,
    replyTo: getFallbackReplyTo(),
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey: `quote:${quoteId}:response:${response}:${getRecipientSetKey(recipients)}`,
    businessId,
    metadata: {
      quoteId,
      quoteNumber,
      response,
      businessId,
      updatedAt: updatedAt.toISOString(),
    },
    tags: {
      type: "quote",
      event: "quote_response_owner_notification",
    },
  });
}
