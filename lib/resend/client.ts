import "server-only";

import { Resend } from "resend";

import { renderPasswordResetEmail } from "@/emails/templates/password-reset";
import { renderPublicInquiryNotificationEmail } from "@/emails/templates/public-inquiry-notification";
import { renderQuoteEmail } from "@/emails/templates/quote-email";
import { env, isResendConfigured } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

type SendPasswordResetEmailInput = {
  userId: string;
  email: string;
  name: string;
  url: string;
  token: string;
};

type SendPublicInquiryNotificationEmailInput = {
  inquiryId: string;
  recipients: string[];
  workspaceName: string;
  dashboardUrl: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceCategory: string;
  deadline?: string;
  budget?: string;
  details: string;
  attachmentName?: string | null;
};

type SendQuoteEmailInput = {
  quoteId: string;
  updatedAt: Date;
  workspaceName: string;
  customerName: string;
  customerEmail: string;
  quoteNumber: string;
  title: string;
  currency: string;
  validUntil: string;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  notes?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceInCents: number;
    lineTotalInCents: number;
  }>;
  replyToEmail?: string;
};

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

export async function sendPublicInquiryNotificationEmail({
  inquiryId,
  recipients,
  workspaceName,
  dashboardUrl,
  customerName,
  customerEmail,
  customerPhone,
  serviceCategory,
  deadline,
  budget,
  details,
  attachmentName,
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

  const template = renderPublicInquiryNotificationEmail({
    workspaceName,
    dashboardUrl,
    customerName,
    customerEmail,
    customerPhone,
    serviceCategory,
    deadline,
    budget,
    details,
    attachmentName,
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
  workspaceName,
  customerName,
  customerEmail,
  quoteNumber,
  title,
  currency,
  validUntil,
  subtotalInCents,
  discountInCents,
  totalInCents,
  notes,
  items,
  replyToEmail,
}: SendQuoteEmailInput) {
  if (!resend || !isResendConfigured || !env.RESEND_FROM_EMAIL) {
    throw new Error("Quote delivery email is not configured yet.");
  }

  const template = renderQuoteEmail({
    workspaceName,
    customerName,
    quoteNumber,
    title,
    currency,
    validUntil,
    subtotalInCents,
    discountInCents,
    totalInCents,
    notes,
    items,
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
