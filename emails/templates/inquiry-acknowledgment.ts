import { emailBrand, renderDetailsCard, renderEmailLayout } from "./shared";

type InquiryAcknowledgmentTemplateInput = {
  businessName: string;
  customerName: string;
  serviceCategory: string;
  details?: string;
};

export function renderInquiryAcknowledgmentEmail({
  businessName,
  customerName,
  serviceCategory,
  details,
}: InquiryAcknowledgmentTemplateInput) {
  const subject = `We received your inquiry — ${businessName}`;

  const html = renderEmailLayout({
    label: "Inquiry",
    title: `Thanks for reaching out${customerName ? `, ${customerName}` : ""}!`,
    preheader: `We received your inquiry about ${serviceCategory} and will get back to you soon.`,
    footerContext: businessName,
    children: `
      <p style="margin: 0 0 12px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">We received your inquiry about <strong>${serviceCategory}</strong> and will get back to you soon.</p>
      <p style="margin: 0 0 12px; color: ${emailBrand.mutedTextColor}; font-size: 14px; line-height: 22px;">There is nothing else you need to do right now. If anything changes, we will reach out using the contact details you provided.</p>
      ${renderDetailsCard("Your inquiry", [
        { label: "Service", value: serviceCategory },
        { label: "Sent to", value: businessName },
      ])}
      ${
        details
          ? `<p style="margin: 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 20px;">Reference details:<br />${details}</p>`
          : ""
      }
    `,
  });

  return {
    subject,
    html,
  };
}