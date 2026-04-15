import { Resend } from "resend";

import type { QuoteEmailTemplateConfig } from "@/features/settings/email-templates";
import { renderBusinessMemberInviteEmail } from "@/emails/templates/business-member-invite";
import { renderPasswordResetEmail } from "@/emails/templates/password-reset";
import { renderPublicInquiryNotificationEmail } from "@/emails/templates/public-inquiry-notification";
import { renderQuoteEmail } from "@/emails/templates/quote-email";
import { renderQuoteResponseOwnerNotificationEmail } from "@/emails/templates/quote-response-owner-notification";
import { renderQuoteSentOwnerNotificationEmail } from "@/emails/templates/quote-sent-owner-notification";
import { env, isResendConfigured } from "@/lib/env";
import type { BusinessMemberAssignableRole } from "@/lib/business-members";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const consumerMailboxProviderDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
]);

type SendPasswordResetEmailInput = {
  userId: string;
  email: string;
  name: string;
  url: string;
  token: string;
};

type SendBusinessMemberInviteEmailInput = {
  inviteId: string;
  token: string;
  email: string;
  businessName: string;
  inviterName: string;
  role: BusinessMemberAssignableRole;
  inviteUrl: string;
};

type SendPublicInquiryNotificationEmailInput = {
  inquiryId: string;
  recipients: string[];
  businessName: string;
  dashboardUrl: string;
  inquiryFormName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  serviceCategory: string;
  deadline?: string;
  budget?: string;
  details: string;
  attachmentName?: string | null;
  additionalFields?: Array<{
    label: string;
    value: string;
  }>;
};

type SendQuoteEmailInput = {
  quoteId: string;
  updatedAt: Date;
  businessName: string;
  customerName: string;
  customerEmail: string;
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
};

type SendQuoteSentOwnerNotificationEmailInput = {
  quoteId: string;
  updatedAt: Date;
  recipients: string[];
  businessName: string;
  customerName: string;
  customerEmail: string;
  quoteNumber: string;
  title: string;
  dashboardUrl: string;
  publicQuoteUrl: string;
};

type SendQuoteResponseOwnerNotificationEmailInput = {
  quoteId: string;
  updatedAt: Date;
  recipients: string[];
  businessName: string;
  customerName: string;
  customerEmail: string;
  customerMessage?: string | null;
  quoteNumber: string;
  title: string;
  response: "accepted" | "rejected";
  dashboardUrl: string;
};

function getEmailDomain(email: string) {
  const atIndex = email.lastIndexOf("@");

  return atIndex >= 0 ? email.slice(atIndex + 1).toLowerCase() : "";
}

export function getResendFromEmailConfigurationError(
  fromEmail = env.RESEND_FROM_EMAIL,
) {
  if (!fromEmail) {
    return "Set RESEND_FROM_EMAIL to an address on a domain verified in Resend before sending quote emails.";
  }

  const domain = getEmailDomain(fromEmail);

  if (!domain) {
    return "Set RESEND_FROM_EMAIL to an address on a domain verified in Resend before sending quote emails.";
  }

  if (consumerMailboxProviderDomains.has(domain)) {
    return `RESEND_FROM_EMAIL cannot use ${domain}. Use an address on a domain verified in Resend, and keep your normal inbox in RESEND_REPLY_TO_EMAIL instead.`;
  }

  return null;
}

export function getResendSendFailureMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message.includes("domain is not verified")) {
    return "RESEND_FROM_EMAIL must use an address on a domain verified in Resend. Personal mailbox addresses belong in RESEND_REPLY_TO_EMAIL instead.";
  }

  return null;
}

