"use client";

import { RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type LazyErrorBoundaryState = {
  hasError: boolean;
};

type LazyErrorBoundaryProps = {
  children: ReactNode;
};

/**
 * Lightweight error boundary for lazy-loaded components.
 *
 * Catches chunk download failures (network errors, 404s from deploys)
 * and displays a calm inline retry UI. On retry, it resets the error
 * state so React re-renders the children — which triggers the dynamic
 * import again, re-attempting the chunk download.
 *
 * Designed to wrap `next/dynamic` components with `ssr: false`. Adds
 * minimal JS overhead (class component + small fallback UI).
 */
export class LazyErrorBoundary extends Component<
  LazyErrorBoundaryProps,
  LazyErrorBoundaryState
> {
  state: LazyErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LazyErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // No-op — the error is typically a chunk load failure.
    // Next.js surfaces underlying errors in its own logging pipeline.
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <LazyLoadError onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

/**
 * Inline error fallback shown when a lazy-loaded chunk fails to download.
 * Matches the calm, minimal style used by other error states in the app.
 */
function LazyLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex min-h-[120px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-border/50 bg-muted/10 p-6 text-center"
      role="alert"
    >
      <p className="text-sm text-muted-foreground">
        Failed to load component. Check your connection and try again.
      </p>
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        <RotateCcw data-icon="inline-start" />
        Retry
      </Button>
    </div>
  );
}
