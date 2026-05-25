"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, Zap } from "lucide-react";

import type { WorkflowNode } from "../hooks/use-workflow-state";

export function TriggerNode({ data, selected }: NodeProps<WorkflowNode>) {
  const hasErrors = data.errors && data.errors.length > 0;

  return (
    <div
      className={`rounded-lg border bg-surface-card px-4 py-3 shadow-sm transition-shadow ${
        selected ? "ring-2 ring-primary" : ""
      } ${hasErrors ? "border-destructive" : ""}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Zap className="size-4" />
        </div>
        <div className="text-sm font-medium">{data.label || "Trigger"}</div>
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
