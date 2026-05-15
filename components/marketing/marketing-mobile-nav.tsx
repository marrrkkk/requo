"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";

import {
  getMarketingNavHref,
  getMarketingNavKey,
  navItems,
  resourceLinks,
} from "@/components/marketing/marketing-data";
import { Button } from "@/components/ui/button";
import { useOverlayPresence } from "@/components/ui/overlay-state";
import { businessesHubPath } from "@/features/businesses/routes";

type MarketingMobileNavProps = {
  isAuthenticated: boolean;
};

const MOBILE_NAV_EXIT_DURATION_MS = 320;

type ScrollLockStyles = {
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  rootOverflow: string;
  rootOverscrollBehavior: string;
};

export function MarketingMobileNav({
  isAuthenticated,
}: MarketingMobileNavProps) {
  const [open, setOpen] = useState(false);
  const [menuRenderKey, setMenuRenderKey] = useState(0);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const scrollLockStylesRef = useRef<ScrollLockStyles | null>(null);
  const present = useOverlayPresence(open, MOBILE_NAV_EXIT_DURATION_MS);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    if (open) {
      closeMenu();
      return;
    }

    setMenuRenderKey((currentKey) => currentKey + 1);
    setOpen(true);
  }, [closeMenu, open]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const restoreScrollLock = () => {
      const previousStyles = scrollLockStylesRef.current;

      if (!previousStyles) return;

      body.style.overflow = previousStyles.bodyOverflow;
      body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
      root.style.overflow = previousStyles.rootOverflow;
      root.style.overscrollBehavior = previousStyles.rootOverscrollBehavior;
      delete body.dataset.marketingMobileNavPresent;
      scrollLockStylesRef.current = null;
    };

    if (present) {
      scrollLockStylesRef.current ??= {
        bodyOverflow: body.style.overflow,
        bodyOverscrollBehavior: body.style.overscrollBehavior,
        rootOverflow: root.style.overflow,
        rootOverscrollBehavior: root.style.overscrollBehavior,
      };

      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      root.style.overflow = "hidden";
      root.style.overscrollBehavior = "none";
      body.dataset.marketingMobileNavPresent = "true";
    } else {
      restoreScrollLock();
    }

    return restoreScrollLock;
  }, [present]);

  useEffect(() => {
    if (!open || !present) return;

    const frameId = window.requestAnimationFrame(() => {
      toggleButtonRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [open, present]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeMenu();
      }
    };

    mediaQuery.addEventListener("change", closeOnDesktop);

    return () => {
      mediaQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [closeMenu]);

  const overlay = (
    <div
      aria-hidden={!open}
      aria-modal="true"
      className="mobile-nav-overlay lg:hidden"
      data-state={open ? "open" : "closed"}
      key={menuRenderKey}
      role="dialog"
    >
      <nav className="mobile-nav-body">
        {navItems.map((item, index) => (
          <Link
            className="mobile-nav-link"
            href={getMarketingNavHref(item)}
            key={getMarketingNavKey(item)}
            onClick={closeMenu}
            style={{ "--item-index": index } as React.CSSProperties}
          >
            {item.label}
          </Link>
        ))}
        <span className="mobile-nav-divider" />
        <span className="mobile-nav-section-label">Resources</span>
        {resourceLinks.map((link, index) => (
          <Link
            className="mobile-nav-link"
            href={link.href}
            key={link.href}
            onClick={closeMenu}
            style={
              {
                "--item-index": navItems.length + index + 1,
              } as React.CSSProperties
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mobile-nav-actions">
        {isAuthenticated ? (
          <Button asChild className="h-14 w-full rounded-full text-lg">
            <Link href={businessesHubPath} onClick={closeMenu}>
              Visit app
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        ) : (
          <>
            <Button
              asChild
              className="h-14 w-full rounded-full border-2 bg-background text-lg"
              variant="outline"
            >
              <Link href="/login" onClick={closeMenu}>
                Log in
              </Link>
            </Button>
            <Button asChild className="h-14 w-full rounded-full text-lg">
              <Link href="/signup" onClick={closeMenu}>
                Start free
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        className="mobile-nav-toggle lg:hidden"
        data-open={open}
        onClick={toggleMenu}
        ref={toggleButtonRef}
        type="button"
      >
        <span className="mobile-nav-toggle-bars" data-open={open}>
          <span />
          <span />
          <span />
        </span>
      </button>

      {present ? createPortal(overlay, document.body) : null}
    </>
  );
}
