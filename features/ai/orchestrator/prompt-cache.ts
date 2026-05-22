/**
 * Prompt Segment Cache
 *
 * In-memory LRU cache for rendered prompt modules.
 * - Map-based, max 50 entries, LRU eviction
 * - Cache key: moduleId + contentHash + JSON.stringify(sortedParams)
 * - Invalidates on content hash mismatch
 * - No persistence across process restarts
 * - Bypasses cache on hash computation error
 */

const MAX_CACHE_SIZE = 50;

type CacheEntry = {
  rendered: string;
  contentHash: string;
};

/** Internal cache store — resets on process restart */
const cache = new Map<string, CacheEntry>();

/** Tracks access order for LRU eviction (most recent at end) */
const accessOrder: string[] = [];

/**
 * Builds a composite cache key from moduleId, contentHash, and sorted params.
 * Returns null if key computation fails.
 */
function buildCacheKey(
  moduleId: string,
  contentHash: string,
  params?: Record<string, string>,
): string | null {
  try {
    const sortedParams = params
      ? JSON.stringify(
          Object.keys(params)
            .sort()
            .reduce<Record<string, string>>((acc, key) => {
              acc[key] = params[key];
              return acc;
            }, {}),
        )
      : "";
    return `${moduleId}:${contentHash}:${sortedParams}`;
  } catch {
    return null;
  }
}

/**
 * Builds a lookup key (without contentHash) to find stale entries for a module+params combo.
 * Returns null if computation fails.
 */
function buildLookupPrefix(
  moduleId: string,
  params?: Record<string, string>,
): string | null {
  try {
    const sortedParams = params
      ? JSON.stringify(
          Object.keys(params)
            .sort()
            .reduce<Record<string, string>>((acc, key) => {
              acc[key] = params[key];
              return acc;
            }, {}),
        )
      : "";
    return `${moduleId}::${sortedParams}`;
  } catch {
    return null;
  }
}

/** Secondary index: lookup prefix -> full cache key */
const prefixIndex = new Map<string, string>();

/**
 * Moves a key to the end of the access order (most recently used).
 */
function touchAccessOrder(key: string): void {
  const idx = accessOrder.indexOf(key);
  if (idx !== -1) {
    accessOrder.splice(idx, 1);
  }
  accessOrder.push(key);
}

/**
 * Removes a key from access order tracking.
 */
function removeFromAccessOrder(key: string): void {
  const idx = accessOrder.indexOf(key);
  if (idx !== -1) {
    accessOrder.splice(idx, 1);
  }
}

/**
 * Evicts the least recently used entry when cache exceeds max size.
 */
function evictIfNeeded(): void {
  while (cache.size >= MAX_CACHE_SIZE && accessOrder.length > 0) {
    const lruKey = accessOrder.shift();
    if (lruKey) {
      cache.delete(lruKey);
      // Clean up prefix index
      const prefixEntries = Array.from(prefixIndex.entries());
      for (const [prefix, fullKey] of prefixEntries) {
        if (fullKey === lruKey) {
          prefixIndex.delete(prefix);
          break;
        }
      }
    }
  }
}

/**
 * Retrieves a cached prompt segment if one exists with a matching content hash.
 *
 * Returns the cached rendered text, or null if:
 * - No entry exists for the key
 * - The stored content hash doesn't match (stale entry — invalidated)
 * - An error occurs during key computation (cache bypassed)
 */
export function getCachedSegment(
  moduleId: string,
  contentHash: string,
  params?: Record<string, string>,
): string | null {
  const key = buildCacheKey(moduleId, contentHash, params);
  if (key === null) {
    return null;
  }

  const entry = cache.get(key);
  if (entry) {
    // Direct hit with matching hash
    touchAccessOrder(key);
    return entry.rendered;
  }

  // Check if there's a stale entry for this module+params with a different hash
  const prefix = buildLookupPrefix(moduleId, params);
  if (prefix !== null) {
    const staleKey = prefixIndex.get(prefix);
    if (staleKey && staleKey !== key && cache.has(staleKey)) {
      // Invalidate stale entry
      cache.delete(staleKey);
      removeFromAccessOrder(staleKey);
      prefixIndex.delete(prefix);
    }
  }

  return null;
}

/**
 * Stores a rendered prompt segment in the cache.
 *
 * Applies LRU eviction if the cache is at capacity.
 * Bypasses silently if the cache key cannot be computed.
 */
export function setCachedSegment(
  moduleId: string,
  contentHash: string,
  rendered: string,
  params?: Record<string, string>,
): void {
  const key = buildCacheKey(moduleId, contentHash, params);
  if (key === null) {
    return;
  }

  const prefix = buildLookupPrefix(moduleId, params);

  // Invalidate any stale entry for this module+params combo
  if (prefix !== null) {
    const existingKey = prefixIndex.get(prefix);
    if (existingKey && existingKey !== key && cache.has(existingKey)) {
      cache.delete(existingKey);
      removeFromAccessOrder(existingKey);
    }
  }

  // If key already exists, update in place
  if (cache.has(key)) {
    cache.set(key, { rendered, contentHash });
    touchAccessOrder(key);
    if (prefix !== null) {
      prefixIndex.set(prefix, key);
    }
    return;
  }

  // Evict LRU if at capacity
  evictIfNeeded();

  cache.set(key, { rendered, contentHash });
  touchAccessOrder(key);
  if (prefix !== null) {
    prefixIndex.set(prefix, key);
  }
}

/**
 * Clears all cached entries. Useful for testing.
 */
export function clearCache(): void {
  cache.clear();
  accessOrder.length = 0;
  prefixIndex.clear();
}

/**
 * Returns the current cache size. Useful for testing.
 */
export function getCacheSize(): number {
  return cache.size;
}
