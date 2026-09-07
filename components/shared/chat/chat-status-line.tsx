import { cn } from "@/lib/utils";

/**
 * The single in-progress line shown while a turn runs — "Thinking…", or the
 * label of the tool currently executing. The text shimmers; under
 * `prefers-reduced-motion` it falls back to static muted text.
 */
export function ChatStatusLine({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <p
      aria-live="polite"
      className={cn("text-sm font-medium", className)}
      role="status"
    >
      <span className="text-shimmer">{label}…</span>
    </p>
  );
}
