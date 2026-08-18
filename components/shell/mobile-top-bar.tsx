"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MobileTopBarProps = {
  /** Leading business avatar / switcher control. */
  businessControl?: ReactNode;
  /** Current page title or breadcrumb title. */
  pageTitle: string;
  /** Notification bell slot. */
  notificationSlot?: ReactNode;
  /** Trailing user profile avatar / menu control. */
  userControl?: ReactNode;
  className?: string;
};

/**
 * Mobile top application bar shown below `lg` breakpoint.
 * Layout: [business avatar] [current page title] [notifications] [profile avatar]
 */
export function MobileTopBar({
  businessControl,
  pageTitle,
  notificationSlot,
  userControl,
  className,
}: MobileTopBarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex h-13 items-center justify-between border-b border-border/70 bg-background/90 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {/* Leading business avatar button */}
        {businessControl ? (
          <div className="size-8 shrink-0 flex items-center justify-center">
            {businessControl}
          </div>
        ) : null}

        {/* Page Title */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Trailing actions: Notifications & User Profile */}
      <div className="flex shrink-0 items-center gap-2">
        {notificationSlot ? (
          <div className="flex size-9 items-center justify-center">
            {notificationSlot}
          </div>
        ) : null}
        {userControl ? (
          <div className="size-8 shrink-0 flex items-center justify-center">
            {userControl}
          </div>
        ) : null}
      </div>
    </div>
  );
}
