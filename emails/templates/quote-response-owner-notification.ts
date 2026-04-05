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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
      <p style="margin: 0 0 18px;">A customer ${responseLabel} a quote from ${escapeHtml(businessName)}.</p>
      <div style="border: 1px solid #d9deeb; border-radius: 18px; background: #ffffff; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px;"><strong>Quote:</strong> ${escapeHtml(quoteNumber)} - ${escapeHtml(title)}</p>
        <p style="margin: 0 0 8px;"><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
        <p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
      </div>
      ${
        customerMessage
          ? `<div style="border: 1px solid #d9deeb; border-radius: 18px; background: #f7f9fc; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px;"><strong>Customer message</strong></p>
        <p style="margin: 0;">${escapeHtml(customerMessage).replace(/\n/g, "<br />")}</p>
      </div>`
          : ""
      }
      <p style="margin: 0;">
        <a href="${escapeHtml(dashboardUrl)}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #172033; color: #ffffff; text-decoration: none; font-weight: 600;">
          Open quote in dashboard
        </a>
      </p>
    </div>
  `;
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
