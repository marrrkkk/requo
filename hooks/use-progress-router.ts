"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";

import {
  dispatchRouteProgressComplete,
  dispatchRouteProgressStart,
  getCurrentRouteProgressKey,
  getRouteProgressKeyFromHref,
} from "@/lib/navigation/route-progress";

function getPathnameFromHref(href: string | URL) {
  try {
    if (typeof href === "string") {
      return new URL(href, window.location.origin).pathname;
    }
    return href.pathname;
  } catch {
    return null;
  }
}

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
        const nextPathname = getPathnameFromHref(href);
        const currentPathname =
          typeof window !== "undefined" ? window.location.pathname : null;
        const isSamePathQueryUpdate =
          nextPathname !== null && currentPathname === nextPathname;

        if (nextRoute && !isSamePathQueryUpdate) {
          dispatchRouteProgressStart({ route: nextRoute });
        }

        trackTransition(() => {
          router.push(...args);
        });
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        const [href] = args;
        const nextRoute = getRouteProgressKeyFromHref(href);
        const nextPathname = getPathnameFromHref(href);
        const currentPathname =
          typeof window !== "undefined" ? window.location.pathname : null;
        const isSamePathQueryUpdate =
          nextPathname !== null && currentPathname === nextPathname;

        if (nextRoute && !isSamePathQueryUpdate) {
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
