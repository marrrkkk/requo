import {
  emailBrand,
  escapeHtml,
  renderEmailLayout,
} from "./shared";

type QuoteFollowUpEmailInput = {
  businessName: string;
  customerName: string;
  quoteNumber: string;
  title: string;
  publicQuoteUrl: string;
  attemptNumber: number;
  emailSignature?: string | null;
};

export function renderQuoteFollowUpEmail({
  businessName,
  customerName,
  quoteNumber,
  title,
  publicQuoteUrl,
  attemptNumber,
  emailSignature,
}: QuoteFollowUpEmailInput) {
  const greeting = `Hi ${customerName.trim() || "there"}`;

  const bodyText =
    attemptNumber === 1
      ? `Just following up on the quote we sent for "${title}". We wanted to make sure it reached you and see if you have any questions.`
      : `We wanted to check in one more time about your quote for "${title}". If you're still interested, the quote is ready for your review whenever you're ready.`;

  const subject =
    attemptNumber === 1
      ? `Following up: ${quoteNumber} from ${businessName}`
      : `Checking in: ${quoteNumber} from ${businessName}`;

  const textLines = [
    greeting,
    "",
    bodyText,
    "",
    `Review your quote here: ${publicQuoteUrl}`,
    "",
    emailSignature ?? "",
    `Best regards,`,
    businessName,
  ].filter((line) => line !== null);

  const html = renderEmailLayout({
    label: "Follow-up",
    title: `Following up on ${quoteNumber}`,
    preheader: `${businessName} is following up on your quote.`,
    footerContext: businessName,
    cta: {
      href: publicQuoteUrl,
      label: "View quote",
    },
    children: `
      <p style="margin: 0 0 14px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">${escapeHtml(greeting)},</p>
      <p style="margin: 0 0 20px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">${escapeHtml(bodyText)}</p>
      ${
        emailSignature
          ? `<div style="margin: 22px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 14px; line-height: 22px;">${escapeHtml(emailSignature).replace(/\n/g, "<br />")}</div>`
          : ""
      }
      <p style="margin: 22px 0 0; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 22px;">Best regards,<br />${escapeHtml(businessName)}</p>
    `,
  });

  return {
    subject,
    text: textLines.join("\n"),
    html,
  };
}
