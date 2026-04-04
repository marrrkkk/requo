export const routeProgressStartEvent = "relay:route-progress-start";
export const routeProgressCompleteEvent = "relay:route-progress-complete";

export type RouteProgressStartDetail = {
  force?: boolean;
  route?: string | null;
};

export function getRouteProgressKey(pathname: string, search: string) {
  if (!search) {
    return pathname;
  }

  return `${pathname}${search.startsWith("?") ? search : `?${search}`}`;
}

export function getCurrentRouteProgressKey() {
  if (typeof window === "undefined") {
    return null;
  }

  return getRouteProgressKey(window.location.pathname, window.location.search);
}

export function getRouteProgressKeyFromHref(href: string) {
  if (typeof window === "undefined") {
    return null;
  }

  let url: URL;

  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin || !url.protocol.startsWith("http")) {
    return null;
  }

  return getRouteProgressKey(url.pathname, url.search);
}

export function dispatchRouteProgressStart(detail: RouteProgressStartDetail = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<RouteProgressStartDetail>(routeProgressStartEvent, {
      detail,
    }),
  );
}

export function dispatchRouteProgressComplete() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(routeProgressCompleteEvent));
}
