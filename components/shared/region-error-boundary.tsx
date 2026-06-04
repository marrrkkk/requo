"use client";

import { Component, type ReactNode } from "react";

type RegionErrorBoundaryProps = {
  /** Fallback UI shown when the child region throws. */
  fallback: ReactNode;
  children: ReactNode;
};

type RegionErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Lightweight error boundary for independently-failing page regions.
 *
 * Wraps a `<Suspense>`-based data region so that if the child server
 * component throws (network error, auth failure, etc.) only that region
 * shows the fallback while the structural shell and sibling regions stay
 * rendered.
 */
export class RegionErrorBoundary extends Component<
  RegionErrorBoundaryProps,
  RegionErrorBoundaryState
> {
  state: RegionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RegionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // No-op — Next.js surfaces underlying errors in its logging pipeline.
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
