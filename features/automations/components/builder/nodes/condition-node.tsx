"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, Filter } from "lucide-react";

import type { WorkflowNode } from "../hooks/use-workflow-state";

export function ConditionNode({ data, selected }: NodeProps<WorkflowNode>) {
  const hasErrors = data.errors && data.errors.length > 0;
  const config = data.config as { field?: string; operator?: string; value?: string } | undefined;
  const summary = config?.field
    ? `${config.field} ${config.operator ?? "is"} ${config.value ?? "…"}`
    : "Not configured";

  return (
    <div
      className={`w-64 rounded-xl border bg-surface-card shadow-sm transition-all ${
        selected ? "ring-2 ring-amber-500 shadow-md" : ""
      } ${hasErrors ? "border-destructive" : "border-border"}`}
    >
      {/* Category chip */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
        <div className="flex size-5 items-center justify-center rounded bg-amber-500/10 text-amber-600">
          <Filter className="size-3" />
        </div>
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-amber-600">
          Condition
        </span>
        {hasErrors && (
          <div className="ml-auto text-destructive" title={data.errors!.join("\n")}>
            <AlertCircle className="size-3.5" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex items-center gap-2.5 border-t border-border/50 px-3 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
          <Filter className="size-3.5" />
        </div>
        <span className="text-sm font-medium text-foreground">
          {data.label || "If / else"}
        </span>
      </div>

      {/* Branches */}
      <div className="flex justify-between border-t border-border/50 px-4 py-1.5 text-[0.65rem] text-muted-foreground">
        <span>True</span>
        <span>False</span>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !rounded-full !border-2 !border-border !bg-surface-card"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!-translate-x-6 !size-3 !rounded-full !border-2 !border-amber-500 !bg-surface-card"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!translate-x-6 !size-3 !rounded-full !border-2 !border-destructive !bg-surface-card"
      />
    </div>
  );
}
