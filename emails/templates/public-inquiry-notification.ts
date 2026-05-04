import {
  emailBrand,
  renderDetailsCard,
  renderEmailLayout,
  renderNoteCard,
} from "./shared";

type PublicInquiryNotificationTemplateInput = {
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
};

function buildOptionalLine(label: string, value?: string | null) {
  if (!value) {
    return null;
  }

  return `${label}: ${value}`;
}

export function renderPublicInquiryNotificationEmail({
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
  additionalFields = [],
}: PublicInquiryNotificationTemplateInput) {
  const subject = `New inquiry for ${businessName}`;
  const detailLines = [
    `Form: ${inquiryFormName}`,
    `Customer: ${customerName}`,
    buildOptionalLine("Email", customerEmail),
    `Contact method: ${customerContactMethod}`,
    `Contact: ${customerContactHandle}`,
    `Service/category: ${serviceCategory}`,
    buildOptionalLine("Deadline", deadline),
    buildOptionalLine("Budget", budget),
    buildOptionalLine("Attachment", attachmentName),
    ...(additionalFields.length
      ? [
          "",
          "Additional details:",
          ...additionalFields.map((field) => `${field.label}: ${field.value}`),
        ]
      : []),
    "",
    "Message/details:",
    details,
    "",
    `Open in Requo: ${dashboardUrl}`,
  ].filter(Boolean);

  const html = renderEmailLayout({
    label: "Inquiry",
    title: `New inquiry for ${businessName}`,
    preheader: `${customerName} submitted a new inquiry through Requo.`,
    footerContext: businessName,
    cta: {
      href: dashboardUrl,
      label: "View inquiry",
    },
    children: `
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">A customer submitted a new inquiry through your Requo public page.</p>
      ${renderDetailsCard("Inquiry details", [
        { label: "Form", value: inquiryFormName },
        { label: "Customer", value: customerName },
        { label: "Email", value: customerEmail },
        { label: "Contact method", value: customerContactMethod },
        { label: "Contact", value: customerContactHandle },
        { label: "Service/category", value: serviceCategory },
        { label: "Deadline", value: deadline },
        { label: "Budget", value: budget },
        { label: "Attachment", value: attachmentName },
      ])}
      ${
        additionalFields.length
          ? renderDetailsCard(
              "Additional details",
              additionalFields.map((field) => ({
                label: field.label,
                value: field.value,
              })),
            )
          : ""
      }
      ${renderNoteCard("Message/details", details)}
    `,
  });

  return {
    subject,
    text: detailLines.join("\n"),
    html,
  };
}
