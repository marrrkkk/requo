/**
 * Block-based quote email template configuration (V2).
 *
 * The builder configures the email by adding, removing, hiding, editing, and
 * dragging predefined blocks. No rich text, HTML editing, or arbitrary CSS.
 * Merge tags use `{{variableName}}` syntax and are replaced at render time.
 */

// ---------------------------------------------------------------------------
// Legacy V1 config (persisted by older businesses — migrate on read)
// ---------------------------------------------------------------------------

/**
 * @deprecated V1 shape. Kept for migration only. New code uses
 * `QuoteEmailTemplateConfigV2`.
 */
export type QuoteEmailTemplateConfig = {
  subject?: string | null;
  greeting?: string | null;
  introText?: string | null;
  ctaLabel?: string | null;
  closingText?: string | null;
};

// ---------------------------------------------------------------------------
// Merge-tag variables available to business owners
// ---------------------------------------------------------------------------

export const quoteEmailMergeTags = [
  { tag: "{{businessName}}", label: "Business name" },
  { tag: "{{customerName}}", label: "Customer name" },
  { tag: "{{quoteNumber}}", label: "Quote number" },
  { tag: "{{quoteTitle}}", label: "Quote title" },
] as const;

export type QuoteEmailMergeValues = {
  businessName: string;
  customerName: string;
  quoteNumber: string;
  quoteTitle: string;
};

// ---------------------------------------------------------------------------
// Sample merge values (for live preview in the settings UI)
// ---------------------------------------------------------------------------

export const quoteEmailSampleMergeValues: QuoteEmailMergeValues = {
  businessName: "Northline Home Services",
  customerName: "Alex Rivera",
  quoteNumber: "Q-2026-0042",
  quoteTitle: "Kitchen renovation",
};

export const invoiceEmailMergeTags = [
  { tag: "{{businessName}}", label: "Business name" },
  { tag: "{{customerName}}", label: "Customer name" },
  { tag: "{{invoiceNumber}}", label: "Invoice number" },
  { tag: "{{invoiceTitle}}", label: "Invoice title" },
  { tag: "{{balanceDue}}", label: "Balance due" },
  { tag: "{{dueDate}}", label: "Due date" },
  { tag: "{{totalAmount}}", label: "Total amount" },
] as const;

export type InvoiceEmailMergeValues = {
  businessName: string;
  customerName: string;
  invoiceNumber: string;
  invoiceTitle: string;
  balanceDue: string;
  dueDate: string;
  totalAmount: string;
};

export const invoiceEmailSampleMergeValues: InvoiceEmailMergeValues = {
  businessName: "Northline Home Services",
  customerName: "Alex Rivera",
  invoiceNumber: "INV-2026-0018",
  invoiceTitle: "Kitchen renovation — final invoice",
  balanceDue: "$1,250.00",
  dueDate: "Jun 30, 2026",
  totalAmount: "$2,500.00",
};

/** Follow-up shares the quote tag set; attempt number stays send-time logic. */
export const quoteFollowUpEmailMergeTags = quoteEmailMergeTags;
export type QuoteFollowUpEmailMergeValues = QuoteEmailMergeValues;
export const quoteFollowUpEmailSampleMergeValues: QuoteEmailMergeValues =
  quoteEmailSampleMergeValues;

export const EMAIL_TEMPLATE_KINDS: readonly EmailTemplateKind[] = [
  "quote",
  "invoice",
  "follow-up",
] as const;

export const EMAIL_TEMPLATE_KIND_LABELS: Record<EmailTemplateKind, string> = {
  quote: "Quote email",
  invoice: "Invoice email",
  "follow-up": "Quote follow-up",
};

export const EMAIL_TEMPLATE_KIND_DESCRIPTIONS: Record<EmailTemplateKind, string> = {
  quote: "Sent with every quote delivered by Requo email.",
  invoice: "Sent with every invoice delivered by Requo email.",
  "follow-up": "Shared automatic nudge for sent quotes awaiting a response.",
};

// ---------------------------------------------------------------------------
// V2 block model
// ---------------------------------------------------------------------------

export type EmailTemplateKind = "quote" | "invoice" | "follow-up";

