import "server-only";

import { cacheLayer } from "@/lib/ai/cache-layer";

// ---------------------------------------------------------------------------
// Connection Pool Circuit Breaker
//
// Wraps dashboard database queries to provide graceful degradation when the
// connection pool is exhausted. Uses a three-state machine:
//
//   closed (normal) → open (failing) → half-open (probing)
//
// Scope: Dashboard read queries, business-scoped data fetches.
// Excluded: Authentication, billing webhooks, migrations.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CircuitState = "closed" | "open" | "half-open";

export type CircuitBreakerConfig = {
  failureThreshold: number;
  failureWindowMs: number;
  cooldownMs: number;
  maxQueuedWrites: number;
  staleCacheMaxAge: number;
};

type QueuedWrite<T = unknown> = {
  queryKey: string;
  queryFn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

type StateTransitionLogEntry = {
  timestamp: string;
  previousState: CircuitState;
  newState: CircuitState;
  errorCount: number;
};

export type CircuitBreakerError = {
  type: "circuit_breaker_unavailable" | "circuit_breaker_write_rejected";
  message: string;
  retryAfterMs?: number;
};

// ---------------------------------------------------------------------------
// Configuration defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  failureWindowMs: 10_000,
  cooldownMs: 10_000,
  maxQueuedWrites: 20,
  staleCacheMaxAge: 120_000,
};

// ---------------------------------------------------------------------------
// Circuit Breaker State Machine (module-level singleton)
// ---------------------------------------------------------------------------

let currentState: CircuitState = "closed";
let failureTimestamps: number[] = [];
let openedAt: number | null = null;
let writeQueue: QueuedWrite[] = [];

// Cache key prefix for circuit breaker query results
const CB_CACHE_PREFIX = "cb:query:";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function logStateTransition(
  previousState: CircuitState,
  newState: CircuitState,
  errorCount: number,
): void {
  const entry: StateTransitionLogEntry = {
    timestamp: new Date().toISOString(),
    previousState,
    newState,
    errorCount,
  };

  console.info("[circuit-breaker] State transition:", JSON.stringify(entry));
}

function isPoolExhaustionError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("pool") ||
      msg.includes("timeout") ||
      msg.includes("connection") ||
      msg.includes("too many clients") ||
      msg.includes("remaining connection slots") ||
      msg.includes("sorry, too many clients already") ||
      msg.includes("cannot acquire") ||
      msg.includes("exhausted")
    );
  }
  return false;
}

function recordFailure(now: number): void {
  failureTimestamps.push(now);

  // Clean up timestamps outside the failure window
  const windowStart = now - DEFAULT_CONFIG.failureWindowMs;
  failureTimestamps = failureTimestamps.filter((ts) => ts >= windowStart);
}

function getRecentFailureCount(now: number): number {
  const windowStart = now - DEFAULT_CONFIG.failureWindowMs;
  return failureTimestamps.filter((ts) => ts >= windowStart).length;
}

function transitionTo(newState: CircuitState, errorCount: number): void {
  if (currentState === newState) return;

  const previousState = currentState;
  currentState = newState;

  if (newState === "open") {
    openedAt = Date.now();
  }

  logStateTransition(previousState, newState, errorCount);
}

function isCooldownExpired(now: number): boolean {
  if (openedAt === null) return false;
  return now - openedAt >= DEFAULT_CONFIG.cooldownMs;
}

function createUnavailabilityError(): CircuitBreakerError {
  return {
    type: "circuit_breaker_unavailable",
    message:
      "Service temporarily unavailable. Please retry after a few seconds.",
    retryAfterMs: 5_000,
  };
}

