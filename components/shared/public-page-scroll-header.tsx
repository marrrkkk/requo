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

export function PublicPageScrollHeader({
  children,
  className,
  directionThreshold = 4,
  threshold = 32,
}: PublicPageScrollHeaderProps) {
  const [visible, setVisible] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    let frameId = 0;

    const updateVisibility = () => {
      frameId = 0;

      const currentScrollY = Math.max(window.scrollY, 0);
      const previousScrollY = lastScrollYRef.current;
      const scrollDelta = currentScrollY - previousScrollY;

      lastScrollYRef.current = currentScrollY;

      if (currentScrollY <= threshold) {
        setVisible(false);
        return;
      }

      if (Math.abs(scrollDelta) < directionThreshold) return;

      const nextVisible = scrollDelta < 0;
      setVisible((currentVisible) =>
        currentVisible === nextVisible ? currentVisible : nextVisible,
      );
    };

    const requestUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateVisibility);
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
      data-scroll-reveal={visible ? "visible" : "hidden"}
    >
      {children}
    </header>
  );
}
