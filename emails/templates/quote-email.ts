import {
  type QuoteEmailTemplateConfig,
  resolveQuoteEmailTemplate,
} from "@/features/settings/email-templates";
import {
  emailBrand,
  escapeAttribute,
  escapeHtml,
  renderDetailsCard,
  renderEmailLayout,
  renderNoteCard,
} from "./shared";

type QuoteEmailLineItem = {
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
};

type QuoteEmailTemplateInput = {
  businessName: string;
  customerName: string;
  quoteNumber: string;
  title: string;
  publicQuoteUrl: string;
  currency: string;
  validUntil: string;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  notes?: string | null;
  emailSignature?: string | null;
  items: QuoteEmailLineItem[];
  templateOverrides?: QuoteEmailTemplateConfig | null;
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

function renderLineItemsTable(items: QuoteEmailLineItem[], currency: string) {
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
  totalInCents,
  currency,
}: {
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
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
        <tr>
          <td style="padding: 12px 0 0; border-top: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 22px; font-weight: 800;">Total</td>
          <td align="right" style="padding: 12px 0 0; border-top: 1px solid ${emailBrand.borderColor}; color: ${emailBrand.foregroundColor}; font-size: 18px; line-height: 24px; font-weight: 800;">${escapeHtml(formatMoney(totalInCents, currency))}</td>
        </tr>
      </table>
    </div>
  `;
}

export function renderQuoteEmail({
  businessName,
  customerName,
  quoteNumber,
  title,
  publicQuoteUrl,
  currency,
  validUntil,
  subtotalInCents,
  discountInCents,
  totalInCents,
  notes,
  emailSignature,
  items,
  templateOverrides,
}: QuoteEmailTemplateInput) {
  const template = resolveQuoteEmailTemplate(templateOverrides, {
    businessName,
    customerName,
    quoteNumber,
    quoteTitle: title,
  });

  const textLines = [
    template.greeting,
    "",
    template.introText,
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
    "",
    `Review your quote here: ${publicQuoteUrl}`,
    notes ? "" : null,
    notes ? "Notes:" : null,
    notes ?? null,
    "",
    emailSignature ? emailSignature : null,
    emailSignature ? "" : null,
    template.closingText,
  ].filter(Boolean);

  const html = renderEmailLayout({
    label: "Quote",
    title,
    preheader: `${quoteNumber} from ${businessName} is ready to review.`,
    footerContext: businessName,
    cta: {
      href: publicQuoteUrl,
      label: template.ctaLabel,
    },
    children: `
      <p style="margin: 0 0 14px; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">${escapeHtml(template.greeting)}</p>
      <p style="margin: 0; color: ${emailBrand.foregroundColor}; font-size: 15px; line-height: 24px;">${escapeHtml(template.introText)}</p>
      ${renderDetailsCard("Quote summary", [
        { label: "Reference", value: quoteNumber },
        { label: "Customer", value: customerName },
        { label: "Valid until", value: formatDate(validUntil) },
        { label: "Total", value: formatMoney(totalInCents, currency) },
      ])}
      ${renderLineItemsTable(items, currency)}
      ${renderTotals({ subtotalInCents, discountInCents, totalInCents, currency })}
      ${notes ? renderNoteCard("Notes", notes) : ""}
      ${
        emailSignature
          ? `<div style="margin: 22px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 14px; line-height: 22px;">${escapeHtml(emailSignature).replace(/\n/g, "<br />")}</div>`
          : ""
      }
      <p style="margin: 22px 0 0; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 22px;">${escapeHtml(template.closingText)}</p>
      <a href="${escapeAttribute(publicQuoteUrl)}" style="display: none;">View quote</a>
    `,
  });

  return {
    subject: template.subject,
    text: textLines.join("\n"),
    html,
  };
}
