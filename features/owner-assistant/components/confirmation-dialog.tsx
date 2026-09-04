"use client";

import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConfirmationRequiredResult } from "@/features/owner-assistant/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfirmationDialogProps {
  /** The pending confirmation result from the assistant */
  result: ConfirmationRequiredResult | null;
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the user clicks Confirm */
  onConfirm: (confirmationId: string) => void;
  /** Called when the user dismisses or clicks Cancel */
  onCancel: (confirmationId: string) => void;
}

// ---------------------------------------------------------------------------
// Operation parameter display helpers
// ---------------------------------------------------------------------------

/** Human-readable labels for known operation parameter keys */
const PARAM_LABELS: Record<string, string> = {
  quoteId: "Quote",
  inquiryId: "Inquiry",
  newStatus: "New status",
  deliveryMethod: "Delivery method",
  customerEmail: "Customer email",
  customerName: "Customer name",
  emailTemplate: "Email template",
  customMessage: "Custom message",
  scheduledFor: "Scheduled for",
  message: "Message",
  autoSend: "Auto send",
  reminderDays: "Reminder days",
};

function formatParamValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    // Format ISO dates
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        });
      } catch {
        return value;
      }
    }
    return value;
  }
  return String(value);
}

/** Entries to show in the parameter table */
function getDisplayedParams(
  parameters: Record<string, unknown>,
): Array<{ label: string; value: string }> {
  return Object.entries(parameters)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) => ({
      label: PARAM_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").toLowerCase(),
      value: formatParamValue(key, value),
    }))
    .slice(0, 8); // cap at 8 rows to keep the dialog compact
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ConfirmationDialog
 *
 * Shown before executing high-risk assistant operations (e.g. sending a
 * quote, archiving an inquiry). Displays the operation name, parameters,
 * and a risk warning before asking the user to confirm.
 */
export function ConfirmationDialog({
  result,
  open,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!result) return null;

  const displayedParams = getDisplayedParams(result.parameters);

  const handleConfirm = () => {
    onConfirm(result.confirmationId);
  };

  const handleCancel = () => {
    onCancel(result.confirmationId);
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {/* Risk warning icon */}
          <div
            className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-amber-100 sm:mx-0 dark:bg-amber-900/30"
            aria-hidden="true"
          >
            <AlertTriangle className="size-5 text-amber-700 dark:text-amber-400" />
          </div>

          <AlertDialogTitle>Confirm: {result.operation}</AlertDialogTitle>
          <AlertDialogDescription>
            {result.confirmationPrompt}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Operation parameters */}
        {displayedParams.length > 0 && (
          <div className="rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
            <p className="mb-2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Operation details
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              {displayedParams.map(({ label, value }) => (
                <div key={label} className="contents">
                  <dt className="text-xs font-medium text-muted-foreground capitalize">
                    {label}
                  </dt>
                  <dd className="text-xs text-foreground truncate">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Risk warning */}
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm",
            "border border-amber-200/80 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/30",
          )}
          role="alert"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <span className="text-amber-900 dark:text-amber-200 leading-5">
            This action cannot be easily undone. Review the details above before
            confirming.
          </span>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              variant="default"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
