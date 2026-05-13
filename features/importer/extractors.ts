import "server-only";

import { importerMaxExtractedChars } from "@/features/importer/types";

/**
 * Extractors convert uploaded files into either plain text (for small, text-like
 * formats) or raw bytes (for formats we hand off directly to Gemini's file input,
 * i.e. PDFs). Keeping this layer thin avoids pulling in heavy parsing libs.
 */

export type ExtractedPayload =
  | { kind: "text"; text: string; fileName: string; truncated: boolean }
  | { kind: "pdf"; base64: string; fileName: string };

export type ExtractFileInput = {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
};

export async function extractFile({
  fileName,
  mimeType,
  bytes,
}: ExtractFileInput): Promise<ExtractedPayload> {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return {
      kind: "pdf",
      base64: bytes.toString("base64"),
      fileName,
    };
  }

  if (
    lowerMime === "text/csv" ||
    lowerMime === "application/csv" ||
    lowerName.endsWith(".csv")
  ) {
    const { text, truncated } = normalizeText(bytes.toString("utf8"));

    return { kind: "text", text, fileName, truncated };
  }

  if (
    lowerMime === "text/plain" ||
    lowerMime === "text/markdown" ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".markdown")
  ) {
    const { text, truncated } = normalizeText(bytes.toString("utf8"));

    return { kind: "text", text, fileName, truncated };
  }

  throw new Error(
    "Unsupported file type. Upload a PDF, CSV, TXT, or Markdown file.",
  );
}

/** Normalises line endings and caps the extracted text to a safe size. */
function normalizeText(input: string): { text: string; truncated: boolean } {
  const cleaned = input.replace(/\r\n?/g, "\n").trim();

  if (cleaned.length <= importerMaxExtractedChars) {
    return { text: cleaned, truncated: false };
  }

  // Keep the head + a tail so long documents don't lose their final tables.
  const headSize = Math.floor(importerMaxExtractedChars * 0.75);
  const tailSize = importerMaxExtractedChars - headSize - 40;
  const head = cleaned.slice(0, headSize).trimEnd();
  const tail = cleaned.slice(-tailSize).trimStart();

  return {
    text: `${head}\n\n[...truncated for length...]\n\n${tail}`,
    truncated: true,
  };
}
