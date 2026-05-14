"use client";

import { useRouter } from "next/navigation";

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

  const push = (...args: Parameters<typeof router.push>) => {
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

    router.push(...args);
  };

  const replace = (...args: Parameters<typeof router.replace>) => {
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
  };

  const refresh = (...args: Parameters<typeof router.refresh>) => {
    dispatchRouteProgressStart({
      force: true,
      route: getCurrentRouteProgressKey(),
    });
    router.refresh(...args);
  };

  return {
    ...router,
    push,
    replace,
    back: () => router.back(),
    forward: () => router.forward(),
    refresh,
  };
}
