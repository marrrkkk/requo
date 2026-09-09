import {
  emailBrand,
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
  issueDate: string;
  dueDate: string;
  subtotalInCents: number;
  discountInCents: number;
  taxInCents?: number;
  taxLabel?: string | null;
  totalInCents: number;
  balanceInCents: number;
  notes?: string | null;
  paymentTerms?: string | null;
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
  }).format(new Date(`${value}T00:00:00`));
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
                  <td align="center" style="padding: 13px 10px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 19px;">${escapeHtml(item.quantity)}</td>
                  <td align="right" style="padding: 13px 10px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 19px;">${escapeHtml(formatMoney(item.unitPriceInCents, currency))}</td>
                  <td align="right" style="padding: 13px 14px; border-bottom: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 19px; font-weight: 700;">${escapeHtml(formatMoney(item.lineTotalInCents, currency))}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTotals({
  subtotalInCents,
  discountInCents,
  taxInCents,
  taxLabel,
  totalInCents,
  balanceInCents,
  currency,
}: {
  subtotalInCents: number;
  discountInCents: number;
  taxInCents?: number;
  taxLabel?: string | null;
  totalInCents: number;
  balanceInCents: number;
  currency: string;
}) {
  return `
    <div style="margin: 22px 0; border: 1px solid ${emailBrand.borderColor}; border-radius: 14px; background: ${emailBrand.backgroundColor}; padding: 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding: 4px 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 18px;">Subtotal</td>
          <td align="right" style="padding: 4px 0; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 18px; font-weight: 600;">${escapeHtml(formatMoney(subtotalInCents, currency))}</td>
        </tr>
        ${
          discountInCents
            ? `<tr>
                <td style="padding: 4px 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 18px;">Discount</td>
                <td align="right" style="padding: 4px 0; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 18px; font-weight: 600;">-${escapeHtml(formatMoney(discountInCents, currency))}</td>
              </tr>`
            : ""
        }
        ${
          taxInCents
            ? `<tr>
                <td style="padding: 4px 0; color: ${emailBrand.mutedTextColor}; font-size: 13px; line-height: 18px;">${escapeHtml(taxLabel || "Tax")}</td>
                <td align="right" style="padding: 4px 0; color: ${emailBrand.foregroundColor}; font-size: 13px; line-height: 18px; font-weight: 600;">${escapeHtml(formatMoney(taxInCents, currency))}</td>
              </tr>`
            : ""
        }
        <tr>
          <td style="padding: 12px 0 0; border-top: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 22px; font-weight: 800;">Total</td>
          <td align="right" style="padding: 12px 0 0; border-top: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 18px; line-height: 24px; font-weight: 800;">${escapeHtml(formatMoney(totalInCents, currency))}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 20px; font-weight: 700;">Balance due</td>
          <td align="right" style="padding: 4px 0; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 20px; font-weight: 700;">${escapeHtml(formatMoney(balanceInCents, currency))}</td>
        </tr>
      </table>
    </div>
  `;
}

export function renderInvoiceEmail({
  businessName,
  customerName,
  invoiceNumber,
  title,
  currency,
  issueDate,
  dueDate,
  subtotalInCents,
  discountInCents,
  taxInCents,
  taxLabel,
  totalInCents,
  balanceInCents,
  notes,
  paymentTerms,
  emailSignature,
  items,
}: InvoiceEmailTemplateInput) {
  const greeting = `Hi ${customerName},`;
  const introText = `${businessName} sent you invoice ${invoiceNumber} for ${formatMoney(totalInCents, currency)}, due ${formatDate(dueDate)}.`;
  const closingText = "Reply to this email if anything looks off — we're happy to help.";

  const textLines = [
    greeting,
    "",
    introText,
    `Invoice number: ${invoiceNumber}`,
    `Title: ${title}`,
    `Issued: ${formatDate(issueDate)}`,
    `Due: ${formatDate(dueDate)}`,
    "",
    "Line items:",
    ...items.map(
      (item) =>
        `- ${item.description} x${item.quantity} at ${formatMoney(item.unitPriceInCents, currency)} = ${formatMoney(item.lineTotalInCents, currency)}`,
    ),
    "",
    `Subtotal: ${formatMoney(subtotalInCents, currency)}`,
    discountInCents ? `Discount: -${formatMoney(discountInCents, currency)}` : null,
    taxInCents ? `${taxLabel || "Tax"}: ${formatMoney(taxInCents, currency)}` : null,
    `Total: ${formatMoney(totalInCents, currency)}`,
    `Balance due: ${formatMoney(balanceInCents, currency)}`,
    paymentTerms ? "" : null,
    paymentTerms ? "Payment terms:" : null,
    paymentTerms ?? null,
    notes ? "" : null,
    notes ? "Notes:" : null,
    notes ?? null,
    "",
    emailSignature ? emailSignature : null,
    emailSignature ? "" : null,
    closingText,
  ].filter(Boolean);

  const html = renderEmailLayout({
    label: "Invoice",
    title,
    preheader: `${invoiceNumber} from ${businessName} is due ${formatDate(dueDate)}.`,
    footerContext: businessName,
    children: `
      <p style="margin: 0 0 14px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">${escapeHtml(greeting)}</p>
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">${escapeHtml(introText)}</p>
      ${renderDetailsCard("Invoice summary", [
        { label: "Reference", value: invoiceNumber },
        { label: "Customer", value: customerName },
        { label: "Issued", value: formatDate(issueDate) },
        { label: "Due", value: formatDate(dueDate) },
        { label: "Balance due", value: formatMoney(balanceInCents, currency) },
      ])}
      ${renderLineItemsTable(items, currency)}
      ${renderTotals({ subtotalInCents, discountInCents, taxInCents, taxLabel, totalInCents, balanceInCents, currency })}
      ${paymentTerms ? renderNoteCard("Payment terms", paymentTerms) : ""}
      ${notes ? renderNoteCard("Notes", notes) : ""}
      ${
        emailSignature
          ? `<div style="margin: 22px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 14px; line-height: 22px;">${escapeHtml(emailSignature).replace(/\n/g, "<br />")}</div>`
          : ""
      }
      <p style="margin: 22px 0 0; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 22px;">${escapeHtml(closingText)}</p>
    `,
  });

  return {
    subject: `Invoice ${invoiceNumber} from ${businessName} — due ${formatDate(dueDate)}`,
    text: textLines.join("\n"),
    html,
  };
}
