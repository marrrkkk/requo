"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Component, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminDashboardTileBoundaryProps = {
  /** Short label shown as the tile caption while the error is visible. */
  label: string;
  /** Tile content rendered when the count query succeeds. */
  children: ReactNode;
};

/**
 * Per-tile error boundary for the admin landing dashboard.
 *
 * Wraps one of the six count tiles so a failing count query shows a
 * calm retry placeholder in place of the affected tile only, while
 * the rest of the dashboard renders normally (Req 2.4). The error is
 * swallowed locally — reporting/logging is handled by Next.js when
 * the server component throws; this boundary only surfaces the UI
 * affordance to recover.
 */
export function AdminDashboardTileBoundary({
  label,
  children,
}: AdminDashboardTileBoundaryProps) {
  return (
    <TileErrorBoundary fallback={<AdminDashboardTileError label={label} />}>
      {children}
    </TileErrorBoundary>
  );
}

type TileErrorBoundaryState = { hasError: boolean };

type TileErrorBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

class TileErrorBoundary extends Component<
  TileErrorBoundaryProps,
  TileErrorBoundaryState
> {
  state: TileErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): TileErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // No-op. Next.js already surfaces the underlying server error in
    // its own logging pipeline. Swallowing locally keeps the rest of
    // the dashboard usable.
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function AdminDashboardTileError({ label }: { label: string }) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "info-tile flex flex-col gap-3",
        // Soft warning treatment so the failed tile is noticeable without
        // shouting. Uses semantic tokens only per DESIGN.md.
        "border-destructive/40",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="meta-label">{label}</div>
      <p className="text-sm leading-snug text-muted-foreground">
        Couldn&apos;t load this count.
      </p>
      <div>
        <Button
          onClick={() => {
            router.refresh();
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <RotateCcw data-icon="inline-start" />
          Retry
        </Button>
      </div>
    </div>
  );
}
