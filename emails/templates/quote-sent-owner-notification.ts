import {
  emailBrand,
  escapeAttribute,
  escapeHtml,
  renderDetailsCard,
  renderEmailLayout,
} from "./shared";

type QuoteSentOwnerNotificationTemplateInput = {
  businessName: string;
  customerName: string;
  customerEmail: string;
  quoteNumber: string;
  title: string;
  dashboardUrl: string;
  publicQuoteUrl: string;
};

export function renderQuoteSentOwnerNotificationEmail({
  businessName,
  customerName,
  customerEmail,
  quoteNumber,
  title,
  dashboardUrl,
  publicQuoteUrl,
}: QuoteSentOwnerNotificationTemplateInput) {
  const subject = `${quoteNumber} sent to ${customerName}`;
  const html = renderEmailLayout({
    label: "Quote",
    title: `${quoteNumber} sent`,
    preheader: `${businessName} sent ${quoteNumber} to ${customerName}.`,
    footerContext: businessName,
    cta: {
      href: dashboardUrl,
      label: "Open quote in dashboard",
    },
    children: `
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">${escapeHtml(businessName)} just sent a quote to the customer.</p>
      ${renderDetailsCard("Quote details", [
        { label: "Quote", value: `${quoteNumber} - ${title}` },
        { label: "Customer", value: customerName },
        { label: "Email", value: customerEmail },
      ])}
      <p style="margin: 18px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 20px;">
        Customer view: <a href="${escapeAttribute(publicQuoteUrl)}" style="color: ${emailBrand.primaryColor}; text-decoration: underline; word-break: break-all;">${escapeHtml(publicQuoteUrl)}</a>
      </p>
    `,
  });
  const text = [
    `${businessName} just sent a quote to the customer.`,
    "",
    `Quote: ${quoteNumber} - ${title}`,
    `Customer: ${customerName}`,
    `Email: ${customerEmail}`,
    "",
    `Dashboard: ${dashboardUrl}`,
    `Customer view: ${publicQuoteUrl}`,
  ].join("\n");

  return {
    subject,
    html,
    text,
  };
}
