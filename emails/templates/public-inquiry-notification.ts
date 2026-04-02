type PublicInquiryNotificationTemplateInput = {
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
}: PublicInquiryNotificationTemplateInput) {
  const subject = `New inquiry for ${workspaceName}`;
  const detailLines = [
    `Customer: ${customerName}`,
    `Email: ${customerEmail}`,
    buildOptionalLine("Phone", customerPhone),
    `Service/category: ${serviceCategory}`,
    buildOptionalLine("Deadline", deadline),
    buildOptionalLine("Budget", budget),
    buildOptionalLine("Attachment", attachmentName),
    "",
    "Message/details:",
    details,
    "",
    `Open in QuoteFlow: ${dashboardUrl}`,
  ].filter(Boolean);

  const escapedDetails = escapeHtml(details).replace(/\n/g, "<br />");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">New inquiry for ${escapeHtml(workspaceName)}</h1>
      <p style="margin: 0 0 18px;">A customer submitted a new inquiry through your QuoteFlow public page.</p>
      <div style="border: 1px solid #d9deeb; border-radius: 16px; background: #ffffff; padding: 18px; margin-bottom: 18px;">
        <p style="margin: 0 0 8px;"><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
        ${
          customerPhone
            ? `<p style="margin: 0 0 8px;"><strong>Phone:</strong> ${escapeHtml(customerPhone)}</p>`
            : ""
        }
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
      <div style="border: 1px solid #d9deeb; border-radius: 16px; background: #f7f9fc; padding: 18px; margin-bottom: 18px;">
        <p style="margin: 0 0 10px;"><strong>Message/details</strong></p>
        <p style="margin: 0;">${escapedDetails}</p>
      </div>
      <p style="margin: 0;">
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #2d4ea0; color: #ffffff; text-decoration: none; font-weight: 600;">
          Open in QuoteFlow
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
