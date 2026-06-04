/**
 * Migration coverage derivation for the instant-navigation rollout.
 *
 * A route is considered "migrated" if and only if:
 * 1. Instant validation is enabled (unstable_instant present without disable flag), AND
 * 2. Every cache tag from every cached query has at least one entry in `tagRevalidatedBy`.
 *
 * A route with any cached-query tag that has no revalidator is never reported as migrated.
 *
 * Requirements: 7.3, 7.4
 */

export type MigrationCoverage = {
  route: string;
  validationEnabled: boolean; // unstable_instant present without disable flag
  cachedQueries: Array<{ name: string; cacheTags: string[] }>;
  // For each cache tag, the mutation actions known to revalidate it.
  tagRevalidatedBy: Record<string, string[]>;
  migrated: boolean; // derived: validationEnabled && every cachedQuery tag has a revalidator
};

/**
 * Input to the derivation — the same shape as `MigrationCoverage` but without
 * the derived `migrated` field.
 */
export type MigrationCoverageInput = Omit<MigrationCoverage, "migrated">;

/**
 * Derives the full `MigrationCoverage` record including the `migrated` flag.
 *
 * `migrated` is true if and only if:
 * - `validationEnabled` is true, AND
 * - Every cache tag from every cached query has at least one entry in `tagRevalidatedBy`
 *   (i.e. the array at `tagRevalidatedBy[tag]` exists and has length >= 1).
 *
 * Pure function with no side effects.
 */
export function deriveMigrationCoverage(
  input: MigrationCoverageInput
): MigrationCoverage {
  const { validationEnabled, cachedQueries, tagRevalidatedBy } = input;

  const allTagsHaveRevalidator = cachedQueries.every((query) =>
    query.cacheTags.every((tag) => {
      const revalidators = tagRevalidatedBy[tag];
      return Array.isArray(revalidators) && revalidators.length >= 1;
    })
  );

  const migrated = validationEnabled && allTagsHaveRevalidator;

  return { ...input, migrated };
}