export type EmailBlockType =
  | "greeting"
  | "intro"
  | "text"
  | "cta"
  | "summary"
  | "line-items"
  | "totals"
  | "notes"
  | "payment-terms"
  | "signature"
  | "closing"
  | "divider"
  | "spacer";

export const emailBlockTypes: readonly EmailBlockType[] = [
  "greeting",
  "intro",
  "text",
  "cta",
  "summary",
  "line-items",
  "totals",
  "notes",
  "payment-terms",
  "signature",
  "closing",
  "divider",
  "spacer",
] as const;

/** Blocks that exist at most once per template. Cannot be added or deleted. */
export const singletonEmailBlockTypes: readonly EmailBlockType[] = [
  "greeting",
  "intro",
  "summary",
  "line-items",
  "totals",
  "notes",
  "payment-terms",
  "signature",
  "closing",
  "cta",
] as const;

/** Blocks the palette may add. Repeatable and deletable. */
export const repeatableEmailBlockTypes: readonly EmailBlockType[] = [
  "text",
  "divider",
  "spacer",
] as const;

export type BlockAlign = "left" | "center" | "right";
export type BlockFontSize = "sm" | "md" | "lg";
export type BlockTextColor = "default" | "muted";
export type BlockSpacing = "compact" | "comfortable" | "spacious";

export type BlockStyle = {
  align?: BlockAlign;
  fontSize?: BlockFontSize;
  textColor?: BlockTextColor | string;
  buttonColor?: string;
  buttonTextColor?: string;
  spacing?: BlockSpacing;
};

export type EmailTemplateBlock = {
  id: string;
  type: EmailBlockType;
  content?: string;
  visible?: boolean;
  style?: BlockStyle;
};

export type QuoteEmailTemplateConfigV2 = {
  version: 2;
  subject: string;
  blocks: EmailTemplateBlock[];
};

export type InvoiceEmailTemplateConfigV2 = {
  version: 2;
  subject: string;
  blocks: EmailTemplateBlock[];
};

export type QuoteFollowUpTemplateConfigV2 = {
  version: 2;
  subject: string;
  blocks: EmailTemplateBlock[];
};

/** Raw persisted shape: null (never customized), legacy V1, or V2. */
export type QuoteEmailTemplateStored =
  | QuoteEmailTemplateConfig
  | QuoteEmailTemplateConfigV2
  | null
  | undefined;

export type InvoiceEmailTemplateStored =
  | InvoiceEmailTemplateConfigV2
  | null
  | undefined;

export type QuoteFollowUpTemplateStored =
  | QuoteFollowUpTemplateConfigV2
  | null
  | undefined;

export const MAX_EMAIL_TEMPLATE_BLOCKS = 20;

export const MAX_EMAIL_SUBJECT_LENGTH = 200;
export const MAX_EMAIL_GREETING_LENGTH = 200;
export const MAX_EMAIL_INTRO_LENGTH = 400;
export const MAX_EMAIL_TEXT_LENGTH = 400;
export const MAX_EMAIL_CLOSING_LENGTH = 400;
export const MAX_EMAIL_CTA_LABEL_LENGTH = 60;

export const DEFAULT_EMAIL_SUBJECT = "{{quoteNumber}} from {{businessName}}";
export const DEFAULT_INVOICE_EMAIL_SUBJECT =
  "Invoice {{invoiceNumber}} from {{businessName}} — due {{dueDate}}";
export const DEFAULT_FOLLOW_UP_EMAIL_SUBJECT =
  "Following up: {{quoteNumber}} from {{businessName}}";

const DEFAULT_BLOCK_CONTENT: Record<EmailBlockType, string> = {
  greeting: "Hi {{customerName}},",
  intro: "{{businessName}} prepared a quote for you.",
  text: "",
  cta: "Review quote online",
  summary: "",
  "line-items": "",
  totals: "",
  notes: "",
  "payment-terms": "",
  signature: "",
  closing: "Reply to this email if you have any questions.",
  divider: "",
  spacer: "",
};

const DEFAULT_INVOICE_BLOCK_CONTENT: Record<EmailBlockType, string> = {
  greeting: "Hi {{customerName}},",
  intro: "{{businessName}} sent you invoice {{invoiceNumber}} for {{totalAmount}}, due {{dueDate}}.",
  text: "",
  cta: "Reply about this invoice",
  summary: "",
  "line-items": "",
  totals: "",
  notes: "",
  "payment-terms": "",
  signature: "",
  closing: "Reply to this email if anything looks off — we're happy to help.",
  divider: "",
  spacer: "",
};

