type QuoteEmailLineItem = {
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
};

type QuoteEmailTemplateInput = {
  workspaceName: string;
  customerName: string;
  quoteNumber: string;
  title: string;
  currency: string;
  validUntil: string;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  notes?: string | null;
  items: QuoteEmailLineItem[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function renderQuoteEmail({
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
}: QuoteEmailTemplateInput) {
  const subject = `${quoteNumber} from ${workspaceName}`;
  const escapedNotes = notes
    ? escapeHtml(notes).replace(/\n/g, "<br />")
    : null;
  const itemRowsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e3e8f3;">${escapeHtml(item.description)}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e3e8f3; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e3e8f3; text-align: right;">${formatMoney(item.unitPriceInCents, currency)}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e3e8f3; text-align: right;">${formatMoney(item.lineTotalInCents, currency)}</td>
        </tr>
      `,
    )
    .join("");
  const textLines = [
    `Hi ${customerName},`,
    "",
    `${workspaceName} prepared a quote for you.`,
    `Quote number: ${quoteNumber}`,
    `Title: ${title}`,
    `Valid until: ${formatDate(validUntil)}`,
    "",
    "Line items:",
    ...items.map(
      (item) =>
        `- ${item.description} x${item.quantity} at ${formatMoney(item.unitPriceInCents, currency)} = ${formatMoney(item.lineTotalInCents, currency)}`,
    ),
    "",
    `Subtotal: ${formatMoney(subtotalInCents, currency)}`,
    discountInCents
      ? `Discount: -${formatMoney(discountInCents, currency)}`
      : null,
    `Total: ${formatMoney(totalInCents, currency)}`,
    notes ? "" : null,
    notes ? "Notes:" : null,
    notes ?? null,
    "",
    "Reply to this email if you have any questions.",
  ].filter(Boolean);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
      <p style="margin: 0 0 18px;">Hi ${escapeHtml(customerName)},</p>
      <h1 style="font-size: 28px; margin: 0 0 12px;">${escapeHtml(title)}</h1>
      <p style="margin: 0 0 20px;">${escapeHtml(workspaceName)} prepared quote <strong>${escapeHtml(quoteNumber)}</strong> for you.</p>
      <div style="border: 1px solid #d9deeb; border-radius: 18px; background: #ffffff; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px;"><strong>Quote number:</strong> ${escapeHtml(quoteNumber)}</p>
        <p style="margin: 0 0 8px;"><strong>Valid until:</strong> ${escapeHtml(formatDate(validUntil))}</p>
        <p style="margin: 0;"><strong>Total:</strong> ${escapeHtml(formatMoney(totalInCents, currency))}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr>
            <th style="padding: 0 0 10px; text-align: left; border-bottom: 1px solid #cfd7e6;">Item</th>
            <th style="padding: 0 0 10px; text-align: center; border-bottom: 1px solid #cfd7e6;">Qty</th>
            <th style="padding: 0 0 10px; text-align: right; border-bottom: 1px solid #cfd7e6;">Unit price</th>
            <th style="padding: 0 0 10px; text-align: right; border-bottom: 1px solid #cfd7e6;">Line total</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml}</tbody>
      </table>
      <div style="border: 1px solid #d9deeb; border-radius: 18px; background: #f7f9fc; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px;"><strong>Subtotal:</strong> ${escapeHtml(formatMoney(subtotalInCents, currency))}</p>
        ${
          discountInCents
            ? `<p style="margin: 0 0 8px;"><strong>Discount:</strong> -${escapeHtml(formatMoney(discountInCents, currency))}</p>`
            : ""
        }
        <p style="margin: 0;"><strong>Total:</strong> ${escapeHtml(formatMoney(totalInCents, currency))}</p>
      </div>
      ${
        escapedNotes
          ? `
            <div style="border: 1px solid #d9deeb; border-radius: 18px; background: #ffffff; padding: 18px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px;"><strong>Notes</strong></p>
              <p style="margin: 0;">${escapedNotes}</p>
            </div>
          `
          : ""
      }
      <p style="margin: 0;">Reply to this email if you have any questions.</p>
    </div>
  `;

  return {
    subject,
    text: textLines.join("\n"),
    html,
  };
}
