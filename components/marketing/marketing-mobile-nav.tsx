"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";

import {
  getMarketingNavHref,
  getMarketingNavKey,
  navItems,
} from "@/components/marketing/marketing-data";
import { Button } from "@/components/ui/button";
import { useOverlayPresence } from "@/components/ui/overlay-state";
import { workspacesHubPath } from "@/features/workspaces/routes";

type MarketingMobileNavProps = {
  isAuthenticated: boolean;
};

export function MarketingMobileNav({
  isAuthenticated,
}: MarketingMobileNavProps) {
  const [open, setOpen] = useState(false);
  const present = useOverlayPresence(open);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
      data-open={open}
      role="dialog"
    >
      <div className="mobile-nav-header">
        <button
          aria-label="Close navigation"
          className="mobile-nav-close"
          onClick={closeMenu}
          type="button"
        >
          <X className="size-5" />
        </button>
      </div>

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
      </nav>

      <div className="mobile-nav-actions">
        {isAuthenticated ? (
          <Button asChild className="h-14 w-full rounded-full text-lg">
            <Link href={workspacesHubPath} onClick={closeMenu}>
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
        onClick={() => setOpen((prev) => !prev)}
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
