import { Clock } from "lucide-react";

const STALE_THRESHOLD_SECONDS = 900; // 15 minutes

/**
 * Formats a timestamp into a human-readable relative time string.
 * Examples: "just now", "2 minutes ago", "1 hour ago", "3 days ago"
 */
function formatRefreshedAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes === 1) {
    return "1 minute ago";
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours === 1) {
    return "1 hour ago";
  }

  if (hours < 24) {
    return `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "1 day ago";
  }

  return `${days} days ago`;
}

/**
 * Determines whether the cache age exceeds the staleness threshold (15 minutes).
 */
export function isCacheStale(lastUpdatedAt: Date | string): boolean {
  const date =
    lastUpdatedAt instanceof Date ? lastUpdatedAt : new Date(lastUpdatedAt);
  const ageSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  return ageSeconds > STALE_THRESHOLD_SECONDS;
}

type LastUpdatedTimestampProps = {
  lastUpdatedAt: Date | string;
};

/**
 * Displays a "Refreshed X ago" indicator below the page header.
 * Renders in warning color when the cache age exceeds 15 minutes.
 */
export function LastUpdatedTimestamp({
  lastUpdatedAt,
}: LastUpdatedTimestampProps) {
  const date =
    lastUpdatedAt instanceof Date ? lastUpdatedAt : new Date(lastUpdatedAt);
  const stale = isCacheStale(date);
  const relativeTime = formatRefreshedAgo(date);

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${
        stale
          ? "text-amber-600 dark:text-amber-500"
          : "text-muted-foreground"
      }`}
    >
      <Clock className="size-3 shrink-0" />
      <span>Refreshed {relativeTime}</span>
    </div>
  );
}
