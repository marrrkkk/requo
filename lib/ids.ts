/**
 * Prefixed ID helper.
 *
 * Single home for the `${prefix}_${randomHex}` pattern duplicated across
 * mutations, jobs, telemetry, and route handlers. Output matches the
 * previous locals exactly: UUID without dashes, optionally truncated.
 */
export function prefixedId(prefix: string, len = 32): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, len)}`;
}
