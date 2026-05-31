import { cn } from "@/lib/utils";

/**
 * Lightweight CSS-only dot pattern for the marketing hero.
 *
 * Unlike the full DotPattern component (which is a "use client" component
 * using motion/react, ResizeObserver, and dynamic SVG circle generation),
 * this renders a single static SVG `<pattern>` — zero JavaScript, zero
 * hydration, and dramatically lower paint cost.
 */
export function MarketingDotPattern({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-neutral-400/80",
        className,
      )}
    >
      <defs>
        <pattern
          id="marketing-dot-pattern"
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="url(#marketing-dot-pattern)"
      />
    </svg>
  );
}
