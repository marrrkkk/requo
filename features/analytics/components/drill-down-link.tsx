import Link from "next/link";
import type { ReactNode } from "react";

export type DrillDownLinkProps = {
  href: string; // pre-built filtered list URL
  enabled: boolean; // false for rate/percentage metrics
  children: ReactNode;
};

/**
 * Wraps metric card content in a navigational link when the metric represents
 * a countable record set (e.g., "Stale inquiries: 5", "Quotes sent: 12").
 *
 * For rate/percentage metrics, the wrapper renders children without a link.
 * Adds subtle hover styling to indicate clickability when enabled.
 */
export function DrillDownLink({ href, enabled, children }: DrillDownLinkProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Link
      href={href}
      className="group/drill-down block rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}
