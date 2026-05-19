"use client";

import { useCallback, useState } from "react";
import {
  CheckCircle2,
  FileText,
  CalendarClock,
  Receipt,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// AI Action Button
//
// Renders a confirmable action card inline in the AI chat when the assistant
// proposes a write action. The user must click "Confirm" to execute.
// ---------------------------------------------------------------------------

export type AiActionProposal = {
  action: "create_inquiry" | "create_quote" | "create_follow_up" | "update_inquiry_status";
  businessId: string;
  businessSlug: string;
  payload: Record<string, unknown>;
};

type AiActionButtonProps = {
  proposal: AiActionProposal;
};

type ActionState = "idle" | "executing" | "success" | "error";

const actionMeta: Record<
  AiActionProposal["action"],
  { label: string; icon: typeof FileText; color: string }
> = {
  create_inquiry: {
    label: "Create Inquiry",
    icon: FileText,
    color: "border-blue-200/80 bg-blue-50/80 dark:border-blue-800/50 dark:bg-blue-950/30",
  },
  create_quote: {
    label: "Create Quote",
    icon: Receipt,
    color: "border-purple-200/80 bg-purple-50/80 dark:border-purple-800/50 dark:bg-purple-950/30",
  },
  create_follow_up: {
    label: "Schedule Follow-up",
    icon: CalendarClock,
    color: "border-orange-200/80 bg-orange-50/80 dark:border-orange-800/50 dark:bg-orange-950/30",
  },
  update_inquiry_status: {
    label: "Update Status",
    icon: FileText,
    color: "border-teal-200/80 bg-teal-50/80 dark:border-teal-800/50 dark:bg-teal-950/30",
  },
};

function getProposalSummary(proposal: AiActionProposal): string[] {
  const { action, payload } = proposal;
  const lines: string[] = [];

  switch (action) {
    case "create_inquiry": {
      lines.push(`Customer: ${payload.customerName}`);
      if (payload.customerEmail) lines.push(`Email: ${payload.customerEmail}`);
      lines.push(`Category: ${payload.serviceCategory}`);
      const details = String(payload.details ?? "");
      if (details.length > 80) {
        lines.push(`Details: ${details.slice(0, 80)}...`);
      } else if (details) {
        lines.push(`Details: ${details}`);
      }
      break;
    }
    case "create_quote": {
      lines.push(`Title: ${payload.title}`);
      lines.push(`Customer: ${payload.customerName}`);
      const items = payload.items as Array<{ description: string; quantity: number; unitPriceInCents: number }> | undefined;
      if (items?.length) {
        lines.push(`Items: ${items.length} line item${items.length > 1 ? "s" : ""}`);
        const totalCents = items.reduce((sum, i) => sum + i.quantity * i.unitPriceInCents, 0) - (Number(payload.discountInCents) || 0);
        lines.push(`Total: $${(totalCents / 100).toFixed(2)}`);
      }
      break;
    }
    case "create_follow_up": {
      lines.push(`Title: ${payload.title}`);
      lines.push(`Channel: ${payload.channel}`);
      lines.push(`Due: ${payload.dueDate}`);
      if (payload.reason) {
        const reason = String(payload.reason);
        lines.push(`Reason: ${reason.length > 60 ? reason.slice(0, 60) + "..." : reason}`);
      }
      break;
    }
    case "update_inquiry_status": {
      lines.push(`New status: ${payload.status}`);
      if (payload.reason) lines.push(`Reason: ${payload.reason}`);
      break;
    }
  }

  return lines;
}

export function AiActionButton({ proposal }: AiActionButtonProps) {
  const [state, setState] = useState<ActionState>("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const meta = actionMeta[proposal.action];
  const Icon = meta.icon;
  const summaryLines = getProposalSummary(proposal);

  const handleConfirm = useCallback(async () => {
    setState("executing");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessSlug: proposal.businessSlug,
          action: proposal.action,
          payload: proposal.payload,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.error ?? "Action failed. Please try again.");
        setState("error");
        return;
      }

      const data = await response.json();
      setResultMessage(data.message ?? "Done.");
      setResultUrl(data.entityUrl ?? null);
      setState("success");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setState("error");
    }
  }, [proposal]);

  return (
    <div
      className={cn(
        "my-2 rounded-xl border p-4 transition-colors",
        meta.color,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-4 shrink-0 text-foreground/70" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">{meta.label}</span>
      </div>

      {/* Summary */}
      <div className="mb-3 space-y-0.5">
        {summaryLines.map((line, i) => (
          <p key={i} className="text-xs text-foreground/80 leading-5">
            {line}
          </p>
        ))}
      </div>

      {/* Actions */}
      {state === "idle" ? (
        <Button
          size="sm"
          onClick={handleConfirm}
          type="button"
          className="gap-1.5"
        >
          Confirm
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      ) : state === "executing" ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          <span>Executing...</span>
        </div>
      ) : state === "success" ? (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" aria-hidden="true" />
          <span className="text-xs font-medium text-green-700 dark:text-green-300">
            {resultMessage}
          </span>
          {resultUrl ? (
            <a
              href={resultUrl}
              className="ml-2 text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              View →
            </a>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
            <span className="text-xs text-destructive">{errorMessage}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleConfirm}
            type="button"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parser — extracts action proposals from message content
// ---------------------------------------------------------------------------

const ACTION_PROPOSAL_REGEX = /\[ACTION_PROPOSAL\]([\s\S]*?)\[\/ACTION_PROPOSAL\]/g;

export function parseActionProposals(content: string): AiActionProposal[] {
  const proposals: AiActionProposal[] = [];
  let match: RegExpExecArray | null;

  while ((match = ACTION_PROPOSAL_REGEX.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as AiActionProposal;
      if (parsed.action && parsed.businessSlug && parsed.payload) {
        proposals.push(parsed);
      }
    } catch {
      // Skip malformed proposals
    }
  }

  // Reset regex lastIndex for future calls
  ACTION_PROPOSAL_REGEX.lastIndex = 0;

  return proposals;
}

/**
 * Strips action proposal blocks from message content for display purposes.
 * The content without proposals is rendered as markdown, and proposals are
 * rendered as interactive buttons separately.
 * Also strips incomplete/partial proposal blocks that may appear during streaming.
 */
export function stripActionProposals(content: string): string {
  // Strip complete blocks
  let result = content.replace(ACTION_PROPOSAL_REGEX, "");
  // Strip incomplete opening block that hasn't closed yet (during streaming)
  const partialOpenIndex = result.lastIndexOf("[ACTION_PROPOSAL]");
  if (partialOpenIndex !== -1 && !result.slice(partialOpenIndex).includes("[/ACTION_PROPOSAL]")) {
    result = result.slice(0, partialOpenIndex);
  }
  return result.trim();
}
