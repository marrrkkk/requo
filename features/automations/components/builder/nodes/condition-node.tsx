"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertCircle, Filter, CircleDot, CircleDashed } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "../hooks/use-workflow-state";
import { getConditionSummary } from "../../workspace/definitions";

export function ConditionNode({ data, selected }: NodeProps<WorkflowNode>) {
  const hasErrors = data.errors && data.errors.length > 0;
  const config = data.config as Record<string, unknown> | undefined;

  const summary = config ? getConditionSummary(config) : "Not configured";

  const trueBranch = config?.trueBranch as unknown[] | undefined;
  const falseBranch = config?.falseBranch as unknown[] | undefined;
  const trueCount = trueBranch?.length ?? 0;
  const falseCount = falseBranch?.length ?? 0;

  return (
    <div
      className={`w-64 rounded-xl border bg-card shadow-sm transition-all ${
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

      {/* Body — human-readable summary */}
      <div className="flex items-center gap-2.5 border-t border-border/50 px-3 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
          <Filter className="size-3.5" />
        </div>
        <span className="truncate text-sm font-medium text-foreground">
          {summary}
        </span>
      </div>

      {/* Branches */}
      <div className="flex justify-between border-t border-border/50 px-3 py-1.5">
        <div className="flex items-center gap-1">
          {trueCount > 0 ? (
            <CircleDot className="size-2.5 text-emerald-600" />
          ) : (
            <CircleDashed className="size-2.5 text-muted-foreground/40" />
          )}
          <span className={cn(
            "text-[0.65rem]",
            trueCount > 0 ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
          )}>
            True{trueCount > 0 ? ` (${trueCount})` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn(
            "text-[0.65rem]",
            falseCount > 0 ? "font-medium text-red-700 dark:text-red-400" : "text-muted-foreground",
          )}>
            False{falseCount > 0 ? ` (${falseCount})` : ""}
          </span>
          {falseCount > 0 ? (
            <CircleDot className="size-2.5 text-red-500" />
          ) : (
            <CircleDashed className="size-2.5 text-muted-foreground/40" />
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !rounded-full !border-2 !border-border !bg-card"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!-translate-x-6 !size-3 !rounded-full !border-2 !border-emerald-500 !bg-card"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!translate-x-6 !size-3 !rounded-full !border-2 !border-red-500 !bg-card"
      />
    </div>
  );
}
