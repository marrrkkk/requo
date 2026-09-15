"use client";

import { type ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";

import { BoarduiMainSidebar } from "@/components/shell/boardui-main-sidebar";
import { BoarduiSettingsSidebar } from "@/features/settings/components/boardui-settings-sidebar";
import type { SettingsNavigationGroup } from "@/features/settings/navigation";
import type { BusinessMemberRole } from "@/lib/business-members";

export type MobileFullscreenNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessSlug: string;
  role?: BusinessMemberRole;
  variant: "main" | "settings";
  groups?: SettingsNavigationGroup[];
  topSlot?: ReactNode;
  /** User profile menu rendered at the bottom of the sidebar (same as desktop). */
  bottomSlot?: ReactNode;
  checklistSlot?: ReactNode;
  /** When provided, the sidebar Quick Search opens the global quick-actions dialog (same as desktop). */
  onQuickSearch?: () => void;
};

/**
 * Fullscreen navigation overlay for mobile (below `lg`).
 *
 * Reuses the same sidebar UI as desktop (`BoarduiMainSidebar` for the main
 * workspace nav, `BoarduiSettingsSidebar` for settings) stretched fullscreen,
 * but strips the chrome that already lives elsewhere on mobile: no theme
 * toggle, and no Support/Settings secondary rows. The user profile menu
 * renders at the bottom, same as desktop.
 */
export function MobileFullscreenNav({
  open,
  onOpenChange,
  businessSlug,
  role = "owner",
  variant,
  groups = [],
  topSlot,
  bottomSlot,
  checklistSlot,
  onQuickSearch,
}: MobileFullscreenNavProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  // Close the overlay on successful navigation.
  useEffect(() => {
    if (open) {
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) {
    return null;
  }

  const handleClose = () => onOpenChange(false);

  // The user profile menu renders at the bottom, same as desktop; an
  // additionally-passed checklist stacks above it.
  const resolvedBottomSlot =
    bottomSlot && checklistSlot ? (
      <div className="flex w-full flex-col gap-2">
        <div className="w-full">{checklistSlot}</div>
        {bottomSlot}
      </div>
    ) : (
      (bottomSlot ?? checklistSlot ?? undefined)
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={variant === "main" ? "Workspace navigation" : "Settings navigation"}
      className="fixed inset-0 z-50 flex flex-col bg-sidebar lg:hidden"
    >
      <div className="h-dvh w-full">
        {variant === "main" ? (
          <BoarduiMainSidebar
            businessSlug={businessSlug}
            role={role}
            topSlot={topSlot}
            bottomSlot={resolvedBottomSlot}
            onQuickSearch={onQuickSearch}
            mobile
            onClose={handleClose}
            showThemeToggle={false}
            hideSecondaryNav
            className="h-full w-full rounded-none border-0 shadow-none"
          />
        ) : (
          <BoarduiSettingsSidebar
            businessSlug={businessSlug}
            groups={groups}
            topSlot={topSlot}
            bottomSlot={resolvedBottomSlot}
            mobile
            onClose={handleClose}
            showThemeToggle={false}
            className="h-full w-full rounded-none border-0 shadow-none"
          />
        )}
      </div>
    </div>
  );
}
