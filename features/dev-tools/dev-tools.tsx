"use client";

import dynamic from "next/dynamic";

// Client-only: dev panel uses browser APIs and should never SSR.
const DevToolsPanel = dynamic(
  () =>
    import("./dev-tools-panel").then((mod) => ({
      default: mod.DevToolsPanel,
    })),
  { ssr: false },
);

/**
 * Conditionally renders the dev tools panel in development only.
 * This component is safe to include in the root layout — it renders
 * nothing in production.
 */
export function DevTools() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <DevToolsPanel />;
}
