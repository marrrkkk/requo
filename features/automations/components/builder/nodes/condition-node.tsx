"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, GitBranch } from "lucide-react";

import type { WorkflowNode } from "../hooks/use-workflow-state";

export function ConditionNode({ data, selected }: NodeProps<WorkflowNode>) {
  const hasErrors = data.errors && data.errors.length > 0;

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
        <div className="flex size-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
          <GitBranch className="size-4" />
        </div>
        <div className="text-sm font-medium">{data.label || "Condition"}</div>
        {hasErrors && (
          <div className="ml-auto text-destructive" title={data.errors!.join("\n")}>
            <AlertCircle className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>True</span>
        <span>False</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!-translate-x-4 !size-3 !border-2 !border-primary !bg-surface-card"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!translate-x-4 !size-3 !border-2 !border-destructive !bg-surface-card"
      />
    </div>
  );
}
