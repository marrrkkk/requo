"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  AlertCircle,
  Bell,
  Mail,
  ArrowRightLeft,
  Archive,
  Briefcase,
  Receipt,
  FileText,
  CalendarPlus,
  Play,
  StickyNote,
  Copy,
  type LucideIcon,
} from "lucide-react";

import type { WorkflowNode } from "../hooks/use-workflow-state";

const actionIcons: Record<string, LucideIcon> = {
  create_follow_up: CalendarPlus,
  send_notification: Bell,
  send_email: Mail,
  update_inquiry_status: ArrowRightLeft,
  update_quote_status: ArrowRightLeft,
  archive_inquiry: Archive,
  create_job_from_quote: Briefcase,
  generate_invoice: Receipt,
  generate_draft_quote: FileText,
  add_internal_note: StickyNote,
  duplicate_quote: Copy,
};

export function ActionNode({ data, selected }: NodeProps<WorkflowNode>) {
  const hasErrors = data.errors && data.errors.length > 0;
  const config = data.config as { actionType?: string } | undefined;
  const actionType = config?.actionType ?? "";
  const Icon = actionIcons[actionType] ?? Play;

  return (
    <div
      className={`w-64 rounded-xl border bg-card shadow-sm transition-all ${
        selected ? "ring-2 ring-green-500 shadow-md" : ""
      } ${hasErrors ? "border-destructive" : "border-border"}`}
    >
      {/* Category chip */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
        <div className="flex size-5 items-center justify-center rounded bg-green-500/10 text-green-600">
          <Play className="size-3" />
        </div>
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-green-600">
          Action
        </span>
        {hasErrors && (
          <div className="ml-auto text-destructive" title={data.errors!.join("\n")}>
            <AlertCircle className="size-3.5" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex items-center gap-2.5 border-t border-border/50 px-3 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-green-500/10 text-green-600">
          <Icon className="size-3.5" />
        </div>
        <span className="text-sm font-medium text-foreground">
          {data.label || "Select action"}
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
        className="!size-3 !rounded-full !border-2 !border-green-500 !bg-card"
      />
    </div>
  );
}
