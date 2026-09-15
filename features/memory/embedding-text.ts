/**
 * The exact text a manual memory is embedded from.
 *
 * Shared rather than inlined so the backfill job reproduces byte-identical
 * input. A memory embedded from a different string lands in a slightly
 * different region of the vector space than the one retrieval scores it
 * against, which degrades silently instead of failing.
 */
export function memoryEmbeddingText(title: string, content: string) {
  return `${title}\n${content}`;
}
