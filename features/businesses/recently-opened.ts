/**
 * Client-side recently-opened businesses tracker.
 *
 * Stores a bounded list of recently-accessed businesses in localStorage
 * keyed by userId, so multi-user devices don't leak across accounts.
 */

const STORAGE_KEY_PREFIX = "requo-recent-businesses";
const MAX_ENTRIES = 6;

export type RecentBusiness = {
  slug: string;
  name: string;
  logoStoragePath: string | null;
  defaultCurrency: string;
  workspaceSlug: string;
  workspaceName: string;
  businessType: string;
  lastOpenedAt: number; // epoch ms
};

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

/**
 * Read the recently-opened business list from localStorage.
 * Returns an empty array if nothing is stored or localStorage is unavailable.
 */
export function getRecentBusinesses(userId: string): RecentBusiness[] {
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Light validation — filter out any malformed entries
    return parsed.filter(
      (entry: unknown): entry is RecentBusiness =>
        typeof entry === "object" &&
        entry !== null &&
        "slug" in entry &&
        "name" in entry &&
        "lastOpenedAt" in entry,
    );
  } catch {
    return [];
  }
}

/**
 * Record a business open event. Moves the business to the top of the list
 * and trims to MAX_ENTRIES.
 */
export function recordBusinessOpen(
  userId: string,
  business: Omit<RecentBusiness, "lastOpenedAt">,
): void {
  try {
    const existing = getRecentBusinesses(userId);

    // Remove any existing entry for this business
    const filtered = existing.filter((entry) => entry.slug !== business.slug);

    // Prepend the new entry
    const updated: RecentBusiness[] = [
      { ...business, lastOpenedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_ENTRIES);

    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(updated),
    );
  } catch {
    // localStorage may be unavailable or full — silently ignore
  }
}

/**
 * Format a timestamp as a relative time string (e.g., "2m ago", "3h ago").
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);

  return `${weeks}w ago`;
}
