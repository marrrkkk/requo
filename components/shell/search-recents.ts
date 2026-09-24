export type SearchRecordType =
  | "inquiry"
  | "quote"
  | "invoice"
  | "product"
  | "service"
  | "follow-up";

export type RecentSearchRecord = {
  id: string;
  type: SearchRecordType;
  title: string;
  subtitle: string | null;
  href: string;
};

const MAX_RECENTS = 8;

function recentsKey(businessSlug: string) {
  return `requo:recent-records:${businessSlug}`;
}

function isRecentRecord(value: unknown): value is RecentSearchRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.type === "string" &&
    typeof record.title === "string" &&
    typeof record.href === "string" &&
    (record.subtitle === null || typeof record.subtitle === "string")
  );
}

export function getRecentSearchRecords(
  businessSlug: string,
): RecentSearchRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(recentsKey(businessSlug));
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isRecentRecord).slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function recordRecentSearchRecord(
  businessSlug: string,
  record: RecentSearchRecord,
) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const existing = getRecentSearchRecords(businessSlug).filter(
      (item) => !(item.id === record.id && item.type === record.type),
    );
    const next = [record, ...existing].slice(0, MAX_RECENTS);
    window.localStorage.setItem(recentsKey(businessSlug), JSON.stringify(next));
  } catch {
    // Storage full or unavailable — recents are best-effort.
  }
}

export function clearRecentSearchRecords(businessSlug: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(recentsKey(businessSlug));
  } catch {
    // Best-effort.
  }
}