export async function sendPasswordResetEmail({
  userId,
  email,
  name,
  url,
  token,
}: SendPasswordResetEmailInput) {
  if (!resend || !isResendConfigured || !env.RESEND_FROM_EMAIL) {
    console.warn(
      "Resend is not configured yet. Password reset email delivery was skipped.",
    );
    return;
  }

  const senderConfigurationError = getResendFromEmailConfigurationError();

  if (senderConfigurationError) {
    console.warn(
      `Resend sender is misconfigured. Password reset email delivery was skipped. ${senderConfigurationError}`,
    );
    return;
  }

  const template = renderPasswordResetEmail({
    name,
    resetUrl: url,
  });

  const { error } = await resend.emails.send(
    {
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      replyTo: env.RESEND_REPLY_TO_EMAIL ? [env.RESEND_REPLY_TO_EMAIL] : undefined,
      subject: template.subject,
      html: template.html,
      text: template.text,
    },
    {
      idempotencyKey: `password-reset/${userId}/${token}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendBusinessMemberInviteEmail({
  inviteId,
  token,
  email,
  businessName,
  inviterName,
  role,
  inviteUrl,
}: SendBusinessMemberInviteEmailInput) {
  if (!resend || !isResendConfigured || !env.RESEND_FROM_EMAIL) {
    console.warn(
      "Resend is not configured yet. Business member invite delivery was skipped.",
    );
    return false;
  }

  const senderConfigurationError = getResendFromEmailConfigurationError();

  if (senderConfigurationError) {
    console.warn(
      `Resend sender is misconfigured. Business member invite delivery was skipped. ${senderConfigurationError}`,
    );
    return false;
  }

  const template = renderBusinessMemberInviteEmail({
    businessName,
    inviterName,
    role,
    inviteUrl,
  });

  const { error } = await resend.emails.send(
    {
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      replyTo: env.RESEND_REPLY_TO_EMAIL ? [env.RESEND_REPLY_TO_EMAIL] : undefined,
      subject: template.subject,
      html: template.html,
      text: template.text,
    },
    {
      idempotencyKey: `business-member-invite/${inviteId}/${token}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

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
  customerPhone,
  companyName,
  serviceCategory,
  deadline,
  budget,
  details,
  attachmentName,
  additionalFields,
}: SendPublicInquiryNotificationEmailInput) {
  if (!recipients.length) {
    return;
  }

  if (!resend || !isResendConfigured || !env.RESEND_FROM_EMAIL) {
    console.warn(
      "Resend is not configured yet. Inquiry notification email delivery was skipped.",
    );
    return;
  }

  const senderConfigurationError = getResendFromEmailConfigurationError();

  if (senderConfigurationError) {
    console.warn(
      `Resend sender is misconfigured. Inquiry notification email delivery was skipped. ${senderConfigurationError}`,
    );
    return;
  }

  const template = renderPublicInquiryNotificationEmail({
    businessName,
    dashboardUrl,
    inquiryFormName,
    customerName,
    customerEmail,
    customerPhone,
    companyName,
    serviceCategory,
    deadline,
    budget,
    details,
    attachmentName,
    additionalFields,
  });

  const { error } = await resend.emails.send(
    {
      from: env.RESEND_FROM_EMAIL,
      to: recipients,
      replyTo: env.RESEND_REPLY_TO_EMAIL ? [env.RESEND_REPLY_TO_EMAIL] : undefined,
      subject: template.subject,
      html: template.html,
      text: template.text,
    },
    {
      idempotencyKey: `public-inquiry/${inquiryId}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
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
}: SendQuoteEmailInput) {
  if (!resend || !isResendConfigured || !env.RESEND_FROM_EMAIL) {
    throw new Error("Quote delivery email is not configured yet.");
  }

  const senderConfigurationError = getResendFromEmailConfigurationError();

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

  const { error } = await resend.emails.send(
    {
      from: env.RESEND_FROM_EMAIL,
      to: [customerEmail],
      replyTo: replyToEmail
        ? [replyToEmail]
        : env.RESEND_REPLY_TO_EMAIL
          ? [env.RESEND_REPLY_TO_EMAIL]
          : undefined,
      subject: template.subject,
      html: template.html,
      text: template.text,
    },
    {
      idempotencyKey: `quote-send/${quoteId}/${updatedAt.getTime()}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
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
}: SendQuoteSentOwnerNotificationEmailInput) {
  if (!recipients.length) {
    return;
  }

  if (!resend || !isResendConfigured || !env.RESEND_FROM_EMAIL) {
    console.warn(
      "Resend is not configured yet. Quote owner notification email delivery was skipped.",
    );
    return;
  }

  const senderConfigurationError = getResendFromEmailConfigurationError();

  if (senderConfigurationError) {
    console.warn(
      `Resend sender is misconfigured. Quote owner notification email delivery was skipped. ${senderConfigurationError}`,
    );
    return;
  }

  const template = renderQuoteSentOwnerNotificationEmail({
    businessName,
    customerName,
    customerEmail,
    quoteNumber,
    title,
    dashboardUrl,
    publicQuoteUrl,
  });

  const { error } = await resend.emails.send(
    {
      from: env.RESEND_FROM_EMAIL,
      to: recipients,
      replyTo: env.RESEND_REPLY_TO_EMAIL ? [env.RESEND_REPLY_TO_EMAIL] : undefined,
      subject: template.subject,
      html: template.html,
      text: template.text,
    },
    {
      idempotencyKey: `quote-owner-notify/${quoteId}/${updatedAt.getTime()}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
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
}: SendQuoteResponseOwnerNotificationEmailInput) {
  if (!recipients.length) {
    return;
  }

  if (!resend || !isResendConfigured || !env.RESEND_FROM_EMAIL) {
    console.warn(
      "Resend is not configured yet. Quote response owner notification email delivery was skipped.",
    );
    return;
  }

  const senderConfigurationError = getResendFromEmailConfigurationError();

  if (senderConfigurationError) {
    console.warn(
      `Resend sender is misconfigured. Quote response owner notification email delivery was skipped. ${senderConfigurationError}`,
    );
    return;
  }

  const template = renderQuoteResponseOwnerNotificationEmail({
    businessName,
    customerName,
    customerEmail,
    customerMessage,
    quoteNumber,
    title,
    response,
    dashboardUrl,
  });

  const { error } = await resend.emails.send(
    {
      from: env.RESEND_FROM_EMAIL,
      to: recipients,
      replyTo: env.RESEND_REPLY_TO_EMAIL ? [env.RESEND_REPLY_TO_EMAIL] : undefined,
      subject: template.subject,
      html: template.html,
      text: template.text,
    },
    {
      idempotencyKey: `quote-response-owner-notify/${quoteId}/${updatedAt.getTime()}/${response}`,
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}
