"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
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

  const push = useCallback(
    (...args: Parameters<typeof router.push>) => {
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

      // No startTransition wrapper — let unstable_instant handle
      // immediate skeleton display at the destination route
      router.push(...args);
    },
    [router],
  );

  const replace = useCallback(
    (...args: Parameters<typeof router.replace>) => {
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

      router.replace(...args);
    },
    [router],
  );

  const refresh = useCallback(
    (...args: Parameters<typeof router.refresh>) => {
      dispatchRouteProgressStart({
        force: true,
        route: getCurrentRouteProgressKey(),
      });
      router.refresh(...args);
    },
    [router],
  );

  return useMemo(
    () => ({
      ...router,
      push,
      replace,
      back: () => router.back(),
      forward: () => router.forward(),
      refresh,
    }),
    [router, push, replace, refresh],
  );
}
