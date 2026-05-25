"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, Play } from "lucide-react";

import type { WorkflowNode } from "../hooks/use-workflow-state";

export function ActionNode({ data, selected }: NodeProps<WorkflowNode>) {
  const hasErrors = data.errors && data.errors.length > 0;
  const config = data.config as
    | { actionType?: string; summary?: string }
    | undefined;
  const summary = config?.summary || config?.actionType || "Not configured";

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
        <div className="flex size-8 items-center justify-center rounded-md bg-green-500/10 text-green-600">
          <Play className="size-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{data.label || "Action"}</div>
          <div className="text-xs text-muted-foreground">{summary}</div>
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
