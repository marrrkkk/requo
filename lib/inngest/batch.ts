import "server-only";

import { inngest } from "@/lib/inngest/client";
import type { AutomationDispatchEventData } from "@/lib/inngest/events";
import { inngestEvents } from "@/lib/inngest/events";

// --- Constants ---

const MAX_PAYLOAD_SIZE_BYTES = 512 * 1024; // 512KB
const MAX_RECIPIENTS_PER_EVENT = 100;
const MAX_TRIGGERS_PER_EVENT = 50;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 1000;

// --- Types ---

type EventPayload = {
  name: string;
  data: unknown;
};

type Recipient = {
  userId: string;
  payload: unknown;
};

type BatchResult = {
  batchId: string;
  delivered: number;
  failed: number;
};

// --- Debounce State ---

const debounceTimers = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; triggers: AutomationDispatchEventData[] }
>();

// --- Utility Functions ---

function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getPayloadSize(payload: unknown): number {
  return JSON.stringify(payload).length;
}

/**
 * Splits a single event payload into the minimum number of payloads each
 * within the 512KB size limit. Works by binary-searching the split point
 * in data arrays. If the data is not an array or cannot be meaningfully
 * split, throws an error.
 */
function splitOversizedPayload(event: EventPayload): EventPayload[] {
  const size = getPayloadSize(event);
  if (size <= MAX_PAYLOAD_SIZE_BYTES) {
    return [event];
  }

  const data = event.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") {
    throw new Error(
      `Event payload exceeds 512KB (${size} bytes) and cannot be split: data is not an object`,
    );
  }

  // Find the array field to split on (recipients, triggers, or any array)
  const arrayField = findSplittableArrayField(data);
  if (!arrayField) {
    throw new Error(
      `Event payload exceeds 512KB (${size} bytes) and cannot be split: no array field found to split`,
    );
  }

  const { key, items } = arrayField;
  const results: EventPayload[] = [];

  // Binary search for the max chunk size that fits within the limit
  let remaining = [...items];
  while (remaining.length > 0) {
    const chunkSize = findMaxChunkSize(event.name, data, key, remaining);
    if (chunkSize === 0) {
      throw new Error(
        `Event payload exceeds 512KB: single item in "${key}" array exceeds size limit`,
      );
    }
    const chunk = remaining.slice(0, chunkSize);
    remaining = remaining.slice(chunkSize);
    results.push({
      name: event.name,
      data: { ...data, [key]: chunk },
    });
  }

  return results;
}

function findSplittableArrayField(
  data: Record<string, unknown>,
): { key: string; items: unknown[] } | null {
  // Prioritize known fields, then fall back to first array
  const priorityKeys = ["recipients", "triggers", "items", "events"];
  for (const key of priorityKeys) {
    if (Array.isArray(data[key]) && data[key].length > 1) {
      return { key, items: data[key] };
    }
  }
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 1) {
      return { key, items: value };
    }
  }
  return null;
}