const DEFAULT_FOLLOW_UP_BLOCK_CONTENT: Record<EmailBlockType, string> = {
  greeting: "Hi {{customerName}},",
  intro: 'Just following up on the quote we sent for "{{quoteTitle}}". We wanted to make sure it reached you and see if you have any questions.',
  text: "",
  cta: "View quote",
  summary: "",
  "line-items": "",
  totals: "",
  notes: "",
  "payment-terms": "",
  signature: "",
  closing: "Best regards,\n{{businessName}}",
  divider: "",
  spacer: "",
};

export function getDefaultContentForBlockType(
  type: EmailBlockType,
  kind: EmailTemplateKind = "quote",
): string {
  if (kind === "invoice") return DEFAULT_INVOICE_BLOCK_CONTENT[type] ?? "";
  if (kind === "follow-up") return DEFAULT_FOLLOW_UP_BLOCK_CONTENT[type] ?? "";
  return DEFAULT_BLOCK_CONTENT[type] ?? "";
}

export const DEFAULT_EMAIL_BLOCK_ORDER: readonly EmailBlockType[] = [
  "greeting",
  "intro",
  "summary",
  "line-items",
  "totals",
  "cta",
  "notes",
  "signature",
  "closing",
] as const;

export const DEFAULT_INVOICE_BLOCK_ORDER: readonly EmailBlockType[] = [
  "greeting",
  "intro",
  "summary",
  "line-items",
  "totals",
  "payment-terms",
  "notes",
  "signature",
  "closing",
] as const;

export const DEFAULT_FOLLOW_UP_BLOCK_ORDER: readonly EmailBlockType[] = [
  "greeting",
  "intro",
  "cta",
  "signature",
  "closing",
] as const;

