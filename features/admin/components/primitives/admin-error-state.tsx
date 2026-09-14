"use client";

import type { ReactNode } from "react";
import { RiAlertLine, RiRefreshLine } from "@remixicon/react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminErrorStateProps = {
  /** Short, specific headline — say which region failed, not just "error". */
  title?: ReactNode;
  description?: ReactNode;
  error?: Error & { digest?: string };
  /** Retry handler. Omit for errors a retry cannot fix. */
  reset?: () => void;
  className?: string;
};

/**
 * Section-level error state for the admin console.
 *
 * Used as the `RegionErrorBoundary` fallback around independently-failing data
 * regions, so one broken query shows an inline notice while the rest of the
 * page keeps rendering. Page-level failures are handled by
 * `app/admin/(console)/error.tsx`, which uses the main app's `StatePageCard`.
 */
export function AdminErrorState({
  title = "This section did not load",
  description = "The request failed. Try again, or continue with the rest of the page.",
  error,
  reset,
  className,
}: AdminErrorStateProps) {
  return (
    <Alert className={cn("items-start", className)} variant="destructive">
      <RiAlertLine aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {error?.digest ? (
          <p className="mt-2 font-mono text-xs text-destructive/70">
            Ref: {error.digest}
          </p>
        ) : null}
      </AlertDescription>
      {reset ? (
        <AlertAction>
          <Button onClick={reset} size="sm" type="button" variant="outline">
            <RiRefreshLine data-icon="inline-start" aria-hidden />
            Retry
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}
