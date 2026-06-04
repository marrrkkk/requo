/**
 * Router cache stale-time bounds validation.
 *
 * The staleTimes configuration controls how long the Next.js client router cache
 * retains prefetched segments before refetching from the server.
 *
 * Bounds (from Requirements 8.1, 8.2):
 * - dynamic: [0, 60] seconds
 * - static: [60, 300] seconds
 *
 * Reference: bundled staleTimes.md and prefetching.md
 */

export type StaleTimesConfig = {
  dynamic: number; // invariant: 0 <= dynamic <= 60
  static: number; // invariant: 60 <= static <= 300
};

/**
 * Returns true if and only if `0 <= config.dynamic <= 60` and `60 <= config.static <= 300`.
 *
 * Pure function with no side effects, used for validating the router cache configuration.
 */
export function isValidStaleTimes(config: StaleTimesConfig): boolean {
  return (
    config.dynamic >= 0 &&
    config.dynamic <= 60 &&
    config.static >= 60 &&
    config.static <= 300
  );
}
