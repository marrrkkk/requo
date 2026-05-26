"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  AlertCircle,
  Inbox,
  CheckCircle2,
  Archive,
  FileText,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown,
  TimerOff,
  Briefcase,
  CircleCheck,
  Receipt,
  CreditCard,
  AlertTriangle,
  Bell,
  Clock,
  type LucideIcon,
} from "lucide-react";

import type { WorkflowNode } from "../hooks/use-workflow-state";

const triggerIcons: Record<string, LucideIcon> = {
  "inquiry.received": Inbox,
  "inquiry.qualified": CheckCircle2,
  "inquiry.archived": Archive,
  "quote.created": FileText,
  "quote.sent": Send,
  "quote.viewed": Eye,
  "quote.accepted": ThumbsUp,
  "quote.rejected": ThumbsDown,
  "quote.expired": TimerOff,
  "job.created": Briefcase,
  "job.completed": CircleCheck,
  "invoice.sent": Receipt,
  "invoice.paid": CreditCard,
  "invoice.overdue": AlertTriangle,
  "follow_up.due": Bell,
  "follow_up.overdue": Clock,
};

export function TriggerNode({ data, selected }: NodeProps<WorkflowNode>) {
  const hasErrors = data.errors && data.errors.length > 0;
  const config = data.config as { triggerType?: string } | undefined;
  const triggerType = config?.triggerType ?? "";
  const Icon = triggerIcons[triggerType] ?? Inbox;

  return (
    <div
      className={`w-64 rounded-xl border bg-card shadow-sm transition-all ${
        selected ? "ring-2 ring-primary shadow-md" : ""
      } ${hasErrors ? "border-destructive" : "border-border"}`}
    >
      {/* Category chip */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
        <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
          <svg className="size-3" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="4" cy="4" r="2" />
            <circle cx="12" cy="4" r="2" />
            <circle cx="4" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </div>
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
          Trigger
        </span>
        {hasErrors && (
          <div className="ml-auto text-destructive" title={data.errors!.join("\n")}>
            <AlertCircle className="size-3.5" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex items-center gap-2.5 border-t border-border/50 px-3 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
        <span className="text-sm font-medium text-foreground">
          {data.label || "Select trigger"}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !rounded-full !border-2 !border-primary !bg-card"
      />
    </div>
  );
}
