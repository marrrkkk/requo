import {
  getDefaultContentForBlockType,
  normalizeQuoteFollowUpTemplate,
  replaceMergeTags,
  type EmailTemplateBlock,
  type QuoteEmailMergeValues,
  type QuoteFollowUpTemplateStored,
} from "@/features/settings/email-templates";
import {
  emailBrand,
  escapeAttribute,
  escapeHtml,
  renderEmailLayout,
  renderTextUrl,
} from "./shared";

type QuoteFollowUpEmailInput = {
  businessName: string;
  customerName: string;
  quoteNumber: string;
  title: string;
  publicQuoteUrl: string;
  attemptNumber: number;
  emailSignature?: string | null;
  templateOverrides?: QuoteFollowUpTemplateStored;
};

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

type BlockFollowUpData = {
  businessName: string;
  customerName: string;
  quoteNumber: string;
  title: string;
  publicQuoteUrl: string;
  attemptNumber: number;
  emailSignature?: string | null;
};

function renderBlockHtml(
  block: EmailTemplateBlock,
  data: BlockFollowUpData,
  mergeValues: QuoteEmailMergeValues,
): string {
  switch (block.type) {
    case "greeting":
    case "intro":
    case "text":
    case "closing": {
      const fallback = getDefaultContentForBlockType(block.type, "follow-up");
      const raw = block.content?.trim() ? block.content : fallback;
      return renderTextBlockHtml(block, replaceMergeTags(raw, mergeValues));
    }
    case "cta": {
      const raw = block.content?.trim()
        ? block.content
        : getDefaultContentForBlockType("cta", "follow-up");
      return renderCtaBlockHtml(
        block,
        replaceMergeTags(raw, mergeValues),
        data.publicQuoteUrl,
      );
    }
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
  data: BlockFollowUpData,
  mergeValues: QuoteEmailMergeValues,
) {
  switch (block.type) {
    case "greeting":
    case "intro":
    case "text":
    case "closing": {
      const fallback = getDefaultContentForBlockType(block.type, "follow-up");
      const raw = block.content?.trim() ? block.content : fallback;
      lines.push(replaceMergeTags(raw, mergeValues), "");
      break;
    }
    case "cta": {
      const raw = block.content?.trim()
        ? block.content
        : getDefaultContentForBlockType("cta", "follow-up");
      lines.push(
        `${replaceMergeTags(raw, mergeValues)}: ${data.publicQuoteUrl}`,
        "",
      );
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

function defaultSubjectForAttempt(
  attemptNumber: number,
  businessName: string,
  quoteNumber: string,
): string {
  return attemptNumber === 1
    ? `Following up: ${quoteNumber} from ${businessName}`
    : `Checking in: ${quoteNumber} from ${businessName}`;
}

export function renderQuoteFollowUpEmail({
  businessName,
  customerName,
  quoteNumber,
  title,
  publicQuoteUrl,
  attemptNumber,
  emailSignature,
  templateOverrides,
}: QuoteFollowUpEmailInput) {
  const normalized = normalizeQuoteFollowUpTemplate(templateOverrides);
  const mergeValues: QuoteEmailMergeValues = {
    businessName,
    customerName,
    quoteNumber,
    quoteTitle: title,
  };
  const data: BlockFollowUpData = {
    businessName,
    customerName,
    quoteNumber,
    title,
    publicQuoteUrl,
    attemptNumber,
    emailSignature,
  };

  const visibleBlocks = normalized.blocks.filter(
    (block) => block.visible !== false,
  );
  const customSubject = normalized.subject.trim();
  const isDefaultSubject =
    customSubject === "Following up: {{quoteNumber}} from {{businessName}}";
  const subject = isDefaultSubject
    ? defaultSubjectForAttempt(attemptNumber, businessName, quoteNumber)
    : replaceMergeTags(normalized.subject, mergeValues);

  const textLines: string[] = [];
  for (const block of visibleBlocks) {
    appendBlockText(textLines, block, data, mergeValues);
  }
  // Ensure the closing always carries the business sign-off when the custom
  // template omits it (keeps attempt 1/2+ parity with the legacy template).
  if (!textLines.join("\n").includes(businessName)) {
    textLines.push("Best regards,", businessName);
  }
  while (textLines.length && !textLines[textLines.length - 1]?.trim()) {
    textLines.pop();
  }

  const children = visibleBlocks
    .map((block) => renderBlockHtml(block, data, mergeValues))
    .filter(Boolean)
    .join("\n");

  const ctaVisible = visibleBlocks.some((block) => block.type === "cta");

  const html = renderEmailLayout({
    label: "Follow-up",
    title: `Following up on ${quoteNumber}`,
    preheader: `${businessName} is following up on your quote.`,
    footerContext: businessName,
    children: `
      ${children}
      ${ctaVisible ? renderTextUrl(publicQuoteUrl) : ""}
      <p style="margin: 22px 0 0; color: ${emailBrand.foregroundColor}; font-size: 14px; line-height: 22px;">Best regards,<br />${escapeHtml(businessName)}</p>
    `,
  });

  return {
    subject,
    text: textLines.join("\n"),
    html,
  };
}
