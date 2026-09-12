"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type MobileHeaderSlotContextValue = {
  target: HTMLElement | null;
  setTarget: (element: HTMLElement | null) => void;
};

const MobileHeaderSlotContext =
  createContext<MobileHeaderSlotContextValue>({
    target: null,
    setTarget: () => {},
  });

/**
 * Provides the navbar slot target for page-level header actions.
 * Mount once in the dashboard shell around both the mobile top bar and
 * the page content.
 */
export function MobileHeaderSlotProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ target, setTarget }), [target]);

  return (
    <MobileHeaderSlotContext.Provider value={value}>
      {children}
    </MobileHeaderSlotContext.Provider>
  );
}

/**
 * Empty target node rendered inside the mobile top bar. Page actions
 * portal into it below the `lg` breakpoint. Unmounted on desktop (the top
 * bar is `lg:hidden`), so the slot falls back to inline rendering there.
 */
export function MobileHeaderSlotTarget({ className }: { className?: string }) {
  const { setTarget } = useContext(MobileHeaderSlotContext);

  return (
    <div
      ref={setTarget}
      className={cn("flex shrink-0 items-center gap-1", className)}
    />
  );
}

/**
 * Responsive treatment for header-action triggers that portal into the
 * mobile navbar: full labeled button on desktop, small icon-only button
 * below `lg`. Use `size="sm"` for ALL header actions (outline + primary)
 * so desktop renders the same 32px height and the mobile navbar pin matches
 * exactly. Below `lg` the
 * `.mobile-navbar-icon-button` rule in `app/globals.css` pins the 32px
 * icon box (plain cascade-safe CSS — the desktop `h-9`/`px-3`
 * utilities would otherwise win below `lg` and inflate the navbar
 * buttons). Pair with a `hidden lg:inline` label span (and
 * `max-lg:hidden` on chevrons/count badges):
 *
 * ```tsx
 * <Button
 *   variant="outline"
 *   size="sm"
 *   className={mobileNavbarIconButtonClassName}
 *   aria-label="Export CSV"
 *   title="Export CSV"
 * >
 *   <Download />
 *   <span className="hidden lg:inline">Export CSV</span>
 * </Button>
 * ```
 *
 * Below `lg` the fixed 32px box applies and the icon stays centered when
 * the label hides. On desktop the class is a no-op so the button renders
 * exactly as before the mobile-navbar work.
 */
export const mobileNavbarIconButtonClassName = "mobile-navbar-icon-button";

export type MobileHeaderSlotProps = {
  children: ReactNode;
  /**
   * Wrapper rendered around children on desktop, where the actions stay
   * in place. Omit for a fragment (e.g. inside `PageHeader` actions).
   */
  desktopClassName?: string;
};

/**
 * Renders page-level header actions inline on desktop and teleports the
 * SAME instance into the mobile navbar below `lg`.
 *
 * Single-instance (no duplicate state, effects, or IDs): `useIsMobile`
 * resolves `false` on the server and first client render, so hydration
 * always matches the inline output; the portal engages after mount on
 * mobile. Pair triggers with their previous desktop `variant`/`size`,
 * `mobileNavbarIconButtonClassName`, and a `hidden lg:inline` label span
 * (see above) — full labeled button on desktop, small icon button below
 * `lg`.
 */
export function MobileHeaderSlot({
  children,
  desktopClassName,
}: MobileHeaderSlotProps) {
  const { target } = useContext(MobileHeaderSlotContext);
  const isMobile = useIsMobile();

  if (isMobile && target) {
    return createPortal(children, target);
  }

  if (desktopClassName) {
    return (
      <div className={cn(desktopClassName, "max-lg:hidden")}>{children}</div>
    );
  }

  return <span className="contents max-lg:hidden">{children}</span>;
}
