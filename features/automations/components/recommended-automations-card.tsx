"use client";

import { useState } from "react";
import {
  Bell,
  Clock,
  Mail,
  FileCheck,
  Sparkles,
  AlertTriangle,
  Briefcase,
  Receipt,
  FileText,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AutomationTemplate } from "@/features/automations/automation-templates";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { createAutomation } from "../mutations";

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const templateIcons: Record<string, LucideIcon> = {
  "notify-new-inquiry": Bell,
  "follow-up-new-inquiry": Clock,
  "draft-quote-when-qualified": Sparkles,
  "archive-stale-inquiries": AlertTriangle,
  "follow-up-quote-viewed": Clock,
  "follow-up-quote-sent": Mail,
  "expire-quotes-30d": AlertTriangle,
  "notify-quote-accepted": FileCheck,
  "notify-quote-rejected": AlertTriangle,
  "job-on-acceptance": Briefcase,
  "generate-invoice-on-job-complete": Receipt,
  "notify-invoice-overdue": Receipt,
  "follow-up-overdue-reminder": Bell,
  "follow-up-due-today": Clock,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type RecommendedAutomationsCardProps = {
  recommendations: AutomationTemplate[];
  valueProp: string;
  existingAutomationNames: string[];
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommendedAutomationsCard({
  recommendations,
  valueProp,
  existingAutomationNames,
  disabled,
}: RecommendedAutomationsCardProps) {
  const existingNames = new Set(
    existingAutomationNames.map((n) => n.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Zap className="size-3.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Recommended for your business
          </h3>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {valueProp}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {recommendations.map((template) => (
          <RecommendedRow
            key={template.id}
            template={template}
            alreadyEnabled={existingNames.has(
              template.name.trim().toLowerCase(),
            )}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function RecommendedRow({
  template,
  alreadyEnabled,
  disabled,
}: {
  template: AutomationTemplate;
  alreadyEnabled: boolean;
  disabled?: boolean;
}) {
  const { runMutation, isPendingKey } = useOptimisticMutation();
  const [optimisticallyAdded, setOptimisticallyAdded] = useState(false);
  const Icon = templateIcons[template.id] ?? FileText;
  const isAdded = alreadyEnabled || optimisticallyAdded;
  const isPending = isPendingKey(template.id);

  function handleAdd() {
    runMutation({
      applyOptimistic: () => setOptimisticallyAdded(true),
      revertOptimistic: () => setOptimisticallyAdded(false),
      mutation: () =>
        createAutomation({
          name: template.name,
          description: template.description,
          triggerType: template.triggerType,
          actions: template.actions,
          delay: template.delay,
          enabled: true,
          priority: 0,
        }),
      pendingKey: template.id,
      successMessage: `"${template.name}" enabled`,
      errorMessage: (result) =>
        result.error ?? "We couldn't enable that automation right now.",
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">
          {template.name}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {template.description}
        </span>
      </div>
      <Button
        size="sm"
        variant={isAdded ? "secondary" : "default"}
        className="shrink-0"
        disabled={disabled || isPending || isAdded}
        onClick={handleAdd}
      >
        {isAdded ? "Added" : isPending ? "Adding…" : "Enable"}
      </Button>
    </div>
  );
}
