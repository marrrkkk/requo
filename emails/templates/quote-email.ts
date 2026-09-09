import {
  getDefaultContentForBlockType,
  normalizeQuoteEmailTemplate,
  replaceMergeTags,
  type EmailTemplateBlock,
  type QuoteEmailMergeValues,
  type QuoteEmailTemplateStored,
} from "@/features/settings/email-templates";
import {
  emailBrand,
  escapeAttribute,
  escapeHtml,
  renderDetailsCard,
  renderEmailLayout,
  renderNoteCard,
  renderTextUrl,
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
  taxInCents?: number;
  taxLabel?: string | null;
  totalInCents: number;
  notes?: string | null;
  emailSignature?: string | null;
  items: QuoteEmailLineItem[];
  templateOverrides?: QuoteEmailTemplateStored;
};

type BlockQuoteData = {
  businessName: string;
  customerName: string;
  quoteNumber: string;
  title: string;
  publicQuoteUrl: string;
  currency: string;
  validUntil: string;
  subtotalInCents: number;
  discountInCents: number;
  taxInCents?: number;
  taxLabel?: string | null;
  totalInCents: number;
  notes?: string | null;
  emailSignature?: string | null;
  items: QuoteEmailLineItem[];
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

function renderCtaBlockHtml(block: EmailTemplateBlock, label: string, href: string) {
  const align = resolveAlign(block.style?.align);
  const bg = isValidHexColor(block.style?.buttonColor)
    ? block.style.buttonColor.trim()
    : emailBrand.primaryColor;
  const textColor = isValidHexColor(block.style?.buttonTextColor)
    ? block.style.buttonTextColor.trim()
    : emailBrand.primaryTextColor;
  const margin = resolveSpacingMargin(block.style?.spacing);
  const alignAttr = align === "center" ? "center" : align === "right" ? "right" : "left";
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: ${margin};">
      <tr>
        <td align="${alignAttr}">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0;">
            <tr>
              <td style="border-radius: 10px; background: ${escapeHtml(bg)};">
                <a href="${escapeAttribute(href)}" style="display: inline-block; padding: 13px 18px; border-radius: 10px; background: ${escapeHtml(bg)}; color: ${escapeHtml(textColor)}; font-size: 14px; line-height: 20px; font-weight: 700; text-decoration: none;">
                  ${escapeHtml(label)}
                </a>
              </td>
            </tr>
          </table>
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
  taxInCents,
  taxLabel,
  totalInCents,
  currency,
}: {
  subtotalInCents: number;
  discountInCents: number;
  taxInCents?: number;
  taxLabel?: string | null;
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
      </table>
    </div>
  `;
}

function renderBlockHtml(
  block: EmailTemplateBlock,
  data: BlockQuoteData,
  mergeValues: QuoteEmailMergeValues,
): string {
  switch (block.type) {
    case "greeting":
    case "intro":
    case "text":
    case "closing": {
      const fallback = getDefaultContentForBlockType(block.type);
      const raw = block.content?.trim() ? block.content : fallback;
      return renderTextBlockHtml(block, replaceMergeTags(raw, mergeValues));
    }
    case "cta": {
      const raw = block.content?.trim()
        ? block.content
        : getDefaultContentForBlockType("cta");
      return renderCtaBlockHtml(block, replaceMergeTags(raw, mergeValues), data.publicQuoteUrl);
    }
    case "summary":
      return renderDetailsCard("Quote summary", [
        { label: "Reference", value: data.quoteNumber },
        { label: "Customer", value: data.customerName },
        { label: "Valid until", value: formatDate(data.validUntil) },
        { label: "Total", value: formatMoney(data.totalInCents, data.currency) },
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
        currency: data.currency,
      });
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
  data: BlockQuoteData,
  mergeValues: QuoteEmailMergeValues,
) {
  switch (block.type) {
    case "greeting":
    case "intro":
    case "text":
    case "closing": {
      const fallback = getDefaultContentForBlockType(block.type);
      const raw = block.content?.trim() ? block.content : fallback;
      lines.push(replaceMergeTags(raw, mergeValues), "");
      break;
    }
    case "cta": {
      const raw = block.content?.trim()
        ? block.content
        : getDefaultContentForBlockType("cta");
      lines.push(`${replaceMergeTags(raw, mergeValues)}: ${data.publicQuoteUrl}`, "");
      break;
    }
    case "summary": {
      lines.push(
        `Quote number: ${data.quoteNumber}`,
        `Title: ${data.title}`,
        `Valid until: ${formatDate(data.validUntil)}`,
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
      lines.push(`Total: ${formatMoney(data.totalInCents, data.currency)}`, "");
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
  taxInCents,
  taxLabel,
  totalInCents,
  notes,
  emailSignature,
  items,
  templateOverrides,
}: QuoteEmailTemplateInput) {
  const normalized = normalizeQuoteEmailTemplate(templateOverrides);
  const mergeValues: QuoteEmailMergeValues = {
    businessName,
    customerName,
    quoteNumber,
    quoteTitle: title,
  };
  const data: BlockQuoteData = {
    businessName,
    customerName,
    quoteNumber,
    title,
    publicQuoteUrl,
    currency,
    validUntil,
    subtotalInCents,
    discountInCents,
    taxInCents,
    taxLabel,
    totalInCents,
    notes,
    emailSignature,
    items,
  };

  const visibleBlocks = normalized.blocks.filter(
    (block) => block.visible !== false,
  );

  const subject = replaceMergeTags(normalized.subject, mergeValues);

  const textLines: string[] = [];
  for (const block of visibleBlocks) {
    appendBlockText(textLines, block, data, mergeValues);
  }
  // Trim trailing empty lines but keep content.
  while (textLines.length && !textLines[textLines.length - 1]?.trim()) {
    textLines.pop();
  }

  const children = visibleBlocks
    .map((block) => renderBlockHtml(block, data, mergeValues))
    .filter(Boolean)
    .join("\n");

  const ctaVisible = visibleBlocks.some((block) => block.type === "cta");

  const html = renderEmailLayout({
    label: "Quote",
    title,
    preheader: `${quoteNumber} from ${businessName} is ready to review.`,
    footerContext: businessName,
    children: `
      ${children}
      ${ctaVisible ? renderTextUrl(publicQuoteUrl) : ""}
      <a href="${escapeAttribute(publicQuoteUrl)}" style="display: none;">View quote</a>
    `,
  });

  return {
    subject,
    text: textLines.join("\n"),
    html,
  };
}
