import "server-only";

import {
  publicInquiryChatExtractedFieldsSchema,
  type PublicInquiryChatExtractedFields,
} from "@/features/inquiries/public-inquiry-chat-schemas";

// ---------------------------------------------------------------------------
// Public Inquiry Chat — Extraction
//
// Parses the AI's structured extraction block from the final assistant
// message in a conversational inquiry. The AI is instructed to output a
// ```json:extraction block containing the collected fields.
// ---------------------------------------------------------------------------

const EXTRACTION_PATTERN = /```json:extraction\s*\n([\s\S]*?)```/;

/**
 * Attempt to extract structured fields from an assistant message.
 * Returns null if no extraction block is found or if it fails validation.
 */
export function extractFieldsFromMessage(
  content: string,
): PublicInquiryChatExtractedFields | null {
  const match = EXTRACTION_PATTERN.exec(content);

  if (!match?.[1]) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1].trim());
    const result = publicInquiryChatExtractedFieldsSchema.safeParse(parsed);

    if (!result.success) {
      console.warn(
        "[inquiry-chat-extractor] Extraction validation failed:",
        result.error.flatten().fieldErrors,
      );
      return null;
    }

    return result.data;
  } catch (error) {
    console.warn("[inquiry-chat-extractor] Failed to parse extraction JSON:", error);
    return null;
  }
}

/**
 * Strip the extraction block from the message content, leaving only
 * the conversational text for display to the customer.
 */
export function stripExtractionBlock(content: string): string {
  return content.replace(EXTRACTION_PATTERN, "").trim();
}
