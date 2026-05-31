"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type OptimisticPendingIndicatorProps = {
  pending?: boolean;
  className?: string;
  size?: "sm" | "md";
};

export function OptimisticPendingIndicator({
  pending = false,
  className,
  size = "sm",
}: OptimisticPendingIndicatorProps) {
  if (!pending) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-muted-foreground",
        size === "sm" ? "size-3.5" : "size-4",
        className,
      )}
    >
      <Spinner className={size === "sm" ? "size-3" : "size-3.5"} />
    </span>
  );
}
