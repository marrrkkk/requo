"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, Clock } from "lucide-react";

import type { WorkflowNode } from "../hooks/use-workflow-state";

export function DelayNode({ data, selected }: NodeProps<WorkflowNode>) {
  const hasErrors = data.errors && data.errors.length > 0;
  const config = data.config as
    | { unit?: string; value?: number }
    | undefined;
  const duration =
    config?.value && config?.unit
      ? `${config.value} ${config.unit}`
      : "Not configured";

  return (
    <div
      className={`rounded-lg border bg-surface-card px-4 py-3 shadow-sm transition-shadow ${
        selected ? "ring-2 ring-primary" : ""
      } ${hasErrors ? "border-destructive" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-border !bg-surface-card"
      />
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
          <Clock className="size-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{data.label || "Delay"}</div>
          <div className="text-xs text-muted-foreground">{duration}</div>
        </div>
        {hasErrors && (
          <div className="ml-auto text-destructive" title={data.errors!.join("\n")}>
            <AlertCircle className="size-4" />
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !border-2 !border-primary !bg-surface-card"
      />
    </div>
  );
}
