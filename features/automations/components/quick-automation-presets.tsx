"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  FileCheck,
  Mail,
  Archive,
  AlertTriangle,
  FileText,
  Briefcase,
  Receipt,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardSection } from "@/components/shared/dashboard-layout";
import {
  type AutomationTemplate,
  getAutomationTemplates,
  groupAutomationTemplatesByCategory,
} from "@/features/automations/automation-templates";
import { createAutomation } from "../mutations";

// ---------------------------------------------------------------------------
// Icons per template
// ---------------------------------------------------------------------------

const templateIcons: Record<string, LucideIcon> = {
  "notify-new-inquiry": Bell,
  "follow-up-new-inquiry": Clock,
  "draft-quote-when-qualified": Sparkles,
  "archive-stale-inquiries": Archive,
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

function getTemplateIcon(template: AutomationTemplate): LucideIcon {
  return templateIcons[template.id] ?? FileText;
}

function TemplateIcon({
  templateId,
  className,
}: {
  templateId: string;
  className?: string;
}) {
  const Icon = templateIcons[templateId] ?? FileText;
  return <Icon className={className} />;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type QuickAutomationPresetsProps = {
  existingAutomationNames: string[];
  disabled?: boolean;
  businessSlug: string;
  businessType?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickAutomationPresets({
  existingAutomationNames,
  disabled,
  businessSlug,
  businessType,
}: QuickAutomationPresetsProps) {
  const templates = getAutomationTemplates(businessType);
  const groups = groupAutomationTemplatesByCategory(templates);
  const existingNames = new Set(
    existingAutomationNames.map((name) => name.trim().toLowerCase()),
  );

  return (
    <DashboardSection
      title="Workflow templates"
      description="Each template adds a new automation to your list. You can customize timing and steps in the builder after adding."
    >
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <div key={group.category} className="flex flex-col gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  alreadyEnabled={existingNames.has(template.name.trim().toLowerCase())}
                  disabled={disabled}
                  businessSlug={businessSlug}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  alreadyEnabled,
  disabled,
  businessSlug,
}: {
  template: AutomationTemplate;
  alreadyEnabled: boolean;
  disabled?: boolean;
  businessSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const result = await createAutomation({
        name: template.name,
        description: template.description,
        triggerType: template.triggerType,
        actions: template.actions,
        delay: template.delay,
        enabled: true,
        priority: 0,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.id) {
        toast.error("We couldn't add that automation right now.");
        return;
      }

      toast.success("Automation added", {
        description: "Opening the builder so you can review or customize it.",
      });
      router.push(`/${businessSlug}/automations?id=${result.id}`);
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-1 gap-2 pb-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <TemplateIcon templateId={template.id} className="size-5" />
        </div>
        <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          size="sm"
          variant={alreadyEnabled ? "secondary" : "default"}
          className="w-full"
          disabled={disabled || isPending || alreadyEnabled}
          onClick={handleAdd}
        >
          {alreadyEnabled
            ? "Already in your list"
            : isPending
              ? "Adding…"
              : "Add automation"}
        </Button>
      </CardContent>
    </Card>
  );
}
