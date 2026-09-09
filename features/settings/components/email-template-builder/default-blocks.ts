"use client";

import {
  createEmailBlockId,
  defaultEmailBlocks,
  defaultQuoteEmailTemplate,
  getDefaultContentForBlockType,
  type EmailTemplateBlock,
} from "@/features/settings/email-templates";

export { defaultEmailBlocks, defaultQuoteEmailTemplate };

export function createTextBlock(): EmailTemplateBlock {
  return {
    id: createEmailBlockId("txt"),
    type: "text",
    content: "",
    visible: true,
  };
}

export function createDividerBlock(): EmailTemplateBlock {
  return {
    id: createEmailBlockId("div"),
    type: "divider",
    visible: true,
    style: { spacing: "comfortable" },
  };
}

export function createSpacerBlock(): EmailTemplateBlock {
  return {
    id: createEmailBlockId("spc"),
    type: "spacer",
    visible: true,
    style: { spacing: "comfortable" },
  };
}

export function getPlaceholderForBlockType(type: EmailTemplateBlock["type"]): string {
  const fallback = getDefaultContentForBlockType(type);
  return fallback || "Write something customers will appreciate…";
}
