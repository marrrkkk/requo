"use client";

import { useTransition } from "react";
import {
  Bell,
  Clock,
  FileCheck,
  Mail,
  Archive,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardSection } from "@/components/shared/dashboard-layout";
import { createAutomation } from "../mutations";
import type { TriggerType, ActionConfig, DelayConfig } from "../types";

// ---------------------------------------------------------------------------
// Preset Definitions
// ---------------------------------------------------------------------------

type AutomationPreset = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  triggerType: TriggerType;
  actions: ActionConfig[];
  delay?: DelayConfig;
  badge?: string;
};

const presets: AutomationPreset[] = [
  {
    id: "follow-up-quote-viewed",
    name: "Follow up after quote viewed",
    description: "Create a follow-up reminder 3 days after a quote is viewed but not responded to.",
    icon: Clock,
    triggerType: "quote.viewed",
    actions: [
      {
        type: "create_follow_up",
        title: "Follow up on viewed quote",
        reason: "Quote viewed but no response",
        channel: "email",
        dueDateOffsetDays: 3,
      },
    ],
    delay: { unit: "days", value: 3 },
    badge: "Popular",
  },
  {
    id: "expire-quotes",
    name: "Expire quotes after 30 days",
    description: "Automatically expire quotes that haven't been accepted within 30 days.",
    icon: AlertTriangle,
    triggerType: "quote.sent",
    actions: [{ type: "update_quote_status", status: "expired" }],
    delay: { unit: "days", value: 30 },
  },
  {
    id: "job-on-acceptance",
    name: "Create job when quote accepted",
    description: "Automatically create a job when a customer accepts a quote.",
    icon: FileCheck,
    triggerType: "quote.accepted",
    actions: [{ type: "create_job_from_quote" }],
    badge: "Popular",
  },
  {
    id: "notify-new-inquiry",
    name: "Notify on new inquiry",
    description: "Get a push notification whenever a new inquiry comes in.",
    icon: Bell,
    triggerType: "inquiry.received",
    actions: [
      {
        type: "send_notification",
        title: "New inquiry received",
        body: "A new inquiry has been submitted.",
      },
    ],
  },
  {
    id: "archive-stale-inquiries",
    name: "Archive stale inquiries",
    description: "Archive inquiries that haven't been qualified after 14 days.",
    icon: Archive,
    triggerType: "inquiry.received",
    actions: [{ type: "archive_inquiry", reason: "No response after 14 days" }],
    delay: { unit: "days", value: 14 },
  },
  {
    id: "follow-up-overdue-reminder",
    name: "Remind on overdue follow-ups",
    description: "Send a notification when a follow-up becomes overdue.",
    icon: Mail,
    triggerType: "follow_up.overdue",
    actions: [
      {
        type: "send_notification",
        title: "Follow-up overdue",
        body: "A follow-up is past its due date.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type QuickAutomationPresetsProps = {
  existingTriggerTypes: string[];
  disabled?: boolean;
  businessSlug: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickAutomationPresets({
  existingTriggerTypes,
  disabled,
  businessSlug,
}: QuickAutomationPresetsProps) {
  return (
    <DashboardSection
      title="Quick automation presets"
      description="Enable common automations with one click. Customize timing after enabling."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            alreadyExists={existingTriggerTypes.includes(preset.triggerType)}
            disabled={disabled}
            businessSlug={businessSlug}
          />
        ))}
      </div>
    </DashboardSection>
  );
}

// ---------------------------------------------------------------------------
// Preset Card
// ---------------------------------------------------------------------------

function PresetCard({
  preset,
  alreadyExists,
  disabled,
  businessSlug,
}: {
  preset: AutomationPreset;
  alreadyExists: boolean;
  disabled?: boolean;
  businessSlug: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleEnable() {
    startTransition(async () => {
      const result = await createAutomation({
        name: preset.name,
        triggerType: preset.triggerType,
        actions: preset.actions,
        delay: preset.delay,
        enabled: true,
        priority: 0,
      });
      if (result.id) {
        window.location.href = `/${businessSlug}/automations?id=${result.id}`;
      }
    });
  }

  const Icon = preset.icon;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-1 gap-2 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          {preset.badge && (
            <Badge variant="secondary" className="text-xs">
              {preset.badge}
            </Badge>
          )}
        </div>
        <CardTitle className="text-sm font-medium">{preset.name}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {preset.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          size="sm"
          variant={alreadyExists ? "secondary" : "default"}
          className="w-full"
          disabled={disabled || isPending || alreadyExists}
          onClick={handleEnable}
        >
          {alreadyExists ? "Already active" : isPending ? "Enabling…" : "Enable"}
        </Button>
      </CardContent>
    </Card>
  );
}
