"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import { Progress } from "@/components/ui/progress";
import {
  routeProgressCompleteEvent,
  getRouteProgressKey,
  routeProgressStartEvent,
  type RouteProgressStartDetail,
} from "@/lib/navigation/route-progress";
import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 180;
const INCREMENT_INTERVAL_MS = 140;
const COMPLETE_DELAY_MS = 160;
const RESET_DELAY_MS = 260;
const STALL_TIMEOUT_MS = 8000;
const MIN_VISIBLE_MS = 160;
const INITIAL_PROGRESS = 16;
const MAX_PROGRESS = 90;

function isPrimaryNavigationClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function getClosestAnchor(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<HTMLAnchorElement>("a[href]");
}

function shouldIgnoreAnchorNavigation(anchor: HTMLAnchorElement) {
  return (
    anchor.dataset.noRouteProgress === "true" ||
    anchor.hasAttribute("download") ||
    (anchor.target !== "" && anchor.target !== "_self")
  );
}

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(
    () => getRouteProgressKey(pathname, searchParams.toString()),
    [pathname, searchParams],
  );

  const activeRouteRef = useRef<string | null>(null);
  const currentRouteRef = useRef(routeKey);

  const intervalRef = useRef<number | null>(null);
  const showDelayRef = useRef<number | null>(null);
  const completeRef = useRef<number | null>(null);
  const resetRef = useRef<number | null>(null);
  const stallRef = useRef<number | null>(null);
  const visibleRef = useRef(false);
  const progressRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const clearTimer = useCallback((timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopIncrementing = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const setBarState = useCallback((nextVisible: boolean, nextProgress: number) => {
    visibleRef.current = nextVisible;
    progressRef.current = nextProgress;
    setVisible(nextVisible);
    setProgress(nextProgress);
  }, []);

  const clearPendingWork = useCallback(() => {
    stopIncrementing();
    clearTimer(showDelayRef);
    clearTimer(completeRef);
    clearTimer(resetRef);
    clearTimer(stallRef);
  }, [clearTimer, stopIncrementing]);

  const completeNavigation = useCallback(() => {
    const wasVisible = visibleRef.current;
    const elapsed =
      startedAtRef.current === null ? MIN_VISIBLE_MS : Date.now() - startedAtRef.current;
    const remainingVisibleMs = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    activeRouteRef.current = null;
    stopIncrementing();
    clearTimer(showDelayRef);
    clearTimer(stallRef);
    clearTimer(completeRef);
    clearTimer(resetRef);

    if (!wasVisible) {
      startedAtRef.current = null;
      setBarState(false, 0);
      return;
    }

    completeRef.current = window.setTimeout(() => {
      setBarState(true, 100);

      completeRef.current = window.setTimeout(() => {
        setVisible(false);
        visibleRef.current = false;
      }, COMPLETE_DELAY_MS);

      resetRef.current = window.setTimeout(() => {
        startedAtRef.current = null;
        setBarState(false, 0);
      }, RESET_DELAY_MS);
    }, remainingVisibleMs);
  }, [clearTimer, setBarState, stopIncrementing]);

  const startVisibleProgress = useCallback(() => {
    startedAtRef.current = Date.now();
    setBarState(true, Math.max(progressRef.current, INITIAL_PROGRESS));

    intervalRef.current = window.setInterval(() => {
      const remaining = MAX_PROGRESS - progressRef.current;

      if (remaining <= 0) {
        stopIncrementing();
        return;
      }

      const nextProgress = Math.min(
        progressRef.current + Math.max(remaining * 0.18, 1.5),
        MAX_PROGRESS,
      );

      setBarState(true, nextProgress);
    }, INCREMENT_INTERVAL_MS);
  }, [setBarState, stopIncrementing]);

  const beginNavigation = useCallback((nextRoute: string) => {
    activeRouteRef.current = nextRoute;
    clearPendingWork();
    startedAtRef.current = null;

    if (visibleRef.current) {
      startVisibleProgress();
    } else {
      showDelayRef.current = window.setTimeout(() => {
        startVisibleProgress();
      }, SHOW_DELAY_MS);
    }

    stallRef.current = window.setTimeout(() => {
      if (activeRouteRef.current === nextRoute) {
        activeRouteRef.current = null;
        startedAtRef.current = null;
        setBarState(false, 0);
        clearPendingWork();
      }
    }, STALL_TIMEOUT_MS);
  }, [clearPendingWork, setBarState, startVisibleProgress]);

  const maybeBeginNavigation = useCallback(
    (nextRoute: string | null, options?: { force?: boolean }) => {
      if (!nextRoute) {
        return;
      }

      if (!options?.force && nextRoute === currentRouteRef.current) {
        return;
      }

      beginNavigation(nextRoute);
    },
    [beginNavigation],
  );

  useEffect(() => {
    currentRouteRef.current = routeKey;

    if (activeRouteRef.current === null) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      completeNavigation();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [completeNavigation, routeKey]);

  useEffect(() => {
    function getNextRouteFromAnchorEvent(eventTarget: EventTarget | null) {
      const anchor = getClosestAnchor(eventTarget);

      if (!anchor || shouldIgnoreAnchorNavigation(anchor)) {
        return null;
      }

      let url: URL;

      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return null;
      }

      if (url.origin !== window.location.origin || !url.protocol.startsWith("http")) {
        return null;
      }

      return getRouteProgressKey(url.pathname, url.search);
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (event.pointerType !== "mouse") {
        return;
      }

      if (!isPrimaryNavigationClick(event as unknown as MouseEvent)) {
        return;
      }

      maybeBeginNavigation(getNextRouteFromAnchorEvent(event.target));
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        (event.key !== "Enter" && event.key !== " ")
      ) {
        return;
      }

      const activeElement = document.activeElement;

      if (!(activeElement instanceof Element)) {
        return;
      }

      maybeBeginNavigation(getNextRouteFromAnchorEvent(activeElement));
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!isPrimaryNavigationClick(event)) {
        return;
      }

      maybeBeginNavigation(getNextRouteFromAnchorEvent(event.target));
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    document.addEventListener("keydown", handleDocumentKeyDown, true);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
      document.removeEventListener("keydown", handleDocumentKeyDown, true);
      document.removeEventListener("click", handleDocumentClick, true);
      activeRouteRef.current = null;
      startedAtRef.current = null;
      clearPendingWork();
    };
  }, [clearPendingWork, maybeBeginNavigation]);

  useEffect(() => {
    function handleRouteProgressStart(event: Event) {
      const { detail } = event as CustomEvent<RouteProgressStartDetail>;

      maybeBeginNavigation(detail.route ?? null, {
        force: detail.force,
      });
    }

    function handlePopState() {
      maybeBeginNavigation(
        getRouteProgressKey(window.location.pathname, window.location.search),
      );
    }

    function handleRouteProgressComplete() {
      completeNavigation();
    }

    window.addEventListener(routeProgressStartEvent, handleRouteProgressStart as EventListener);
    window.addEventListener(routeProgressCompleteEvent, handleRouteProgressComplete);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener(
        routeProgressStartEvent,
        handleRouteProgressStart as EventListener,
      );
      window.removeEventListener(routeProgressCompleteEvent, handleRouteProgressComplete);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [completeNavigation, maybeBeginNavigation]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[140] transition-opacity duration-200 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <Progress
        value={progress}
        className={cn(
          "h-1 rounded-none bg-border/55 dark:bg-white/8",
          "[&_[data-slot=progress-indicator]]:bg-primary",
          "[&_[data-slot=progress-indicator]]:shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_0_18px_rgba(0,128,96,0.26)]",
          "dark:[&_[data-slot=progress-indicator]]:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_18px_rgba(0,128,96,0.16)]",
          "[&_[data-slot=progress-indicator]]:transition-transform",
          "[&_[data-slot=progress-indicator]]:duration-200",
          "[&_[data-slot=progress-indicator]]:ease-out",
        )}
      />
    </div>
  );
}
