"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  CalendarClock,
  Receipt,
  AlertTriangle,
  Loader2,
  ArrowRight,
  X,
  RefreshCw,
} from "lucide-react";

import {
  validateAiActionProposal,
  type AiActionType,
  type CreateQuotePayload,
} from "@/features/ai/action-proposal-schemas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// AI Action Button
//
// Renders a confirmable action card inline in the AI chat when the assistant
// proposes a write action. The user must click "Confirm" to execute, or
// "Decline" to dismiss the proposal.
// ---------------------------------------------------------------------------

export type AiActionProposal = {
  action: AiActionType;
  businessId: string;
  businessSlug: string;
  payload: Record<string, unknown>;
};

type AiActionButtonProps = {
  proposal: AiActionProposal;
  onDecline?: () => void;
};

type ActionState = "idle" | "executing" | "success" | "error" | "declined";

const actionMeta: Record<
  AiActionProposal["action"],
  { label: string; description: string; icon: typeof FileText; color: string; iconColor: string }
> = {
  create_inquiry: {
    label: "Create Inquiry",
    description: "Add a new inquiry to your pipeline",
    icon: FileText,
    color: "",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  create_quote: {
    label: "Create Quote",
    description: "Generate a new quote for this customer",
    icon: Receipt,
    color: "",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  create_follow_up: {
    label: "Schedule Follow-up",
    description: "Set a reminder to follow up",
    icon: CalendarClock,
    color: "",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  update_inquiry_status: {
    label: "Update Status",
    description: "Change the inquiry status",
    icon: FileText,
    color: "",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
};

type SummaryField = { label: string; value: string; wide?: boolean };

function getProposalFields(
  action: AiActionType,
  payload: Record<string, unknown>,
): SummaryField[] {
  const fields: SummaryField[] = [];

  switch (action) {
    case "create_inquiry": {
      fields.push({ label: "Customer", value: String(payload.customerName ?? "") });
      if (payload.customerEmail) {
        fields.push({ label: "Email", value: String(payload.customerEmail) });
      }
      fields.push({ label: "Category", value: String(payload.serviceCategory ?? "") });
      fields.push({
        label: "Contact",
        value: `${String(payload.customerContactMethod ?? "")} · ${String(payload.customerContactHandle ?? "")}`,
        wide: true,
      });
      const details = String(payload.details ?? "");
      if (details) {
        fields.push({
          label: "Details",
          value: details.length > 100 ? `${details.slice(0, 100)}...` : details,
          wide: true,
        });
      }
      break;
    }
    case "create_quote": {
      const quotePayload = payload as CreateQuotePayload;
      fields.push({ label: "Title", value: String(quotePayload.title ?? "") });
      fields.push({ label: "Customer", value: String(quotePayload.customerName ?? "") });
      fields.push({ label: "Valid until", value: String(quotePayload.validUntil ?? "") });
      const items = quotePayload.items;
      if (items?.length) {
        fields.push({
          label: "Line items",
          value: `${items.length} item${items.length > 1 ? "s" : ""}`,
        });
        const totalCents =
          items.reduce(
            (sum, item) => sum + item.quantity * item.unitPriceInCents,
            0,
          ) - (quotePayload.discountInCents ?? 0);
        fields.push({ label: "Total", value: `$${(totalCents / 100).toFixed(2)}` });
      }
      break;
    }
    case "create_follow_up": {
      fields.push({ label: "Title", value: String(payload.title) });
      fields.push({ label: "Channel", value: String(payload.channel) });
      fields.push({ label: "Due", value: String(payload.dueDate) });
      if (payload.reason) {
        const reason = String(payload.reason);
        fields.push({ label: "Reason", value: reason.length > 80 ? reason.slice(0, 80) + "..." : reason, wide: true });
      }
      break;
    }
    case "update_inquiry_status": {
      fields.push({ label: "New status", value: String(payload.status) });
      if (payload.reason) fields.push({ label: "Reason", value: String(payload.reason), wide: true });
      break;
    }
  }

  return fields;
}

export function AiActionButton({ proposal, onDecline }: AiActionButtonProps) {
  const [state, setState] = useState<ActionState>("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validation = useMemo(
    () => validateAiActionProposal(proposal),
    [proposal],
  );

  const confirmedProposal = useMemo(() => {
    if (!validation.ok) {
      return null;
    }

    return {
      ...proposal,
      payload: validation.payload,
    };
  }, [proposal, validation]);

  const meta = actionMeta[proposal.action];
  const Icon = meta.icon;
  const fields = confirmedProposal
    ? getProposalFields(confirmedProposal.action, confirmedProposal.payload)
    : getProposalFields(proposal.action, proposal.payload);

  const handleConfirm = useCallback(async () => {
    if (!confirmedProposal) {
      return;
    }

    setState("executing");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessSlug: confirmedProposal.businessSlug,
          action: confirmedProposal.action,
          payload: confirmedProposal.payload,
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
  }, [confirmedProposal]);

  const handleDecline = useCallback(() => {
    setState("declined");
    onDecline?.();
  }, [onDecline]);

  if (state === "declined") {
    return (
      <div className="my-2 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-2.5">
        <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">
          {meta.label} declined
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "my-3 overflow-hidden rounded-xl border border-border/80 bg-card shadow-md transition-all",
        meta.color,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
        <div className={cn("flex size-8 items-center justify-center rounded-lg bg-muted/60", meta.iconColor)}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-tight">{meta.label}</p>
          <p className="text-[0.7rem] text-muted-foreground leading-tight mt-0.5">{meta.description}</p>
        </div>
      </div>

      {/* Summary fields */}
      <div className="px-4 py-3">
        {!validation.ok ? (
          <div
            className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
            role="alert"
          >
            <p className="text-xs font-medium text-destructive">
              This draft has invalid data
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Ask the assistant to fix the draft and try again. Confirm is
              disabled until the fields below pass validation.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-destructive">
              {validation.issues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>
                  <span className="font-medium">{issue.field}:</span>{" "}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {fields.map((field, i) => (
            <div key={i} className={cn(field.wide && "col-span-2")}>
              <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                {field.label}
              </div>
              <div className="mt-0.5 text-xs text-foreground">
                {field.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions footer */}
      <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2.5 bg-muted/20">
        {state === "idle" ? (
          <>
            <Button
              size="sm"
              onClick={handleConfirm}
              type="button"
              disabled={!validation.ok}
              className="gap-1.5 h-7 text-xs"
            >
              Confirm
              <ArrowRight className="size-3" aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDecline}
              type="button"
              className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" aria-hidden="true" />
              Decline
            </Button>
          </>
        ) : state === "executing" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            <span>Creating...</span>
          </div>
        ) : state === "success" ? (
          <div className="flex items-center gap-2 py-0.5">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            <span className="text-xs font-medium text-foreground">
              {resultMessage}
            </span>
            {resultUrl ? (
              <a
                href={resultUrl}
                className="ml-1 text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
              >
                View →
              </a>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-0.5">
            <AlertTriangle className="size-3.5 text-destructive" aria-hidden="true" />
            <span className="text-xs text-destructive">{errorMessage}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleConfirm}
              type="button"
              className="gap-1.5 h-7 text-xs ml-1"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              Retry
            </Button>
          </div>
        )}
      </div>
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
      if (!parsed.action || !parsed.businessSlug || !parsed.payload) {
        continue;
      }

      proposals.push(parsed);
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
