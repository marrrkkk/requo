import {
  emailBrand,
  escapeAttribute,
  escapeHtml,
  renderDetailsCard,
  renderEmailLayout,
  renderNoteCard,
} from "./shared";

type InvoiceEmailLineItem = {
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
};

type InvoiceEmailTemplateInput = {
  businessName: string;
  customerName: string;
  invoiceNumber: string;
  title: string;
  currency: string;
  subtotalInCents: number;
  discountInCents: number;
  taxInCents?: number;
  taxLabel?: string | null;
  totalInCents: number;
  dueAt?: string | null;
  notes?: string | null;
  emailSignature?: string | null;
  items: InvoiceEmailLineItem[];
};

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
  }).format(new Date(value));
}

function renderLineItemsTable(items: InvoiceEmailLineItem[], currency: string) {
  if (!items.length) {
    return "";
  }

  return `
    <div style="margin: 22px 0; border: 1px solid ${emailBrand.borderColor}; border-radius: 14px; overflow: hidden;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
        <thead>
          <tr>
            <th align="left" style="padding: 12px 14px; background: ${emailBrand.accentColor}; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px; text-transform: uppercase;">Item</th>
            <th align="center" style="padding: 12px 10px; background: ${emailBrand.accentColor}; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px; text-transform: uppercase;">Qty</th>
            <th align="right" style="padding: 12px 10px; background: ${emailBrand.accentColor}; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px; text-transform: uppercase;">Unit</th>
            <th align="right" style="padding: 12px 14px; background: ${emailBrand.accentColor}; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.mutedTextColor}; font-size: 12px; line-height: 16px; text-transform: uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
                <tr>
                  <td style="padding: 13px 14px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 19px;">${escapeHtml(item.description)}</td>
                  <td align="center" style="padding: 13px 10px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 19px;">${escapeHtml(String(item.quantity))}</td>
                  <td align="right" style="padding: 13px 10px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 19px;">${escapeHtml(formatMoney(item.unitPriceInCents, currency))}</td>
                  <td align="right" style="padding: 13px 14px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 19px; font-weight: 700;">${escapeHtml(formatMoney(item.lineTotalInCents, currency))}</td>
                </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderTotals(input: InvoiceEmailTemplateInput) {
  return renderDetailsCard("Summary", [
    { label: "Subtotal", value: formatMoney(input.subtotalInCents, input.currency) },
    ...(input.discountInCents > 0
      ? [{ label: "Discount", value: `−${formatMoney(input.discountInCents, input.currency)}` }]
      : []),
    ...(input.taxInCents && input.taxInCents > 0
      ? [{ label: input.taxLabel || "Tax", value: formatMoney(input.taxInCents, input.currency) }]
      : []),
    { label: "Total due", value: formatMoney(input.totalInCents, input.currency) },
  ]);
}

export function renderInvoiceEmail(input: InvoiceEmailTemplateInput) {
  const subject = `Invoice ${input.invoiceNumber} from ${input.businessName}`;

  const greeting = `Hi ${escapeHtml(input.customerName)},`;
  const intro = `Here is your invoice from <strong>${escapeHtml(input.businessName)}</strong>.`;

  const dueInfo = input.dueAt
    ? `<p style="margin: 0 0 16px; color: ${emailBrand.mutedTextColor}; font-size: 14px; line-height: 22px;">Payment due by <strong>${escapeHtml(formatDate(input.dueAt))}</strong>.</p>`
    : "";

  const lineItems = renderLineItemsTable(input.items, input.currency);
  const totals = renderTotals(input);
  const notes = input.notes
    ? renderNoteCard("Notes", input.notes)
    : "";

  const signature = input.emailSignature
    ? `<p style="margin: 24px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 20px; white-space: pre-wrap;">${escapeHtml(input.emailSignature)}</p>`
    : "";

  const body = `
    <p style="margin: 0 0 6px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">${greeting}</p>
    <p style="margin: 0 0 16px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">${intro}</p>
    ${dueInfo}
    ${lineItems}
    ${totals}
    ${notes}
    ${signature}
  `;

  const html = renderEmailLayout({
    title: subject,
    preheader: `Invoice ${input.invoiceNumber} — ${formatMoney(input.totalInCents, input.currency)} due`,
    children: body,
  });

  const text = [
    greeting,
    `Here is your invoice from ${input.businessName}.`,
    "",
    `Invoice: ${input.invoiceNumber}`,
    `Title: ${input.title}`,
    `Total due: ${formatMoney(input.totalInCents, input.currency)}`,
    ...(input.dueAt ? [`Due by: ${formatDate(input.dueAt)}`] : []),
    "",
    ...input.items.map(
      (item) =>
        `- ${item.description} (${item.quantity} × ${formatMoney(item.unitPriceInCents, input.currency)} = ${formatMoney(item.lineTotalInCents, input.currency)})`,
    ),
    "",
    ...(input.notes ? [`Notes: ${input.notes}`, ""] : []),
    ...(input.emailSignature ? [input.emailSignature] : []),
  ].join("\n");

  return { subject, html, text };
}
