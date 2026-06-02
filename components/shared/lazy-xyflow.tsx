"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyErrorBoundary } from "@/components/shared/lazy-error-boundary";

/**
 * Skeleton placeholder for the workflow canvas.
 * Matches the full-size container (100% width and height) used by ReactFlow.
 * Adds < 2 KB JS and prevents CLS by reserving the entire canvas area.
 */
function WorkflowCanvasSkeleton() {
  return (
    <div className="relative flex size-full items-center justify-center bg-muted/10">
      {/* Canvas grid background hint */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="size-full"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Placeholder nodes */}
      <div className="relative flex flex-col items-center gap-6">
        <Skeleton className="h-12 w-40 rounded-lg" />
        <Skeleton className="h-1 w-px rounded-full" style={{ height: 24 }} />
        <Skeleton className="h-12 w-40 rounded-lg" />
        <Skeleton className="h-1 w-px rounded-full" style={{ height: 24 }} />
        <Skeleton className="h-12 w-40 rounded-lg" />
      </div>

      {/* Toolbar skeleton */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2">
        <Skeleton className="h-10 w-64 rounded-lg" />
      </div>

      {/* MiniMap skeleton */}
      <div className="absolute bottom-3 right-3">
        <Skeleton className="h-20 w-28 rounded-md" />
      </div>
    </div>
  );
}

// ssr: false — @xyflow/react uses browser DOM APIs (drag events, ResizeObserver, pointer capture) for canvas interaction
const InternalWorkflowCanvas = dynamic(
  () =>
    import("@/features/automations/components/builder/workflow-canvas").then(
      (mod) => mod.WorkflowCanvas
    ),
  { ssr: false, loading: () => <WorkflowCanvasSkeleton /> }
);

// ssr: false — @xyflow/react uses browser DOM APIs (drag events, ResizeObserver, pointer capture) for canvas interaction
const InternalAutomationsWorkspace = dynamic(
  () =>
    import("@/features/automations/components/workspace").then(
      (mod) => mod.AutomationsWorkspace
    ),
  { ssr: false, loading: () => <WorkflowCanvasSkeleton /> }
);

/**
 * Lazy-loaded WorkflowCanvas — only downloads @xyflow/react when rendered.
 * Wrapped in an error boundary that catches chunk download failures and
 * offers a retry button to re-attempt the import.
 */
export function LazyWorkflowCanvas(
  props: ComponentProps<typeof InternalWorkflowCanvas>
) {
  return (
    <LazyErrorBoundary>
      <InternalWorkflowCanvas {...props} />
    </LazyErrorBoundary>
  );
}

/**
 * Lazy-loaded AutomationsWorkspace — only downloads @xyflow/react when rendered.
 * Wrapped in an error boundary that catches chunk download failures and
 * offers a retry button to re-attempt the import.
 */
export function LazyAutomationsWorkspace(
  props: ComponentProps<typeof InternalAutomationsWorkspace>
) {
  return (
    <LazyErrorBoundary>
      <InternalAutomationsWorkspace {...props} />
    </LazyErrorBoundary>
  );
}

export { WorkflowCanvasSkeleton };
