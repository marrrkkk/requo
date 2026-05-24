"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Layers,
  Play,
  Square,
  Eye,
  EyeOff,
  RotateCcw,
  Copy,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*  Skeleton Debugger Tab                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Forces the app's loading/skeleton states to show by injecting a global
 * Suspense-simulation overlay and providing controls to test skeleton UI.
 *
 * Features:
 * - Toggle skeleton overlay on the current page
 * - Show skeleton with configurable delay (simulate slow data)
 * - Highlight all Skeleton components on the page
 * - Navigate to any route's loading state
 */
export function SkeletonTab() {
  const [skeletonMode, setSkeletonMode] = useState(false);
  const [highlightSkeletons, setHighlightSkeletons] = useState(false);
  const [simulatedDelay, setSimulatedDelay] = useState(0);
  const [skeletonCount, setSkeletonCount] = useState(0);

  // Count skeleton elements on page
  const countSkeletons = useCallback(() => {
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    setSkeletonCount(skeletons.length);
    return skeletons.length;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs DOM observation state
    countSkeletons();
    const observer = new MutationObserver(() => countSkeletons());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [countSkeletons]);

  // Highlight skeleton elements
  useEffect(() => {
    const styleId = "dev-skeleton-highlight";
    if (highlightSkeletons) {
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          [data-slot="skeleton"] {
            outline: 2px dashed rgba(139, 92, 246, 0.7) !important;
            outline-offset: 2px;
            position: relative;
          }
          [data-slot="skeleton"]::after {
            content: "skeleton";
            position: absolute;
            top: -16px;
            left: 0;
            font-size: 9px;
            font-family: monospace;
            background: rgba(139, 92, 246, 0.9);
            color: white;
            padding: 1px 4px;
            border-radius: 2px;
            pointer-events: none;
            z-index: 99999;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      document.getElementById(styleId)?.remove();
    }
    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [highlightSkeletons]);

  // Force loading state via navigation with skeleton param
  const forceLoadingState = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_skeleton", "true");
    url.searchParams.set("_delay", String(simulatedDelay));
    window.location.href = url.toString();
  };

  const clearSkeletonParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("_skeleton");
    url.searchParams.delete("_delay");
    window.history.replaceState(null, "", url.toString());
    toast.success("Cleared skeleton params");
  };

  const copySkeletonMarkup = () => {
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    const info = Array.from(skeletons).map((el) => {
      const rect = el.getBoundingClientRect();
      return `Skeleton: ${Math.round(rect.width)}×${Math.round(rect.height)}px at (${Math.round(rect.x)}, ${Math.round(rect.y)})`;
    });
    navigator.clipboard.writeText(info.join("\n"));
    toast.success(`Copied info for ${info.length} skeletons`);
  };

  const hasSkeletonParam = typeof window !== "undefined" &&
    new URL(window.location.href).searchParams.has("_skeleton");

  return (
    <div className="space-y-3">
      {/* Status */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            <Layers className="size-3" />
            Skeleton Status
          </div>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {skeletonCount} on page
          </Badge>
        </div>
        {hasSkeletonParam && (
          <div className="rounded-md bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-600 dark:text-violet-400">
            Skeleton mode active via URL param
          </div>
        )}
      </section>

      {/* Highlight & Inspect */}
      <section className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Inspect Skeletons
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant={highlightSkeletons ? "default" : "outline"}
            size="xs"
            onClick={() => setHighlightSkeletons(!highlightSkeletons)}
            className="gap-1.5"
          >
            {highlightSkeletons ? (
              <Eye className="size-3" />
            ) : (
              <EyeOff className="size-3" />
            )}
            Highlight
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={copySkeletonMarkup}
            className="gap-1.5"
          >
            <Copy className="size-3" />
            Copy Info
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => countSkeletons()}
            className="gap-1.5"
          >
            <RotateCcw className="size-3" />
            Recount
          </Button>
        </div>
      </section>

      {/* Simulate Loading */}
      <section className="space-y-1.5">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Simulate Loading
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground whitespace-nowrap">
              Delay:
            </label>
            <select
              value={simulatedDelay}
              onChange={(e) => setSimulatedDelay(Number(e.target.value))}
              className="h-6 flex-1 rounded border border-border bg-background px-2 text-[11px]"
            >
              <option value={0}>No delay</option>
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s (stress test)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={forceLoadingState}
              className="gap-1.5"
            >
              <Play className="size-3" />
              Show Skeleton
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={clearSkeletonParam}
              disabled={!hasSkeletonParam}
              className="gap-1.5"
            >
              <Square className="size-3" />
              Clear
            </Button>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="border-t border-border/40 pt-2">
        <div className="rounded-md bg-muted/40 px-2.5 py-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Tip:</strong> Add{" "}
          <code className="rounded bg-muted px-1 font-mono">?_skeleton=true</code>{" "}
          to any route URL to force its loading state. Use the highlight tool to
          verify skeleton placement matches real layout.
        </div>
      </section>
    </div>
  );
}
