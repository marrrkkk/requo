"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";

import {
  dispatchRouteProgressComplete,
  dispatchRouteProgressStart,
  getCurrentRouteProgressKey,
  getRouteProgressKeyFromHref,
} from "@/lib/navigation/route-progress";

export function useProgressRouter() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const awaitingCompletionRef = useRef(false);

  useEffect(() => {
    if (isPending || !awaitingCompletionRef.current) {
      return;
    }

    awaitingCompletionRef.current = false;
    dispatchRouteProgressComplete();
  }, [isPending]);

  const trackTransition = useCallback(
    (action: () => void) => {
      awaitingCompletionRef.current = true;
      startTransition(action);
    },
    [startTransition],
  );

  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        const [href] = args;
        const nextRoute = getRouteProgressKeyFromHref(href);

        if (nextRoute) {
          dispatchRouteProgressStart({ route: nextRoute });
        }

        trackTransition(() => {
          router.push(...args);
        });
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        const [href] = args;
        const nextRoute = getRouteProgressKeyFromHref(href);

        if (nextRoute) {
          dispatchRouteProgressStart({ route: nextRoute });
        }

        trackTransition(() => {
          router.replace(...args);
        });
      },
      back: () => {
        router.back();
      },
      forward: () => {
        router.forward();
      },
      refresh: (...args: Parameters<typeof router.refresh>) => {
        dispatchRouteProgressStart({
          force: true,
          route: getCurrentRouteProgressKey(),
        });
        trackTransition(() => {
          router.refresh(...args);
        });
      },
    }),
    [router, trackTransition],
  );
}