export function createEmailBlockId(prefix = "blk"): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${random}`;
}

export function isSingletonEmailBlockType(
  type: EmailBlockType,
): boolean {
  return (singletonEmailBlockTypes as readonly string[]).includes(type);
}

export function isRepeatableEmailBlockType(
  type: EmailBlockType,
): boolean {
  return (repeatableEmailBlockTypes as readonly string[]).includes(type);
}

function makeSingletonBlock(
  type: EmailBlockType,
  kind: EmailTemplateKind = "quote",
): EmailTemplateBlock {
  return {
    id: type,
    type,
    content: getDefaultContentForBlockType(type, kind) || undefined,
    visible: true,
  };
}

/**
 * Fresh default blocks for a new template. Singleton ids are stable
 * (id === type) so reorder operations keep identity.
 */
export function defaultEmailBlocks(
  kind: EmailTemplateKind = "quote",
): EmailTemplateBlock[] {
  const order =
    kind === "invoice"
      ? DEFAULT_INVOICE_BLOCK_ORDER
      : kind === "follow-up"
        ? DEFAULT_FOLLOW_UP_BLOCK_ORDER
        : DEFAULT_EMAIL_BLOCK_ORDER;
  return order.map((type) => makeSingletonBlock(type, kind));
}

export function defaultQuoteEmailTemplate(): QuoteEmailTemplateConfigV2 {
  return {
    version: 2,
    subject: DEFAULT_EMAIL_SUBJECT,
    blocks: defaultEmailBlocks("quote"),
  };
}

export function defaultInvoiceEmailTemplate(): InvoiceEmailTemplateConfigV2 {
  return {
    version: 2,
    subject: DEFAULT_INVOICE_EMAIL_SUBJECT,
    blocks: defaultEmailBlocks("invoice"),
  };
}

export function defaultQuoteFollowUpTemplate(): QuoteFollowUpTemplateConfigV2 {
  return {
    version: 2,
    subject: DEFAULT_FOLLOW_UP_EMAIL_SUBJECT,
    blocks: defaultEmailBlocks("follow-up"),
  };
}

export function getDefaultTemplateForKind(kind: EmailTemplateKind) {
  if (kind === "invoice") return defaultInvoiceEmailTemplate();
  if (kind === "follow-up") return defaultQuoteFollowUpTemplate();
  return defaultQuoteEmailTemplate();
}

export function getMergeTagsForKind(kind: EmailTemplateKind) {
  if (kind === "invoice") return invoiceEmailMergeTags;
  return quoteEmailMergeTags;
}

export function getSampleMergeValuesForKind(kind: EmailTemplateKind) {
  if (kind === "invoice") return invoiceEmailSampleMergeValues;
  return quoteEmailSampleMergeValues;
}

// ---------------------------------------------------------------------------
// Merge-tag replacement (shared by preview + production renderer)
// ---------------------------------------------------------------------------

export function replaceMergeTags(
  template: string,
  values: QuoteEmailMergeValues,
): string {
  return template
    .replace(/\{\{businessName\}\}/g, values.businessName)
    .replace(/\{\{customerName\}\}/g, values.customerName)
    .replace(/\{\{quoteNumber\}\}/g, values.quoteNumber)
    .replace(/\{\{quoteTitle\}\}/g, values.quoteTitle);
}

export function replaceInvoiceMergeTags(
  template: string,
  values: InvoiceEmailMergeValues,
): string {
  return template
    .replace(/\{\{businessName\}\}/g, values.businessName)
    .replace(/\{\{customerName\}\}/g, values.customerName)
    .replace(/\{\{invoiceNumber\}\}/g, values.invoiceNumber)
    .replace(/\{\{invoiceTitle\}\}/g, values.invoiceTitle)
    .replace(/\{\{balanceDue\}\}/g, values.balanceDue)
    .replace(/\{\{dueDate\}\}/g, values.dueDate)
    .replace(/\{\{totalAmount\}\}/g, values.totalAmount);
}

// ---------------------------------------------------------------------------
// Legacy migration + normalization (single canonical entry point)
// ---------------------------------------------------------------------------

function isV2Config(value: unknown): value is QuoteEmailTemplateConfigV2 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === 2 && Array.isArray(candidate.blocks);
}

function sanitizeStyle(style: unknown): BlockStyle | undefined {
  if (!style || typeof style !== "object") return undefined;
  const input = style as Record<string, unknown>;
  const output: BlockStyle = {};
  if (input.align === "left" || input.align === "center" || input.align === "right") {
    output.align = input.align;
  }
  if (input.fontSize === "sm" || input.fontSize === "md" || input.fontSize === "lg") {
    output.fontSize = input.fontSize;
  }
  if (typeof input.textColor === "string" && input.textColor.length <= 32) {
    const color = input.textColor.trim();
    if (
      color === "default" ||
      color === "muted" ||
      /^#[0-9a-fA-F]{6}$/.test(color)
    ) {
      output.textColor = color as BlockStyle["textColor"];
    }
  }
  if (typeof input.buttonColor === "string" && /^#[0-9a-fA-F]{6}$/.test(input.buttonColor.trim())) {
    output.buttonColor = input.buttonColor.trim();
  }
  if (
    typeof input.buttonTextColor === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(input.buttonTextColor.trim())
  ) {
    output.buttonTextColor = input.buttonTextColor.trim();
  }
  if (
    input.spacing === "compact" ||
    input.spacing === "comfortable" ||
    input.spacing === "spacious"
  ) {
    output.spacing = input.spacing;
  }
  return Object.keys(output).length ? output : undefined;
}

function sanitizeBlock(block: unknown, fallbackId: string): EmailTemplateBlock | null {
  if (!block || typeof block !== "object") return null;
  const input = block as Record<string, unknown>;
  const type = input.type;
  if (typeof type !== "string" || !(emailBlockTypes as readonly string[]).includes(type)) {
    return null;
  }
  const blockType = type as EmailBlockType;
  const rawId = typeof input.id === "string" && input.id.trim() ? input.id.trim() : fallbackId;
  const id = rawId.slice(0, 64);
  const visible = input.visible === false ? false : true;
  const sanitized: EmailTemplateBlock = { id, type: blockType, visible };
  if (typeof input.content === "string") {
    sanitized.content = input.content.slice(0, 2000);
  }
  const style = sanitizeStyle(input.style);
  if (style) sanitized.style = style;
  return sanitized;
}

/**
 * Convert a legacy V1 config into V2 blocks, preserving exact custom content.
 * Quote-data blocks use the new default structure.
 */
export function migrateLegacyConfigToBlocks(
  legacy: QuoteEmailTemplateConfig | null | undefined,
): QuoteEmailTemplateConfigV2 {
  const pick = (value: string | null | undefined, fallback: string) => {
    const trimmed = value?.trim();
    return trimmed ? value!.trim() : fallback;
  };
  const subject = pick(legacy?.subject, DEFAULT_EMAIL_SUBJECT);
  const blocks: EmailTemplateBlock[] = [
    { id: "greeting", type: "greeting", content: pick(legacy?.greeting, DEFAULT_BLOCK_CONTENT.greeting), visible: true },
    { id: "intro", type: "intro", content: pick(legacy?.introText, DEFAULT_BLOCK_CONTENT.intro), visible: true },
    { id: "summary", type: "summary", visible: true },
    { id: "line-items", type: "line-items", visible: true },
    { id: "totals", type: "totals", visible: true },
    { id: "cta", type: "cta", content: pick(legacy?.ctaLabel, DEFAULT_BLOCK_CONTENT.cta), visible: true },
    { id: "notes", type: "notes", visible: true },
    { id: "signature", type: "signature", visible: true },
    { id: "closing", type: "closing", content: pick(legacy?.closingText, DEFAULT_BLOCK_CONTENT.closing), visible: true },
  ];
  return { version: 2, subject, blocks };
}

type NormalizeOptions = {
  kind: EmailTemplateKind;
  defaultSubject: string;
  defaultOrder: readonly EmailBlockType[];
  requireCta: boolean;
  allowCta: boolean;
  dropTypes?: readonly EmailBlockType[];
};

function ensureTextContentSlot(
  sanitized: EmailTemplateBlock,
  kind: EmailTemplateKind,
) {
  if (
    (sanitized.type === "greeting" ||
      sanitized.type === "intro" ||
      sanitized.type === "text" ||
      sanitized.type === "cta" ||
      sanitized.type === "closing") &&
    typeof sanitized.content !== "string"
  ) {
    sanitized.content = getDefaultContentForBlockType(sanitized.type, kind);
  }
}

function normalizeGenericTemplate(
  stored: unknown,
  options: NormalizeOptions,
): { version: 2; subject: string; blocks: EmailTemplateBlock[] } {
  const { kind, defaultSubject, defaultOrder, requireCta, allowCta, dropTypes } =
    options;
  if (!stored || typeof stored !== "object") {
    return {
      version: 2,
      subject: defaultSubject,
      blocks: defaultEmailBlocks(kind),
    };
  }
  const candidate = stored as { subject?: unknown; blocks?: unknown };
  const rawSubject =
    typeof candidate.subject === "string" ? candidate.subject.trim() : "";
  const subject = rawSubject || defaultSubject;
  const rawBlocks = Array.isArray(candidate.blocks) ? candidate.blocks : [];

  const seenSingletons = new Set<string>();
  const cleaned: EmailTemplateBlock[] = [];
  rawBlocks.forEach((block, index) => {
    const sanitized = sanitizeBlock(block, `blk_${index}`);
    if (!sanitized) return;
    if (dropTypes?.includes(sanitized.type)) return;
    if (!allowCta && sanitized.type === "cta") {
      sanitized.type = "text";
      sanitized.content =
        typeof sanitized.content === "string" ? sanitized.content : "";
      sanitized.id = `${sanitized.id}_text`;
    }
    if (isSingletonEmailBlockType(sanitized.type)) {
      if (seenSingletons.has(sanitized.type)) return;
      seenSingletons.add(sanitized.type);
    }
    ensureTextContentSlot(sanitized, kind);
    cleaned.push(sanitized);
  });

  for (const type of defaultOrder) {
    if (type === "cta" && !allowCta) continue;
    if (!seenSingletons.has(type)) {
      // CTA is backfilled below when required; skip here to place it well.
      if (type === "cta" && requireCta) continue;
      cleaned.push(makeSingletonBlock(type, kind));
      seenSingletons.add(type);
    }
  }

  const ctaBlocks = cleaned.filter((block) => block.type === "cta");
  if (requireCta) {
    if (!ctaBlocks.length) {
      const anchorIndex = cleaned.findIndex((block) =>
        kind === "follow-up"
          ? block.type === "intro"
          : block.type === "totals",
      );
      const cta = makeSingletonBlock("cta", kind);
      if (anchorIndex >= 0) {
        cleaned.splice(anchorIndex + 1, 0, cta);
      } else {
        cleaned.push(cta);
      }
    } else {
      let first = true;
      for (const cta of ctaBlocks) {
        if (first) {
          cta.visible = true;
          if (!cta.content?.trim()) {
            cta.content = getDefaultContentForBlockType("cta", kind);
          }
          first = false;
        } else {
          cta.type = "text";
          cta.content = typeof cta.content === "string" ? cta.content : "";
          cta.id = `${cta.id}_text`;
        }
      }
    }
  } else if (allowCta) {
    // Optional CTA: keep at most one, force visible + label when present.
    let first = true;
    for (const cta of ctaBlocks) {
      if (first) {
        cta.visible = true;
        if (!cta.content?.trim()) {
          cta.content = getDefaultContentForBlockType("cta", kind);
        }
        first = false;
      } else {
        cta.type = "text";
        cta.content = typeof cta.content === "string" ? cta.content : "";
        cta.id = `${cta.id}_text`;
      }
    }
  }

  return { version: 2, subject, blocks: cleaned.slice(0, MAX_EMAIL_TEMPLATE_BLOCKS) };
}

/**
 * Canonical normalization: null → defaults, V1 → migrated, V2 → repaired.
 * Repairs: drops unknown types, dedupes singletons (first wins), ensures
 * exactly one visible CTA, clamps to MAX_EMAIL_TEMPLATE_BLOCKS.
 */
export function normalizeQuoteEmailTemplate(
  stored: QuoteEmailTemplateStored,
): QuoteEmailTemplateConfigV2 {
  if (!stored) {
    return defaultQuoteEmailTemplate();
  }
  if (!isV2Config(stored)) {
    return migrateLegacyConfigToBlocks(stored as QuoteEmailTemplateConfig);
  }
  return normalizeGenericTemplate(stored, {
    kind: "quote",
    defaultSubject: DEFAULT_EMAIL_SUBJECT,
    defaultOrder: DEFAULT_EMAIL_BLOCK_ORDER,
    requireCta: true,
    allowCta: true,
    dropTypes: ["payment-terms"],
  });
}

export function normalizeInvoiceEmailTemplate(
  stored: InvoiceEmailTemplateStored,
): InvoiceEmailTemplateConfigV2 {
  return normalizeGenericTemplate(stored ?? null, {
    kind: "invoice",
    defaultSubject: DEFAULT_INVOICE_EMAIL_SUBJECT,
    defaultOrder: DEFAULT_INVOICE_BLOCK_ORDER,
    requireCta: false,
    allowCta: true,
    dropTypes: [],
  });
}

export function normalizeQuoteFollowUpTemplate(
  stored: QuoteFollowUpTemplateStored,
): QuoteFollowUpTemplateConfigV2 {
  return normalizeGenericTemplate(stored ?? null, {
    kind: "follow-up",
    defaultSubject: DEFAULT_FOLLOW_UP_EMAIL_SUBJECT,
    defaultOrder: DEFAULT_FOLLOW_UP_BLOCK_ORDER,
    requireCta: true,
    allowCta: true,
    dropTypes: ["summary", "line-items", "totals", "notes", "payment-terms"],
  });
}

export function normalizeEmailTemplateForKind(
  kind: EmailTemplateKind,
  stored: unknown,
) {
  if (kind === "invoice")
    return normalizeInvoiceEmailTemplate(
      stored as InvoiceEmailTemplateStored,
    );
  if (kind === "follow-up")
    return normalizeQuoteFollowUpTemplate(
      stored as QuoteFollowUpTemplateStored,
    );
  return normalizeQuoteEmailTemplate(stored as QuoteEmailTemplateStored);
}

export function getVisibleEmailBlocks(
  blocks: EmailTemplateBlock[],
): EmailTemplateBlock[] {
  return blocks.filter((block) => block.visible !== false);
}

export function countHiddenEmailBlocks(blocks: EmailTemplateBlock[]): number {
  return blocks.filter((block) => block.visible === false).length;
}
