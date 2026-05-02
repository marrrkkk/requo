import {
  emailBrand,
  escapeHtml,
  renderDetailsCard,
  renderEmailLayout,
  renderNoteCard,
} from "./shared";

type QuoteResponseOwnerNotificationTemplateInput = {
  businessName: string;
  customerName: string;
  customerEmail: string;
  customerMessage?: string | null;
  quoteNumber: string;
  title: string;
  response: "accepted" | "rejected";
  dashboardUrl: string;
};

export function renderQuoteResponseOwnerNotificationEmail({
  businessName,
  customerName,
  customerEmail,
  customerMessage,
  quoteNumber,
  title,
  response,
  dashboardUrl,
}: QuoteResponseOwnerNotificationTemplateInput) {
  const responseLabel = response === "accepted" ? "accepted" : "declined";
  const subject =
    response === "accepted"
      ? `${quoteNumber} accepted by ${customerName}`
      : `${quoteNumber} declined by ${customerName}`;
  const html = renderEmailLayout({
    label: "Quote",
    title:
      response === "accepted"
        ? `${quoteNumber} accepted`
        : `${quoteNumber} declined`,
    preheader: `${customerName} ${responseLabel} a quote from ${businessName}.`,
    footerContext: businessName,
    cta: {
      href: dashboardUrl,
      label: "Open quote in dashboard",
    },
    children: `
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">A customer ${responseLabel} a quote from ${escapeHtml(businessName)}.</p>
      ${renderDetailsCard("Quote response", [
        { label: "Quote", value: `${quoteNumber} - ${title}` },
        { label: "Customer", value: customerName },
        { label: "Email", value: customerEmail },
        { label: "Response", value: response === "accepted" ? "Accepted" : "Declined" },
      ])}
      ${customerMessage ? renderNoteCard("Customer message", customerMessage) : ""}
    `,
  });
  const text = [
    `A customer ${responseLabel} a quote from ${businessName}.`,
    "",
    `Quote: ${quoteNumber} - ${title}`,
    `Customer: ${customerName}`,
    `Email: ${customerEmail}`,
    customerMessage ? "" : null,
    customerMessage ? `Customer message: ${customerMessage}` : null,
    "",
    `Dashboard: ${dashboardUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html,
    text,
  };
}
