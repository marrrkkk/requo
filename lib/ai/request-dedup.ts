import "server-only";

import { cacheLayer } from "./cache-layer";

// ---------------------------------------------------------------------------
// Request Deduplication
//
// Prevents duplicate AI responses from concurrent identical requests (e.g.,
// double-clicks or network retries). Uses a SHA-256 hash of the conversation
// ID and message content as a dedup key stored in the Cache Layer with a
// 10-second TTL.
//
// Behavior:
// - checkDuplicate returns `true` if the request is a duplicate (caller
//   should return 409 Conflict).
// - On first occurrence, the key is set with a 10s TTL so the same request
//   within that window is rejected.
// - If the Cache Layer is unavailable, the check is skipped (fail-open).
// ---------------------------------------------------------------------------

const DEDUP_TTL_SECONDS = 10;
const DEDUP_KEY_PREFIX = "dedup:";

/**
 * Generates a deterministic SHA-256 hash of the conversation ID and message
 * content to use as a deduplication key.
 */
async function generateDedupKey(
  conversationId: string,
  messageContent: string,
): Promise<string> {
  const input = `${conversationId}:${messageContent}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${DEDUP_KEY_PREFIX}${hashHex}`;
}

/**
 * Checks whether a request is a duplicate within the 10-second dedup window.
 *
 * @param conversationId - The conversation this message belongs to
 * @param messageContent - The raw message content from the user
 * @returns `true` if the request is a duplicate (caller should return 409),
 *          `false` if this is a new request (key is set with 10s TTL)
 */
export async function checkDuplicate(
  conversationId: string,
  messageContent: string,
): Promise<boolean> {
  try {
    const key = await generateDedupKey(conversationId, messageContent);

    // Check if key already exists
    const existing = await cacheLayer.get<boolean>(key);

    if (existing) {
      // Duplicate request within the 10-second window
      return true;
    }

    // First occurrence — set the key with 10s TTL
    await cacheLayer.set(key, true, DEDUP_TTL_SECONDS);
    return false;
  } catch (error) {
    // Fail-open: if anything goes wrong, allow the request through
    console.warn(
      "[request-dedup] Dedup check failed, allowing request through:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
