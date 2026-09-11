import {
  getDefaultContentForBlockType,
  normalizeInvoiceEmailTemplate,
  replaceInvoiceMergeTags,
  type EmailTemplateBlock,
  type InvoiceEmailMergeValues,
  type InvoiceEmailTemplateStored,
} from "@/features/settings/email-templates";
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
  templateOverrides?: InvoiceEmailTemplateStored;
};

type BlockInvoiceData = Omit<InvoiceEmailTemplateInput, "templateOverrides">;

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

function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function resolveTextColor(color: unknown): string {
  if (color === "muted") return emailBrand.mutedTextColor;
  if (typeof color === "string" && isValidHexColor(color)) return color.trim();
  return emailBrand.foregroundColor;
}

function resolveFontSize(size: unknown): { fontSize: string; lineHeight: string } {
  if (size === "sm") return { fontSize: "13px", lineHeight: "19px" };
  if (size === "lg") return { fontSize: "17px", lineHeight: "26px" };
  return { fontSize: "15px", lineHeight: "24px" };
}

function resolveAlign(align: unknown): "left" | "center" | "right" {
  if (align === "center" || align === "right") return align;
  return "left";
}

function resolveSpacingMargin(spacing: unknown): string {
  if (spacing === "compact") return "8px 0 0";
  if (spacing === "spacious") return "26px 0 0";
  return "16px 0 0";
}

function renderTextBlockHtml(block: EmailTemplateBlock, resolvedText: string) {
  const align = resolveAlign(block.style?.align);
  const { fontSize, lineHeight } = resolveFontSize(block.style?.fontSize);
  const color = resolveTextColor(block.style?.textColor);
  const margin = resolveSpacingMargin(block.style?.spacing);
  return `<p style="margin: ${margin}; color: ${escapeHtml(color)}; font-size: ${fontSize}; line-height: ${lineHeight}; text-align: ${align};">${escapeHtml(resolvedText).replace(/\n/g, "<br />")}</p>`;
}

