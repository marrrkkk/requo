/**
 * Ephemeral chat-attachment text blocks (client-safe).
 *
 * When a file rides along on a chat turn, the server parses it to text and
 * appends one delimited block per file to the persisted user message — so
 * history, compaction, and reloads all work with no schema change. This
 * module owns that block format (shared by the owner and customer surfaces)
 * plus the display collapse, so bubbles render a one-line summary instead of
 * the full extracted text.
 */

/** Per-file upload ceiling. Base64 inflates ~33% in transit, so chat uploads
 *  stay well under function payload limits; larger files belong in the
 *  knowledge base (owner) or the inquiry form (visitor). */
export const CHAT_ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;

export const CHAT_ATTACHMENT_ACCEPT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".csv",
  ".txt",
  ".md",
  ".markdown",
] as const;

export const CHAT_ATTACHMENT_ACCEPT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/csv",
  "text/plain",
  "text/markdown",
] as const;

/** `accept` attribute value for the file pickers on both chat surfaces. */
export const CHAT_ATTACHMENT_ACCEPT = [
  ...CHAT_ATTACHMENT_ACCEPT_EXTENSIONS,
  ...CHAT_ATTACHMENT_ACCEPT_MIME_TYPES,
].join(",");

export const CHAT_ATTACHMENT_HELP_TEXT =
  "PDF, DOCX, CSV, TXT, or Markdown up to 2 MB";

/**
 * Read picked files as data URLs for the JSON chat body. The server decodes
 * and parses them; oversized or unreadable files fail fast here so the turn
 * never sends.
 */
export async function readFilesAsDataAttachments(
  files: File[],
): Promise<Array<{ filename: string; mediaType: string; dataUrl: string }>> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<{ filename: string; mediaType: string; dataUrl: string }>(
          (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                filename: file.name,
                mediaType: file.type,
                dataUrl: String(reader.result ?? ""),
              });
            reader.onerror = () =>
              reject(new Error(`Couldn't read ${file.name}.`));
            reader.readAsDataURL(file);
          },
        ),
    ),
  );
}

function sanitizeBlockFileName(fileName: string): string {
  return fileName.replace(/[\r\n"]+/g, " ").trim().slice(0, 120) || "file";
}

export function formatAttachmentBlock({
  fileName,
  kind,
  charCount,
  truncated,
  text,
}: {
  fileName: string;
  kind: string;
  charCount: number;
  truncated: boolean;
  text: string;
}): string {
  const safeName = sanitizeBlockFileName(fileName);
  const head =
    `[Attached file: "${safeName}" (${kind}, ` +
    `${charCount.toLocaleString("en-US")} chars${truncated ? ", truncated" : ""})]`;
  return `${head}\n${text}\n[End of attached file: "${safeName}"]`;
}

const ATTACHMENT_BLOCK_PATTERN =
  /\[Attached file: "([^"\n]*)" \([a-z0-9]+, ([\d,]+) chars(?:, truncated)?\)\]\n[\s\S]*?\[End of attached file: "[^"\n]*"\]/g;

/**
 * Replace persisted attachment blocks with a one-line summary for bubbles.
 * Plain text in, plain text out — no markup, no component needed.
 */
export function collapseAttachmentBlocksForDisplay(content: string): string {
  return content
    .replace(
      ATTACHMENT_BLOCK_PATTERN,
      (_match, name: string, chars: string) =>
        `Attachment: ${name} (${chars} chars)`,
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
