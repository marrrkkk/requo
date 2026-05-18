import "server-only";

import { createHash } from "crypto";

import type { AiTaskType } from "@/features/ai/task-registry";
import type { AiQualityTier } from "./types";

// ---------------------------------------------------------------------------
// AI Cache — deterministic composite-key caching with TTL enforcement
//
// In-memory Map storage with TTL checked on read. Production can be upgraded
// to Redis without interface changes.
// ---------------------------------------------------------------------------

/** Stable sentinel value for absent optional components in cache keys. */
export const NULL_SENTINEL = "__null__" as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Components used to compute a deterministic cache key.
 * Each field contributes to the SHA-256 hash that identifies a unique AI output.
 */
export type CacheKeyComponents = {
  businessId: string;
  userId: string;
  taskType: AiTaskType;
  promptVersion: string;
  modelTier: AiQualityTier;
  sourceDataVersions: Record<string, string | null>;
};

/**
 * The cached AI output stored alongside metadata.
 */
export type CachedAiOutput = {
  text: string;
  model: string;
  provider: string;
  createdAt: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

// ---------------------------------------------------------------------------
// Internal storage
// ---------------------------------------------------------------------------

type CacheEntry = {
  output: CachedAiOutput;
  expiresAt: number; // Unix timestamp in ms
};

/** In-memory cache store. Keyed by deterministic hex hash. */
const cacheStore = new Map<string, CacheEntry>();

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic cache key from the given components.
 *
 * The algorithm:
 * 1. Replace null values in sourceDataVersions with the stable null sentinel.
 * 2. Sort all top-level keys and nested object keys for determinism.
 * 3. JSON-serialize the sorted structure.
 * 4. Compute SHA-256 hash → hex string.
 */
export function generateCacheKey(components: CacheKeyComponents): string {
  // Normalize sourceDataVersions: replace null with sentinel, sort keys
  const normalizedVersions: Record<string, string> = {};
  const sortedVersionKeys = Object.keys(components.sourceDataVersions).sort();

  for (const key of sortedVersionKeys) {
    const value = components.sourceDataVersions[key];
    normalizedVersions[key] = value ?? NULL_SENTINEL;
  }

  // Build a sorted structure for deterministic serialization
  const sortedComponents = {
    businessId: components.businessId,
    modelTier: components.modelTier,
    promptVersion: components.promptVersion,
    sourceDataVersions: normalizedVersions,
    taskType: components.taskType,
    userId: components.userId,
  };

  const serialized = JSON.stringify(sortedComponents);

  return createHash("sha256").update(serialized).digest("hex");
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/**
 * Retrieves a cached AI output for the given key components.
 *
 * Returns the cached output if found and within TTL, or null if:
 * - No entry exists for the key
 * - The entry has expired (TTL exceeded)
 * - A read failure occurs (logs warning, returns null)
 */
export async function getCachedOutput(
  key: CacheKeyComponents,
): Promise<CachedAiOutput | null> {
  try {
    const cacheKey = generateCacheKey(key);
    const entry = cacheStore.get(cacheKey);

    if (!entry) {
      return null;
    }

    // TTL enforcement on read
    if (Date.now() > entry.expiresAt) {
      cacheStore.delete(cacheKey);
      return null;
    }

    return entry.output;
  } catch (error) {
    console.warn(
      "[ai-cache] Read failure during cache lookup, proceeding without cache:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Stores an AI output in the cache with the given TTL.
 *
 * @param key - The cache key components identifying this output.
 * @param output - The AI output to cache.
 * @param ttl - Time-to-live in seconds.
 */
export async function setCachedOutput(
  key: CacheKeyComponents,
  output: CachedAiOutput,
  ttl: number,
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(key);
    const expiresAt = Date.now() + ttl * 1000;

    cacheStore.set(cacheKey, { output, expiresAt });
  } catch (error) {
    console.warn(
      "[ai-cache] Write failure during cache store, output returned without caching:",
      error instanceof Error ? error.message : error,
    );
  }
}

// ---------------------------------------------------------------------------
// Testing utilities (not exported from barrel)
// ---------------------------------------------------------------------------

/**
 * Clears all entries from the cache. Used for testing only.
 * @internal
 */
export function _clearCache(): void {
  cacheStore.clear();
}

/**
 * Returns the current size of the cache. Used for testing only.
 * @internal
 */
export function _getCacheSize(): number {
  return cacheStore.size;
}