function renderCtaBlockHtml(block: EmailTemplateBlock, label: string) {
  const align = resolveAlign(block.style?.align);
  const bg = isValidHexColor(block.style?.buttonColor)
    ? block.style.buttonColor.trim()
    : emailBrand.primaryColor;
  const textColor = isValidHexColor(block.style?.buttonTextColor)
    ? block.style.buttonTextColor.trim()
    : emailBrand.primaryTextColor;
  const margin = resolveSpacingMargin(block.style?.spacing);
  const alignAttr = align === "center" ? "center" : align === "right" ? "right" : "left";
  // Invoices have no public link by design (manual payment tracking only),
  // so the optional CTA renders as a styled non-linked badge.
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: ${margin};">
      <tr>
        <td align="${alignAttr}">
          <span style="display: inline-block; padding: 13px 18px; border-radius: 10px; background: ${escapeHtml(bg)}; color: ${escapeHtml(textColor)}; font-size: 14px; line-height: 20px; font-weight: 700;">
            ${escapeHtml(label)}
          </span>
        </td>
      </tr>
    </table>
  `;
}

function renderDividerBlockHtml(block: EmailTemplateBlock) {
  const margin = resolveSpacingMargin(block.style?.spacing);
  return `<div style="margin: ${margin}; border-top: 1px solid ${emailBrand.borderColor}; line-height: 0;">&nbsp;</div>`;
}

function renderSpacerBlockHtml(block: EmailTemplateBlock) {
  const height =
    block.style?.spacing === "compact"
      ? "8px"
      : block.style?.spacing === "spacious"
        ? "32px"
        : "18px";
  return `<div style="height: ${height}; line-height: ${height};">&nbsp;</div>`;
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

function buildMergeValues(data: BlockInvoiceData): InvoiceEmailMergeValues {
  return {
    businessName: data.businessName,
    customerName: data.customerName,
    invoiceNumber: data.invoiceNumber,
    invoiceTitle: data.title,
    balanceDue: formatMoney(data.balanceInCents, data.currency),
    dueDate: formatDate(data.dueDate),
    totalAmount: formatMoney(data.totalInCents, data.currency),
  };
}

function renderBlockHtml(
  block: EmailTemplateBlock,
  data: BlockInvoiceData,
  mergeValues: InvoiceEmailMergeValues,
): string {
  switch (block.type) {
    case "greeting":
    case "intro":
    case "text":
    case "closing": {
      const fallback = getDefaultContentForBlockType(block.type, "invoice");
      const raw = block.content?.trim() ? block.content : fallback;
      return renderTextBlockHtml(block, replaceInvoiceMergeTags(raw, mergeValues));
    }
    case "cta": {
      const raw = block.content?.trim()
        ? block.content
        : getDefaultContentForBlockType("cta", "invoice");
      return renderCtaBlockHtml(block, replaceInvoiceMergeTags(raw, mergeValues));
    }
    case "summary":
      return renderDetailsCard("Invoice summary", [
        { label: "Reference", value: data.invoiceNumber },
        { label: "Customer", value: data.customerName },
        { label: "Issued", value: formatDate(data.issueDate) },
        { label: "Due", value: formatDate(data.dueDate) },
        {
          label: "Balance due",
          value: formatMoney(data.balanceInCents, data.currency),
        },
      ]);
    case "line-items":
      return renderLineItemsTable(data.items, data.currency);
    case "totals":
      return renderTotals({
        subtotalInCents: data.subtotalInCents,
        discountInCents: data.discountInCents,
        taxInCents: data.taxInCents,
        taxLabel: data.taxLabel,
        totalInCents: data.totalInCents,
        balanceInCents: data.balanceInCents,
        currency: data.currency,
      });
    case "payment-terms":
      return data.paymentTerms ? renderNoteCard("Payment terms", data.paymentTerms) : "";
    case "notes":
      return data.notes ? renderNoteCard("Notes", data.notes) : "";
    case "signature":
      return data.emailSignature
        ? `<div style="margin: 22px 0 0; color: ${emailBrand.mutedTextColor}; font-size: 14px; line-height: 22px;">${escapeHtml(data.emailSignature).replace(/\n/g, "<br />")}</div>`
        : "";
    case "divider":
      return renderDividerBlockHtml(block);
    case "spacer":
      return renderSpacerBlockHtml(block);
    default:
      return "";
  }
}

function appendBlockText(
  lines: string[],
  block: EmailTemplateBlock,
  data: BlockInvoiceData,
  mergeValues: InvoiceEmailMergeValues,
) {
  switch (block.type) {
    case "greeting":
    case "intro":
    case "text":
    case "closing": {
      const fallback = getDefaultContentForBlockType(block.type, "invoice");
      const raw = block.content?.trim() ? block.content : fallback;
      lines.push(replaceInvoiceMergeTags(raw, mergeValues), "");
      break;
    }
    case "cta": {
      const raw = block.content?.trim()
        ? block.content
        : getDefaultContentForBlockType("cta", "invoice");
      lines.push(replaceInvoiceMergeTags(raw, mergeValues), "");
      break;
    }
    case "summary": {
      lines.push(
        `Invoice number: ${data.invoiceNumber}`,
        `Title: ${data.title}`,
        `Issued: ${formatDate(data.issueDate)}`,
        `Due: ${formatDate(data.dueDate)}`,
        "",
      );
      break;
    }
    case "line-items": {
      lines.push("Line items:");
      for (const item of data.items) {
        lines.push(
          `- ${item.description} x${item.quantity} at ${formatMoney(item.unitPriceInCents, data.currency)} = ${formatMoney(item.lineTotalInCents, data.currency)}`,
        );
      }
      lines.push("");
      break;
    }
    case "totals": {
      lines.push(`Subtotal: ${formatMoney(data.subtotalInCents, data.currency)}`);
      if (data.discountInCents) {
        lines.push(`Discount: -${formatMoney(data.discountInCents, data.currency)}`);
      }
      if (data.taxInCents) {
        lines.push(
          `${data.taxLabel || "Tax"}: ${formatMoney(data.taxInCents, data.currency)}`,
        );
      }
      lines.push(`Total: ${formatMoney(data.totalInCents, data.currency)}`);
      lines.push(`Balance due: ${formatMoney(data.balanceInCents, data.currency)}`, "");
      break;
    }
    case "payment-terms": {
      if (data.paymentTerms) {
        lines.push("Payment terms:", data.paymentTerms, "");
      }
      break;
    }
    case "notes": {
      if (data.notes) {
        lines.push("Notes:", data.notes, "");
      }
      break;
    }
    case "signature": {
      if (data.emailSignature) {
        lines.push(data.emailSignature, "");
      }
      break;
    }
    case "divider": {
      lines.push("---", "");
      break;
    }
    case "spacer": {
      break;
    }
  }
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
  templateOverrides,
}: InvoiceEmailTemplateInput) {
  const normalized = normalizeInvoiceEmailTemplate(templateOverrides);
  const data: BlockInvoiceData = {
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
  };
  const mergeValues = buildMergeValues(data);
  const visibleBlocks = normalized.blocks.filter(
    (block) => block.visible !== false,
  );
  const subject = replaceInvoiceMergeTags(normalized.subject, mergeValues);

  const textLines: string[] = [];
  for (const block of visibleBlocks) {
    appendBlockText(textLines, block, data, mergeValues);
  }
  while (textLines.length && !textLines[textLines.length - 1]?.trim()) {
    textLines.pop();
  }

  const children = visibleBlocks
    .map((block) => renderBlockHtml(block, data, mergeValues))
    .filter(Boolean)
    .join("\n");

  void escapeAttribute;

  const html = renderEmailLayout({
    label: "Invoice",
    title,
    preheader: `${invoiceNumber} from ${businessName} is due ${formatDate(dueDate)}.`,
    footerContext: businessName,
    children,
  });

  return {
    subject,
    text: textLines.join("\n"),
    html,
  };
}
