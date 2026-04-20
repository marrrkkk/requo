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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  const escapedDetails = escapeHtml(details).replace(/\n/g, "<br />");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">New inquiry for ${escapeHtml(businessName)}</h1>
      <p style="margin: 0 0 18px;">A customer submitted a new inquiry through your Requo public page.</p>
      <div style="border: 1px solid #d9deeb; border-radius: 16px; background: #ffffff; padding: 18px; margin-bottom: 18px;">
        <p style="margin: 0 0 8px;"><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
        <p style="margin: 0 0 8px;"><strong>Form:</strong> ${escapeHtml(inquiryFormName)}</p>
        ${customerEmail ? `<p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>` : ""}
        <p style="margin: 0 0 8px;"><strong>Contact method:</strong> ${escapeHtml(customerContactMethod)}</p>
        <p style="margin: 0 0 8px;"><strong>Contact:</strong> ${escapeHtml(customerContactHandle)}</p>
        <p style="margin: 0 0 8px;"><strong>Service/category:</strong> ${escapeHtml(serviceCategory)}</p>
        ${
          deadline
            ? `<p style="margin: 0 0 8px;"><strong>Deadline:</strong> ${escapeHtml(deadline)}</p>`
            : ""
        }
        ${
          budget
            ? `<p style="margin: 0 0 8px;"><strong>Budget:</strong> ${escapeHtml(budget)}</p>`
            : ""
        }
        ${
          attachmentName
            ? `<p style="margin: 0;"><strong>Attachment:</strong> ${escapeHtml(attachmentName)}</p>`
            : ""
        }
      </div>
      ${
        additionalFields.length
          ? `
      <div style="border: 1px solid #d9deeb; border-radius: 16px; background: #ffffff; padding: 18px; margin-bottom: 18px;">
        <p style="margin: 0 0 10px;"><strong>Additional details</strong></p>
        ${additionalFields
          .map(
            (field) =>
              `<p style="margin: 0 0 8px;"><strong>${escapeHtml(field.label)}:</strong> ${escapeHtml(field.value)}</p>`,
          )
          .join("")}
      </div>
      `
          : ""
      }
      <div style="border: 1px solid #d9deeb; border-radius: 16px; background: #f7f9fc; padding: 18px; margin-bottom: 18px;">
        <p style="margin: 0 0 10px;"><strong>Message/details</strong></p>
        <p style="margin: 0;">${escapedDetails}</p>
      </div>
      <p style="margin: 0;">
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #2d4ea0; color: #ffffff; text-decoration: none; font-weight: 600;">
          Open in Requo
        </a>
      </p>
    </div>
  `;

  return {
    subject,
    text: detailLines.join("\n"),
    html,
  };
}
