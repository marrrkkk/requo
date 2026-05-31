import { useCallback, useEffect, useRef, useState } from "react";

type UseProgressiveRevealOptions = {
  /** Total number of items available to reveal */
  total: number;
  /** Number of items to show initially */
  initialBatch: number;
  /** Number of items to reveal on each trigger */
  batchSize: number;
  /** IntersectionObserver root margin (px). Positive = prefetch before entering viewport */
  rootMargin?: number;
};

type UseProgressiveRevealResult = {
  /** Items currently visible (slice this from your array) */
  visibleCount: number;
  /** Whether there are more items to reveal */
  hasMore: boolean;
  /** Ref to attach to the sentinel element at the bottom of the list */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** Manually trigger reveal (e.g. for a fallback button) */
  revealMore: () => void;
};

/**
 * Progressive reveal for client-side lists.
 *
 * Uses an IntersectionObserver on a sentinel element so that as the user
 * scrolls the page and the sentinel approaches the viewport, more items are
 * automatically revealed in batches.
 *
 * Ideal for board columns (follow-ups, jobs) and other views where all
 * data is already loaded but we want to avoid rendering hundreds of DOM
 * nodes upfront.
 */
export function useProgressiveReveal({
  total,
  initialBatch,
  batchSize,
  rootMargin = 80,
}: UseProgressiveRevealOptions): UseProgressiveRevealResult {
  const [visibleCount, setVisibleCount] = useState(
    Math.min(initialBatch, total),
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  const hasMore = visibleCount < total;

  const revealMore = useCallback(() => {
    if (inFlightRef.current || visibleCount >= total) {
      return;
    }
    inFlightRef.current = true;
    setVisibleCount((prev) => {
      const next = Math.min(prev + batchSize, total);
      return next;
    });
    // Allow next reveal on next frame
    requestAnimationFrame(() => {
      inFlightRef.current = false;
    });
  }, [batchSize, total, visibleCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          revealMore();
        }
      },
      { rootMargin: `${rootMargin}px` },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, revealMore, rootMargin]);

  return {
    visibleCount,
    hasMore,
    sentinelRef,
    revealMore,
  };
}
