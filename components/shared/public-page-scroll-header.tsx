"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PublicPageScrollHeaderProps = {
  children: ReactNode;
  className?: string;
  directionThreshold?: number;
  threshold?: number;
};

type ScrollState = "top" | "visible" | "hidden";

export function PublicPageScrollHeader({
  children,
  className,
  directionThreshold = 4,
  threshold = 32,
}: PublicPageScrollHeaderProps) {
  const [state, setState] = useState<ScrollState>("top");
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    let frameId = 0;

    const updateState = () => {
      frameId = 0;

      const currentScrollY = Math.max(window.scrollY, 0);
      const previousScrollY = lastScrollYRef.current;
      const scrollDelta = currentScrollY - previousScrollY;

      lastScrollYRef.current = currentScrollY;

      if (currentScrollY <= threshold) {
        setState((current) => (current === "top" ? current : "top"));
        return;
      }

      if (Math.abs(scrollDelta) < directionThreshold) return;

      const nextState: ScrollState = scrollDelta < 0 ? "visible" : "hidden";
      setState((current) => (current === nextState ? current : nextState));
    };

    const requestUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateState);
    };

    lastScrollYRef.current = Math.max(window.scrollY, 0);
    window.addEventListener("scroll", requestUpdate, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", requestUpdate);
    };
  }, [directionThreshold, threshold]);

  return (
    <header
      className={cn(
        "public-page-header public-page-scroll-header",
        className,
      )}
      data-scroll-state={state}
    >
      {children}
    </header>
  );
}