function createWriteRejectedError(): CircuitBreakerError {
  return {
    type: "circuit_breaker_write_rejected",
    message:
      "Write queue is full. The operation could not be completed. Please retry later.",
  };
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function getCacheKey(queryKey: string): string {
  return `${CB_CACHE_PREFIX}${queryKey}`;
}

type CachedEntry<T> = {
  data: T;
  cachedAt: number;
};

async function getCachedData<T>(queryKey: string): Promise<T | null> {
  const cacheKey = getCacheKey(queryKey);
  const entry = await cacheLayer.get<CachedEntry<T>>(cacheKey);

  if (!entry) return null;

  const age = Date.now() - entry.cachedAt;
  if (age > DEFAULT_CONFIG.staleCacheMaxAge) {
    return null;
  }

  return entry.data;
}

async function setCachedData<T>(queryKey: string, data: T): Promise<void> {
  const cacheKey = getCacheKey(queryKey);
  const entry: CachedEntry<T> = {
    data,
    cachedAt: Date.now(),
  };

  // Store with a TTL slightly longer than staleCacheMaxAge to allow
  // serving stale data within the window
  const ttlSeconds = Math.ceil(DEFAULT_CONFIG.staleCacheMaxAge / 1000) + 30;
  await cacheLayer.set(cacheKey, entry, ttlSeconds);
}

// ---------------------------------------------------------------------------
// Write queue processing
// ---------------------------------------------------------------------------

async function processWriteQueue(): Promise<void> {
  const pending = [...writeQueue];
  writeQueue = [];

  for (const item of pending) {
    try {
      const result = await item.queryFn();
      item.resolve(result);
    } catch (error) {
      item.reject(
        error instanceof Error
          ? error
          : new Error("Queued write failed after retry"),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// State handlers
// ---------------------------------------------------------------------------

async function handleClosedState<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  isWrite: boolean,
): Promise<T> {
  try {
    const result = await queryFn();

    // Cache successful read results
    if (!isWrite) {
      await setCachedData(queryKey, result);
    }

    return result;
  } catch (error) {
    if (!isPoolExhaustionError(error)) {
      throw error;
    }

    const now = Date.now();
    recordFailure(now);

    const recentFailures = getRecentFailureCount(now);

    // Check if we should transition to open
    if (recentFailures >= DEFAULT_CONFIG.failureThreshold) {
      transitionTo("open", recentFailures);
    }

    // Try to return cached data for reads
    if (!isWrite) {
      const cached = await getCachedData<T>(queryKey);
      if (cached !== null) {
        return cached;
      }
    }

    // No cached data available — throw structured error
    const cbError = createUnavailabilityError();
    const wrappedError = new Error(cbError.message);
    (wrappedError as unknown as { circuitBreakerError: CircuitBreakerError }).circuitBreakerError =
      cbError;
    throw wrappedError;
  }
}

async function handleOpenState<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  isWrite: boolean,
): Promise<T> {
  const now = Date.now();

  // Check if cooldown has expired → transition to half-open
  if (isCooldownExpired(now)) {
    transitionTo("half-open", getRecentFailureCount(now));
    return handleHalfOpenState(queryKey, queryFn, isWrite);
  }

  // Serve reads from cache
  if (!isWrite) {
    const cached = await getCachedData<T>(queryKey);
    if (cached !== null) {
      return cached;
    }

    // No cache available
    const cbError = createUnavailabilityError();
    const wrappedError = new Error(cbError.message);
    (wrappedError as unknown as { circuitBreakerError: CircuitBreakerError }).circuitBreakerError =
      cbError;
    throw wrappedError;
  }

  // Queue writes up to maxQueuedWrites
  if (writeQueue.length >= DEFAULT_CONFIG.maxQueuedWrites) {
    const cbError = createWriteRejectedError();
    const wrappedError = new Error(cbError.message);
    (wrappedError as unknown as { circuitBreakerError: CircuitBreakerError }).circuitBreakerError =
      cbError;
    throw wrappedError;
  }

  // Queue the write for later execution
  return new Promise<T>((resolve, reject) => {
    writeQueue.push({
      queryKey,
      queryFn: queryFn as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
    });
  });
}

async function handleHalfOpenState<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  isWrite: boolean,
): Promise<T> {
  // Allow one probe query through
  try {
    const result = await queryFn();

    // Probe succeeded → transition to closed
    transitionTo("closed", 0);
    failureTimestamps = [];

    // Process queued writes
    if (writeQueue.length > 0) {
      // Fire and forget — don't block the probe caller
      processWriteQueue().catch((err) => {
        console.warn(
          "[circuit-breaker] Error processing write queue:",
          err instanceof Error ? err.message : err,
        );
      });
    }

    // Cache the result for reads
    if (!isWrite) {
      await setCachedData(queryKey, result);
    }

    return result;
  } catch (error) {
    if (!isPoolExhaustionError(error)) {
      // Non-pool error in half-open: still transition back to open for safety
      transitionTo("open", getRecentFailureCount(Date.now()));
      throw error;
    }

    // Probe failed → back to open, restart cooldown
    transitionTo("open", getRecentFailureCount(Date.now()));

    // Try to return cached data for reads
    if (!isWrite) {
      const cached = await getCachedData<T>(queryKey);
      if (cached !== null) {
        return cached;
      }
    }

    const cbError = createUnavailabilityError();
    const wrappedError = new Error(cbError.message);
    (wrappedError as unknown as { circuitBreakerError: CircuitBreakerError }).circuitBreakerError =
      cbError;
    throw wrappedError;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Wraps a database query with circuit breaker resilience.
 *
 * For dashboard read queries: returns cached data when the pool is exhausted.
 * For writes: queues operations during open state (up to 20).
 *
 * @param queryKey - Unique cache key for this query (e.g., "shell:business:abc123")
 * @param queryFn - The async function that executes the database query
 * @param options - Optional configuration (isWrite defaults to false)
 * @returns The query result, cached fallback, or throws a structured error
 */
export async function withCircuitBreaker<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options?: { isWrite?: boolean },
): Promise<T> {
  const isWrite = options?.isWrite ?? false;

  switch (currentState) {
    case "closed":
      return handleClosedState(queryKey, queryFn, isWrite);
    case "open":
      return handleOpenState(queryKey, queryFn, isWrite);
    case "half-open":
      return handleHalfOpenState(queryKey, queryFn, isWrite);
  }
}

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

/**
 * Returns the current circuit breaker state.
 * Useful for health checks or dashboard status indicators.
 */
export function getCircuitState(): CircuitState {
  return currentState;
}

/**
 * Returns the number of queued write operations.
 */
export function getQueuedWriteCount(): number {
  return writeQueue.length;
}

/**
 * Checks if a thrown error is a circuit breaker error.
 */
export function isCircuitBreakerError(
  error: unknown,
): error is Error & { circuitBreakerError: CircuitBreakerError } {
  return (
    error instanceof Error &&
    "circuitBreakerError" in error &&
    typeof (error as Record<string, unknown>).circuitBreakerError === "object"
  );
}

// ---------------------------------------------------------------------------
// Testing utilities (not exported from barrel)
// ---------------------------------------------------------------------------

/**
 * Resets the circuit breaker to its initial state. Used for testing only.
 * @internal
 */
export function _resetCircuitBreaker(): void {
  currentState = "closed";
  failureTimestamps = [];
  openedAt = null;
  writeQueue = [];
}

/**
 * Returns internal state for testing. Used for testing only.
 * @internal
 */
export function _getInternalState() {
  return {
    state: currentState,
    failureTimestamps: [...failureTimestamps],
    openedAt,
    writeQueueLength: writeQueue.length,
  };
}

/**
 * Manually set the circuit state for testing. Used for testing only.
 * @internal
 */
export function _setCircuitState(state: CircuitState, opened?: number): void {
  currentState = state;
  if (opened !== undefined) {
    openedAt = opened;
  }
}

/**
 * Manually add failure timestamps for testing. Used for testing only.
 * @internal
 */
export function _addFailureTimestamps(timestamps: number[]): void {
  failureTimestamps.push(...timestamps);
}
