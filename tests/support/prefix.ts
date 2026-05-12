import path from "node:path";

/**
 * Derive a deterministic, identifier-safe prefix from a test file path so
 * fixture factories can namespace every row they create by the calling
 * `Test_File`. The result matches `[a-zA-Z0-9][a-zA-Z0-9_]*` so it can be
 * embedded directly in database identifiers, public tokens, and similar
 * identifier-shaped values.
 *
 * The input is the test file's absolute or relative path (typically
 * `__filename` or `import.meta.url`'s pathname). The basename's extension is
 * stripped, non-alphanumeric characters are collapsed to a single underscore,
 * and leading or trailing underscores are trimmed. When the result would be
 * empty, the prefix falls back to `"test"`.
 *
 * @example
 *   derivePerFilePrefix("quote-mutations.test.ts") === "quote_mutations"
 *   derivePerFilePrefix("/abs/path/billing.integration.test.ts") === "billing_integration"
 *   derivePerFilePrefix("---.ts") === "test"
 */
export function derivePerFilePrefix(filename: string): string {
  const base = path.basename(filename, path.extname(filename));
  const normalized = base
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized : "test";
}
