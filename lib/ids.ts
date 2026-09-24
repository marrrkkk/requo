import { v7 as uuidv7 } from "uuid";

/**
 * Canonical ID for newly created Requo-owned entity rows (ADR-014).
 *
 * UUIDv7 (RFC 9562): time-ordered, opaque, no entity prefix. Existing rows
 * keep their historical IDs — never migrate, never parse, and never use
 * this for human document numbers (quote/invoice/payment numbers).
 */
export function newEntityId(): string {
  return uuidv7();
}

/**
 * Prefixed ID helper.
 *
 * Remaining uses are non-entity correlation keys (ephemeral tokens, storage
 * names, staged draft ids). Entity rows must use {@link newEntityId}.
 *
 * Single home for the `${prefix}_${randomHex}` pattern duplicated across
 * mutations, jobs, telemetry, and route handlers. Output matches the
 * previous locals exactly: UUID without dashes, optionally truncated.
 */
export function prefixedId(prefix: string, len = 32): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, len)}`;
}
