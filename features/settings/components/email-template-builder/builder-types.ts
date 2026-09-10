import type {
  EmailBlockType,
  EmailTemplateBlock,
} from "@/features/settings/email-templates";

export type { EmailBlockType, EmailTemplateBlock };

export type BlockMeta = {
  label: string;
  description: string;
  deletable: boolean;
  hasEditableContent: boolean;
  contentMaxLength: number;
};

export const EMAIL_BUILDER_BLOCK_META: Record<EmailBlockType, BlockMeta> = {
  greeting: {
    label: "Greeting",
    description: "Opening line, e.g. Hi {{customerName}},",
    deletable: false,
    hasEditableContent: true,
    contentMaxLength: 200,
  },
  intro: {
    label: "Intro",
    description: "Short intro before the quote details.",
    deletable: false,
    hasEditableContent: true,
    contentMaxLength: 400,
  },
  text: {
    label: "Text",
    description: "Custom paragraph with merge tags.",
    deletable: true,
    hasEditableContent: true,
    contentMaxLength: 400,
  },
  cta: {
    label: "CTA",
    description: "The quote review button.",
    deletable: false,
    hasEditableContent: true,
    contentMaxLength: 60,
  },
  summary: {
    label: "Quote summary",
    description: "Reference, customer, validity and total.",
    deletable: false,
    hasEditableContent: false,
    contentMaxLength: 0,
  },
  "line-items": {
    label: "Line items",
    description: "Table of quoted items.",
    deletable: false,
    hasEditableContent: false,
    contentMaxLength: 0,
  },
  totals: {
    label: "Totals",
    description: "Subtotal, discounts, tax and total.",
    deletable: false,
    hasEditableContent: false,
    contentMaxLength: 0,
  },
  notes: {
    label: "Notes",
    description: "Quote or invoice notes, when present.",
    deletable: false,
    hasEditableContent: false,
    contentMaxLength: 0,
  },
  "payment-terms": {
    label: "Payment terms",
    description: "Invoice payment terms, when present.",
    deletable: false,
    hasEditableContent: false,
    contentMaxLength: 0,
  },
  signature: {
    label: "Signature",
    description: "Business email signature, when set.",
    deletable: false,
    hasEditableContent: false,
    contentMaxLength: 0,
  },
  closing: {
    label: "Closing",
    description: "Closing line after the quote details.",
    deletable: false,
    hasEditableContent: true,
    contentMaxLength: 400,
  },
  divider: {
    label: "Divider",
    description: "Horizontal rule between blocks.",
    deletable: true,
    hasEditableContent: false,
    contentMaxLength: 0,
  },
  spacer: {
    label: "Spacer",
    description: "Vertical whitespace.",
    deletable: true,
    hasEditableContent: false,
    contentMaxLength: 0,
  },
};

export function isDeletableBlockType(type: EmailBlockType): boolean {
  return EMAIL_BUILDER_BLOCK_META[type]?.deletable ?? false;
}
