"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, Clock } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WorkflowNode } from "../hooks/use-workflow-state";

export function DelayNode({ data, selected }: NodeProps<WorkflowNode>) {
  const hasErrors = data.errors && data.errors.length > 0;
  const config = data.config as { unit?: string; value?: number } | undefined;
  const duration =
    config?.value && config?.unit
      ? `Wait ${config.value} ${config.unit}`
      : "Not configured";

  return (
    <div
      className={`w-64 rounded-xl border bg-card shadow-sm transition-all ${
        selected ? "ring-2 ring-blue-500 shadow-md" : ""
      } ${hasErrors ? "border-destructive" : "border-border"}`}
    >
      {/* Category chip */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
        <div className="flex size-5 items-center justify-center rounded bg-blue-500/10 text-blue-600">
          <Clock className="size-3" />
        </div>
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-blue-600">
          Delay
        </span>
        {hasErrors && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="ml-auto text-destructive">
                <AlertCircle className="size-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs whitespace-pre-wrap">{data.errors!.join("\n")}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Body */}
      <div className="flex items-center gap-2.5 border-t border-border/50 px-3 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
          <Clock className="size-3.5" />
        </div>
        <span className="text-sm font-medium text-foreground">
          {data.label || "Delay"}
        </span>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !rounded-full !border-2 !border-border !bg-card"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !rounded-full !border-2 !border-blue-500 !bg-card"
      />
    </div>
  );
}
