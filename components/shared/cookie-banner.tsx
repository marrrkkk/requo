"use client";

import { useSyncExternalStore, useCallback, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

const COOKIE_NAME = "requo_cookie_consent";
const COOKIE_MAX_AGE_DAYS = 30;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number): void {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function isDismissed(): boolean {
  return (
    getCookie(COOKIE_NAME) === "dismissed" ||
    sessionStorage.getItem(COOKIE_NAME) === "dismissed"
  );
}

// No-op subscribe — cookie state doesn't change externally
const subscribe = () => () => {};
const getServerSnapshot = () => true; // treat as dismissed on server (don't show)

export function CookieBanner() {
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const getSnapshot = useCallback(
    () => manuallyDismissed || isDismissed(),
    [manuallyDismissed],
  );
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function handleDismiss() {
    setCookie(COOKIE_NAME, "dismissed", COOKIE_MAX_AGE_DAYS);
    try {
      sessionStorage.setItem(COOKIE_NAME, "dismissed");
    } catch {
      // sessionStorage unavailable in some contexts — cookie is enough
    }
    setManuallyDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/95 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground sm:text-sm">
          We use essential cookies for security and session management.{" "}
          <Link
            href="/privacy"
            className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/80"
          >
            See our Privacy Policy
          </Link>
          .
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={handleDismiss}
          aria-label="Dismiss cookie notice"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
