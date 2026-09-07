import { cn } from "@/lib/utils";

/** Rays of the assistant mark, in degrees. */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

/** One ray: a point at the rim, swelling to its widest near the hub. */
const RAY_PATH =
  "M12 1.9C12.66 5.4 13.1 8.2 13.1 9.9c0 .6-.5 1.3-1.1 2.1-.6-.8-1.1-1.5-1.1-2.1 0-1.7.44-4.5 1.1-8Z";

/**
 * The Requo assistant mark — a tapered asterisk burst.
 *
 * Owner-surface only: the customer-facing chat is branded with the business's
 * own logo, never with an assistant mark (see ADR 003).
 *
 * Paints in `currentColor`, so callers set the colour with a `text-*` class.
 */
export function AssistantMark({
  className,
  label,
}: {
  className?: string;
  /** Accessible name. Omit for decorative use (the default). */
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-6", className)}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": "true", focusable: "false" })}
    >
      {RAYS.map((angle) => (
        <path key={angle} d={RAY_PATH} transform={`rotate(${angle} 12 12)`} />
      ))}
    </svg>
  );
}
