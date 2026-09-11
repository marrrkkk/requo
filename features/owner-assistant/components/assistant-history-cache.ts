"use client";

export type AssistantHistoryCachedItem = {
  id: string;
  title: string | null;
  lastMessageAt: string;
  createdAt: string;
};

type CachedHistoryEntry = {
  items: AssistantHistoryCachedItem[];
  total: number;
};

export const ASSISTANT_HISTORY_CHANGED_EVENT = "assistant:history-changed";

/**
 * Module-level history cache, keyed by business.
 *
 * The history list lives inside a popover/sheet that unmounts when closed, so
 * every open rebuilt from an empty list and flashed a skeleton. Keeping the
 * last first-page result here lets the next open render instantly
 * (stale-while-revalidate): cached rows paint immediately while a silent
 * background fetch brings titles and ordering up to date.
 *
 * Module scope is per tab, matching the live-chat store. Entries are replaced
 * (not merged) on a first-page fetch so server-side deletions from another
 * tab disappear; `loadMore` appends.
 */
const cache = new Map<string, CachedHistoryEntry>();

function keyOf(businessSlug: string): string {
  return businessSlug;
}

export function getCachedAssistantHistory(
  businessSlug: string,
): CachedHistoryEntry | null {
  return cache.get(keyOf(businessSlug)) ?? null;
}

export function setCachedAssistantHistory(
  businessSlug: string,
  items: AssistantHistoryCachedItem[],
  total: number,
): void {
  cache.set(keyOf(businessSlug), { items, total });
}

export function appendCachedAssistantHistory(
  businessSlug: string,
  items: AssistantHistoryCachedItem[],
  total: number,
): void {
  const key = keyOf(businessSlug);
  const prev = cache.get(key);
  if (!prev) {
    cache.set(key, { items, total });
    return;
  }
  const seen = new Set(prev.items.map((item) => item.id));
  const merged = [
    ...prev.items,
    ...items.filter((item) => !seen.has(item.id)),
  ];
  cache.set(key, { items: merged, total });
}

export function patchCachedAssistantHistoryTitle(
  businessSlug: string,
  sessionId: string,
  title: string,
): void {
  const entry = cache.get(keyOf(businessSlug));
  if (!entry) return;
  cache.set(keyOf(businessSlug), {
    ...entry,
    items: entry.items.map((item) =>
      item.id === sessionId ? { ...item, title } : item,
    ),
  });
}

export function removeCachedAssistantHistory(
  businessSlug: string,
  sessionId: string,
): void {
  const entry = cache.get(keyOf(businessSlug));
  if (!entry) return;
  cache.set(keyOf(businessSlug), {
    items: entry.items.filter((item) => item.id !== sessionId),
    total: Math.max(0, entry.total - 1),
  });
}

export function clearAssistantHistoryCache(businessSlug?: string): void {
  if (businessSlug) {
    cache.delete(keyOf(businessSlug));
    return;
  }
  cache.clear();
}

/** Shallow compare so a background revalidate that changed nothing skips a render. */
export function assistantHistoriesEqual(
  a: AssistantHistoryCachedItem[],
  b: AssistantHistoryCachedItem[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, index) =>
      item.id === b[index].id && item.title === b[index].title,
  );
}

export function notifyAssistantHistoryChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ASSISTANT_HISTORY_CHANGED_EVENT));
}