function findMaxChunkSize(
  name: string,
  data: Record<string, unknown>,
  arrayKey: string,
  items: unknown[],
): number {
  let low = 1;
  let high = items.length;
  let result = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const testPayload: EventPayload = {
      name,
      data: { ...data, [arrayKey]: items.slice(0, mid) },
    };
    if (getPayloadSize(testPayload) <= MAX_PAYLOAD_SIZE_BYTES) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Public API ---

/**
 * Dispatches an array of event payloads as a single batch send using
 * the Inngest client's `send` method.
 *
 * Auto-splits any individual payload exceeding 512KB into the minimum
 * number of events within the size limit, preserving ordering.
 *
 * On partial delivery failure, retries only failed payloads up to 3
 * attempts with exponential backoff.
 */
export async function batchSendEvents(events: EventPayload[]): Promise<void> {
  if (events.length === 0) return;

  const batchId = generateBatchId();

  // Split oversized payloads
  const splitEvents: EventPayload[] = [];
  for (const event of events) {
    const splits = splitOversizedPayload(event);
    splitEvents.push(...splits);
  }

  // Send with retry on partial failure
  await sendWithRetry(batchId, splitEvents);
}

/**
 * Combines up to `maxPerEvent` recipients into single Inngest events,
 * producing ⌈N/maxPerEvent⌉ events total.
 *
 * If any resulting event payload exceeds 512KB, it is further split
 * into smaller payloads while preserving recipient ordering.
 */
export async function sendBatchedNotification(
  eventName: string,
  recipients: Recipient[],
  maxPerEvent: number = MAX_RECIPIENTS_PER_EVENT,
): Promise<void> {
  if (recipients.length === 0) return;

  const events: EventPayload[] = [];

  for (let i = 0; i < recipients.length; i += maxPerEvent) {
    const chunk = recipients.slice(i, i + maxPerEvent);
    events.push({
      name: eventName,
      data: { recipients: chunk },
    });
  }

  await batchSendEvents(events);
}

/**
 * Combines automation triggers for the same business within a debounce
 * window into single events (max 50 per event).
 *
 * If triggers are already provided as an array, they are sent immediately
 * in batches of up to 50. If debounceMs > 0, triggers are accumulated
 * within the window and flushed when the window expires.
 */
export async function sendDebouncedAutomationDispatch(
  businessId: string,
  triggers: AutomationDispatchEventData[],
  debounceMs: number = 5000,
): Promise<void> {
  if (triggers.length === 0) return;

  const key = `automation:${businessId}`;

  // If no debounce, send immediately
  if (debounceMs <= 0) {
    await flushAutomationTriggers(businessId, triggers);
    return;
  }

  // Accumulate triggers in the debounce window
  const existing = debounceTimers.get(key);
  if (existing) {
    existing.triggers.push(...triggers);
    // Reset the timer
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => {
      const entry = debounceTimers.get(key);
      if (entry) {
        debounceTimers.delete(key);
        void flushAutomationTriggers(businessId, entry.triggers);
      }
    }, debounceMs);
  } else {
    const timer = setTimeout(() => {
      const entry = debounceTimers.get(key);
      if (entry) {
        debounceTimers.delete(key);
        void flushAutomationTriggers(businessId, entry.triggers);
      }
    }, debounceMs);
    debounceTimers.set(key, { timer, triggers: [...triggers] });
  }
}

// --- Internal Helpers ---

async function flushAutomationTriggers(
  businessId: string,
  triggers: AutomationDispatchEventData[],
): Promise<void> {
  const events: EventPayload[] = [];

  for (let i = 0; i < triggers.length; i += MAX_TRIGGERS_PER_EVENT) {
    const chunk = triggers.slice(i, i + MAX_TRIGGERS_PER_EVENT);
    events.push({
      name: inngestEvents.automationDispatch,
      data: {
        businessId,
        triggers: chunk,
      },
    });
  }

  await batchSendEvents(events);
}

async function sendWithRetry(
  batchId: string,
  events: EventPayload[],
): Promise<void> {
  let pendingEvents = [...events];
  let attempt = 0;
  let delivered = 0;

  while (pendingEvents.length > 0 && attempt < MAX_RETRY_ATTEMPTS) {
    const failedEvents: EventPayload[] = [];

    try {
      await inngest.send(pendingEvents as Parameters<typeof inngest.send>[0]);
      delivered += pendingEvents.length;
      pendingEvents = [];
    } catch (error) {
      // On error, try sending individually to isolate failures
      for (const event of pendingEvents) {
        try {
          await inngest.send(event as Parameters<typeof inngest.send>[0]);
          delivered++;
        } catch {
          failedEvents.push(event);
        }
      }

      pendingEvents = failedEvents;

      if (pendingEvents.length > 0) {
        attempt++;
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          await sleep(backoffMs);
        }
      }
    }
  }

  // Log on error (partial or complete failure)
  if (pendingEvents.length > 0) {
    const result: BatchResult = {
      batchId,
      delivered,
      failed: pendingEvents.length,
    };
    console.error(
      `[Event Batcher] Batch ${result.batchId} partial failure: ${result.delivered} delivered, ${result.failed} failed after ${MAX_RETRY_ATTEMPTS} attempts`,
      { batchId: result.batchId, delivered: result.delivered, failed: result.failed },
    );
  }
}
