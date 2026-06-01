import "server-only";

import { createHash } from "crypto";

import type { AiTaskType } from "@/features/ai/task-registry";
import type { AiQualityTier } from "./types";
import { cacheLayer } from "@/lib/ai/cache-layer";

// ---------------------------------------------------------------------------
// Business-scoped task types — these tasks produce identical output regardless
// of which user triggers them, so the cache key excludes userId to allow
// cross-user cache sharing within the same business.
// ---------------------------------------------------------------------------

export const BUSINESS_SCOPED_TASKS: ReadonlySet<AiTaskType> = new Set([
  "inquiry_summary",
  "form_suggestion",
  "business_memory_summary",
]);

/** Sentinel userId value used in cache keys for business-scoped tasks. */
const BUSINESS_SCOPE_USER_SENTINEL = "__business__" as const;

// ---------------------------------------------------------------------------
// AI Cache — deterministic composite-key caching with TTL enforcement
//
// Uses the distributed Cache Layer (Redis with in-memory fallback) for
// persistence across serverless cold starts. TTLs are caller-specified.
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
// Cache key prefixes
// ---------------------------------------------------------------------------

const AI_CACHE_PREFIX = "ai:";
const AI_BIZ_CACHE_PREFIX = "ai:biz:";

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic cache key from the given components.
 *
 * The algorithm:
 * 1. For business-scoped tasks, replace userId with a constant sentinel so
 *    different users of the same business share the cache entry.
 * 2. Replace null values in sourceDataVersions with the stable null sentinel.
 * 3. Sort all top-level keys and nested object keys for determinism.
 * 4. JSON-serialize the sorted structure.
 * 5. Compute SHA-256 hash → hex string.
 */
export function generateCacheKey(components: CacheKeyComponents): string {
  // Determine if this is a business-scoped (non-personalized) task
  const isBusinessScoped = BUSINESS_SCOPED_TASKS.has(components.taskType);

  // For business-scoped tasks, replace userId with sentinel to share across users
  const effectiveUserId = isBusinessScoped
    ? BUSINESS_SCOPE_USER_SENTINEL
    : components.userId;

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
    userId: effectiveUserId,
  };

  const serialized = JSON.stringify(sortedComponents);

  return createHash("sha256").update(serialized).digest("hex");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the appropriate cache key prefix based on task type scope. */
function getCachePrefix(taskType: AiTaskType): string {
  return BUSINESS_SCOPED_TASKS.has(taskType)
    ? AI_BIZ_CACHE_PREFIX
    : AI_CACHE_PREFIX;
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
    const prefix = getCachePrefix(key.taskType);
    const cacheKey = `${prefix}${generateCacheKey(key)}`;
    return await cacheLayer.get<CachedAiOutput>(cacheKey);
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
    const prefix = getCachePrefix(key.taskType);
    const cacheKey = `${prefix}${generateCacheKey(key)}`;
    await cacheLayer.set<CachedAiOutput>(cacheKey, output, ttl);
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
 * Clears a specific cache entry. Used for testing only.
 * @internal
 */
export async function _clearCacheEntry(key: CacheKeyComponents): Promise<void> {
  const prefix = getCachePrefix(key.taskType);
  const cacheKey = `${prefix}${generateCacheKey(key)}`;
  await cacheLayer.delete(cacheKey);
}
