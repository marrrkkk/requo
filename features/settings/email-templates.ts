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

// ---------------------------------------------------------------------------
// V2 block model
// ---------------------------------------------------------------------------

export type EmailBlockType =
  | "greeting"
  | "intro"
  | "text"
  | "cta"
  | "summary"
  | "line-items"
  | "totals"
  | "notes"
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

/** Raw persisted shape: null (never customized), legacy V1, or V2. */
export type QuoteEmailTemplateStored =
  | QuoteEmailTemplateConfig
  | QuoteEmailTemplateConfigV2
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

const DEFAULT_BLOCK_CONTENT: Record<EmailBlockType, string> = {
  greeting: "Hi {{customerName}},",
  intro: "{{businessName}} prepared a quote for you.",
  text: "",
  cta: "Review quote online",
  summary: "",
  "line-items": "",
  totals: "",
  notes: "",
  signature: "",
  closing: "Reply to this email if you have any questions.",
  divider: "",
  spacer: "",
};

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

export function createEmailBlockId(prefix = "blk"): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${random}`;
}

export function getDefaultContentForBlockType(type: EmailBlockType): string {
  return DEFAULT_BLOCK_CONTENT[type] ?? "";
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

function makeSingletonBlock(type: EmailBlockType): EmailTemplateBlock {
  return {
    id: type,
    type,
    content: DEFAULT_BLOCK_CONTENT[type] || undefined,
    visible: true,
  };
}

/**
 * Fresh default blocks for a new template. Singleton ids are stable
 * (id === type) so reorder operations keep identity.
 */
export function defaultEmailBlocks(): EmailTemplateBlock[] {
  return DEFAULT_EMAIL_BLOCK_ORDER.map((type) => makeSingletonBlock(type));
}

export function defaultQuoteEmailTemplate(): QuoteEmailTemplateConfigV2 {
  return {
    version: 2,
    subject: DEFAULT_EMAIL_SUBJECT,
    blocks: defaultEmailBlocks(),
  };
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

  const rawSubject = typeof stored.subject === "string" ? stored.subject.trim() : "";
  const subject = rawSubject || DEFAULT_EMAIL_SUBJECT;

  const seenSingletons = new Set<string>();
  const cleaned: EmailTemplateBlock[] = [];
  stored.blocks.forEach((block, index) => {
    const sanitized = sanitizeBlock(block, `blk_${index}`);
    if (!sanitized) return;
    if (isSingletonEmailBlockType(sanitized.type)) {
      if (seenSingletons.has(sanitized.type)) return;
      seenSingletons.add(sanitized.type);
    }
    // Ensure text-like blocks always have a string content slot.
    if (
      (sanitized.type === "greeting" ||
        sanitized.type === "intro" ||
        sanitized.type === "text" ||
        sanitized.type === "cta" ||
        sanitized.type === "closing") &&
      typeof sanitized.content !== "string"
    ) {
      sanitized.content = getDefaultContentForBlockType(sanitized.type);
    }
    cleaned.push(sanitized);
  });

  // Ensure every singleton exists (hidden blocks stay in config).
  for (const type of DEFAULT_EMAIL_BLOCK_ORDER) {
    if (!seenSingletons.has(type)) {
      cleaned.push(makeSingletonBlock(type));
      seenSingletons.add(type);
    }
  }

  // Ensure exactly one CTA and that it is visible.
  const ctaBlocks = cleaned.filter((block) => block.type === "cta");
  if (!ctaBlocks.length) {
    const totalsIndex = cleaned.findIndex((block) => block.type === "totals");
    const cta = makeSingletonBlock("cta");
    if (totalsIndex >= 0) {
      cleaned.splice(totalsIndex + 1, 0, cta);
    } else {
      cleaned.push(cta);
    }
  } else {
    let first = true;
    for (const cta of ctaBlocks) {
      if (first) {
        cta.visible = true;
        if (!cta.content?.trim()) {
          cta.content = DEFAULT_BLOCK_CONTENT.cta;
        }
        first = false;
      } else {
        // Extra CTA blocks are collapsed: keep config valid with one CTA.
        cta.type = "text";
        cta.content = typeof cta.content === "string" ? cta.content : "";
        cta.id = `${cta.id}_text`;
      }
    }
  }

  // Reorder repaired singletons deterministically only when blocks were missing;
  // otherwise preserve the stored order (user drag order wins).
  const ordered = cleaned.slice(0, MAX_EMAIL_TEMPLATE_BLOCKS);

  return { version: 2, subject, blocks: ordered };
}

export function getVisibleEmailBlocks(
  blocks: EmailTemplateBlock[],
): EmailTemplateBlock[] {
  return blocks.filter((block) => block.visible !== false);
}

export function countHiddenEmailBlocks(blocks: EmailTemplateBlock[]): number {
  return blocks.filter((block) => block.visible === false).length;
}
