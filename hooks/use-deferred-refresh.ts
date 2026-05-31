"use client";

import { useCallback, useEffect, useRef } from "react";

import { useProgressRouter } from "@/hooks/use-progress-router";

const DEFAULT_DEFER_MS = 300;

/**
 * Batches router.refresh() calls so bulk or rapid mutations don't flicker.
 */
export function useDeferredRefresh(deferMs = DEFAULT_DEFER_MS) {
  const router = useProgressRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      router.refresh();
    }, deferMs);
  }, [deferMs, router]);

  const refreshNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    router.refresh();
  }, [router]);

  return { scheduleRefresh, refreshNow };
}
