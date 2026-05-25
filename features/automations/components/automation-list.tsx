"use client";

import { useOptimistic, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Zap,
  MoreHorizontal,
  Plus,
  Copy,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { UsageLimitBanner } from "@/features/paywall/components/usage-limit-banner";
import type { AutomationListItem, AutomationStats } from "../queries";
import { toggleAutomation, deleteAutomation, duplicateAutomation } from "../mutations";
import type { BusinessPlan } from "@/lib/plans/plans";

// ---------------------------------------------------------------------------
// Trigger & Action Label Helpers
// ---------------------------------------------------------------------------

const triggerLabels: Record<string, string> = {
  "inquiry.received": "Inquiry received",
  "inquiry.qualified": "Inquiry qualified",
  "inquiry.archived": "Inquiry archived",
  "quote.created": "Quote created",
  "quote.sent": "Quote sent",
  "quote.viewed": "Quote viewed",
  "quote.accepted": "Quote accepted",
  "quote.rejected": "Quote rejected",
  "quote.expired": "Quote expired",
  "job.created": "Job created",
  "job.completed": "Job completed",
  "invoice.sent": "Invoice sent",
  "invoice.paid": "Invoice paid",
  "invoice.overdue": "Invoice overdue",
  "follow_up.due": "Follow-up due",
  "follow_up.overdue": "Follow-up overdue",
};

function getTriggerLabel(triggerType: string): string {
  return triggerLabels[triggerType] ?? triggerType;
}

function getActionSummary(automation: AutomationListItem): string {
  // The list item doesn't include full action details, so we show a generic summary
  return "Automated action";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AutomationListProps = {
  automations: AutomationListItem[];
  stats: AutomationStats;
  plan: BusinessPlan;
  limit: number;
  businessSlug: string;
  presetsHref: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AutomationList({
  automations,
  stats,
  plan,
  limit,
  businessSlug,
  presetsHref,
}: AutomationListProps) {
  if (automations.length === 0) {
    return (
      <AutomationEmptyState
        presetsHref={presetsHref}
        businessSlug={businessSlug}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <UsageLimitBanner
        label="Active automations"
        current={stats.activeCount}
        limit={limit}
        plan={plan}
      />

      <DashboardSection
        title="Automations"
        description="Event-driven rules that automate your workflow."
        action={
          <Button asChild size="sm">
            <Link href={presetsHref}>
              <Plus data-icon="inline-start" />
              New automation
            </Link>
          </Button>
        }
      >
        <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
          {automations.map((automation) => (
            <AutomationRow key={automation.id} automation={automation} />
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Automation Row
// ---------------------------------------------------------------------------

function AutomationRow({ automation }: { automation: AutomationListItem }) {
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(
    automation.enabled,
  );
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      setOptimisticEnabled(checked);
      await toggleAutomation(automation.id, checked);
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      await duplicateAutomation(automation.id);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteAutomation(automation.id);
    });
  }

  return (
    <div className="flex items-center gap-4 bg-card/50 px-4 py-3.5 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {automation.name}
          </p>
          {!optimisticEnabled && (
            <Badge variant="secondary" className="text-muted-foreground">
              Disabled
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Zap className="size-3" />
            {getTriggerLabel(automation.triggerType)}
          </span>
          {automation.lastTriggeredAt ? (
            <span>
              Last triggered{" "}
              {formatDistanceToNow(new Date(automation.lastTriggeredAt), {
                addSuffix: true,
              })}
            </span>
          ) : (
            <span>Never triggered</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Switch
          checked={optimisticEnabled}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label={`Toggle ${automation.name}`}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Automation actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleDuplicate}>
              <Copy className="size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function AutomationEmptyState({
  presetsHref,
  businessSlug,
}: {
  presetsHref: string;
  businessSlug: string;
}) {
  return (
    <DashboardEmptyState
      variant="section"
      icon={Zap}
      title="No automations yet"
      description="Set up event-driven rules to automate follow-ups, status changes, and notifications — so you can focus on your work."
      action={
        <Button asChild size="sm">
          <Link href={presetsHref}>
            <Plus data-icon="inline-start" />
            Browse presets
          </Link>
        </Button>
      }
    />
  );
}
