"use client";

import { useLinkStatus } from "next/link";

import { cn } from "@/lib/utils";

/**
 * Subtle non-blocking navigation feedback for dashboard links.
 *
 * Must be rendered as a descendant of a Next.js `<Link>` — `useLinkStatus`
 * reports that link's pending state. The hint is a fixed-size dot that is
 * always in the layout (no shift) and effectively invisible for fast
 * transitions: it only fades in after a short CSS delay, then pulses gently
 * while the navigation is still pending. It is `aria-hidden` so keyboard
 * and screen-reader users are unaffected; the link itself keeps focus.
 */
export function NavLinkStatus({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      data-pending={pending || undefined}
      className={cn("nav-link-hint", pending && "is-pending", className)}
    />
  );
}
