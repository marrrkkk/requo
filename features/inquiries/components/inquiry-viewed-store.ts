"use client";

/**
 * Client-side read-receipt cache for inquiry list instant updates.
 *
 * The detail page marks an inquiry viewed via `markInquiryViewedAction`
 * (server invalidation covers the next navigation). This store covers the
 * race where the user clicks back before that action completes: list rows
 * hide their unread dot/bold immediately without a manual refresh.
 *
 * In-memory `Set` survives App Router client navigations; `sessionStorage`
 * persists it across reloads within the tab. Capped to avoid unbounded growth.
 */

const STORAGE_KEY = "requo:viewed-inquiries";
const MAX_STORED_IDS = 200;

const viewedIds = new Set<string>();
let hydratedFromStorage = false;

function readStoredIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function ensureHydrated() {
  if (hydratedFromStorage || typeof window === "undefined") {
    return;
  }

  hydratedFromStorage = true;

  for (const id of readStoredIds().slice(-MAX_STORED_IDS)) {
    viewedIds.add(id);
  }
}

function persist() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(viewedIds).slice(-MAX_STORED_IDS)),
    );
  } catch {
    // Best-effort only — the in-memory set still covers this session.
  }
}

export function markInquiryViewedLocally(inquiryId: string) {
  ensureHydrated();

  if (viewedIds.has(inquiryId)) {
    return;
  }

  viewedIds.add(inquiryId);

  if (viewedIds.size > MAX_STORED_IDS) {
    const oldest = viewedIds.values().next();

    if (!oldest.done) {
      viewedIds.delete(oldest.value);
    }
  }

  persist();
  emitViewedChange();
}

export function isInquiryViewedLocally(inquiryId: string) {
  ensureHydrated();

  return viewedIds.has(inquiryId);
}

export function getLocallyViewedInquiryIds(): ReadonlySet<string> {
  ensureHydrated();

  return new Set(viewedIds);
}

const snapshotListeners = new Set<() => void>();
let viewedSnapshot: readonly string[] | null = null;
const emptyViewedSnapshot: readonly string[] = [];

function emitViewedChange() {
  viewedSnapshot = null;

  for (const listener of snapshotListeners) {
    listener();
  }
}

export function subscribeLocallyViewedInquiries(listener: () => void) {
  snapshotListeners.add(listener);

  return () => {
    snapshotListeners.delete(listener);
  };
}

/**
 * Client snapshot for `useSyncExternalStore` — referentially stable until
 * the next mark. Lets the list render locally-viewed rows as read instantly
 * with no hydration mismatch and no transition-rule violations.
 */
export function getLocallyViewedInquiriesSnapshot(): readonly string[] {
  ensureHydrated();

  if (!viewedSnapshot) {
    viewedSnapshot = Array.from(viewedIds);
  }

  return viewedSnapshot;
}

/** Server snapshot for `useSyncExternalStore` — always empty (no window). */
export function getLocallyViewedInquiriesServerSnapshot(): readonly string[] {
  return emptyViewedSnapshot;
}
