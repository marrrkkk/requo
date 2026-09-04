"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Switch } from "@/components/ui/switch";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import type { AgentTone } from "@/features/ai-agent/types";
import type {
  BusinessAiAgentSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";
import { cn } from "@/lib/utils";

type BusinessAiAgentSettingsFormProps = {
  action: (
    state: BusinessAiAgentSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessAiAgentSettingsActionState>;
  chatPath: string;
  settings: Pick<
    BusinessSettingsView,
    "aiAgentEnabled" | "aiAgentTone" | "updatedAt"
  >;
};

const initialState: BusinessAiAgentSettingsActionState = {};

const toneOptions: Array<{
  value: AgentTone;
  label: string;
}> = [
  {
    value: "friendly",
    label: "Friendly",
  },
  {
    value: "professional",
    label: "Professional",
  },
  {
    value: "casual",
    label: "Casual",
  },
];

export function BusinessAiAgentSettingsForm({
  action,
  chatPath,
  settings,
}: BusinessAiAgentSettingsFormProps) {
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [aiAgentEnabled, setAiAgentEnabled] = useState(settings.aiAgentEnabled);
  const [tone, setTone] = useState<AgentTone>(settings.aiAgentTone);
  const [copied, setCopied] = useState(false);

  const hasUnsavedChanges =
    aiAgentEnabled !== settings.aiAgentEnabled || tone !== settings.aiAgentTone;
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    scheduleRefresh();
  }, [scheduleRefresh, state.success]);

  function handleCancelChanges() {
    setAiAgentEnabled(settings.aiAgentEnabled);
    setTone(settings.aiAgentTone);
  }

  async function handleCopyChatLink() {
    try {
      const url = new URL(chatPath, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      toast.success("Chat link copied to clipboard.");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy AI agent chat link.", error);
      toast.error("Failed to copy chat link.");
    }
  }

  return (
    <form action={formAction}>
      <input
        name="aiAgentEnabled"
        type="hidden"
        value={aiAgentEnabled ? "on" : "off"}
      />
      <input name="tone" type="hidden" value={tone} />

      <div className="rounded-xl border border-border/75 bg-card/97 p-5 sm:p-6 shadow-xs">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Sparkles Icon Box with teal/emerald glow */}
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary shadow-[0_0_12px_rgba(0,128,96,0.18)]">
              <Sparkles className="size-5" />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  Public chat
                </span>
                {aiAgentEnabled ? (
                  <Badge
                    variant="ghost"
                    className="bg-primary/10 text-primary text-[0.68rem] px-2 py-0 h-4.5 font-medium rounded-md border-none"
                  >
                    Active
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Public conversational chat to answer customer questions and qualify inquiries 24/7.
              </p>
            </div>
          </div>

          {/* Toggle with Enabled/Disabled Label */}
          <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              {aiAgentEnabled ? "Enabled" : "Disabled"}
            </span>
              <Switch
                aria-label="Enable public chat"
              checked={aiAgentEnabled}
              disabled={isPending}
              id="ai-agent-settings-enabled"
              onCheckedChange={setAiAgentEnabled}
            />
          </div>
        </div>

        {/* Bottom Controls Row: Tone & Chat Link */}
        {aiAgentEnabled ? (
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: Tone of voice */}
            <div className="flex flex-col gap-1.5 w-full max-w-xs sm:max-w-sm">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span>Tone of voice</span>
                <span title="Choose how your assistant speaks with customers.">
                  <Info className="size-3.5 opacity-60 hover:opacity-100 transition-opacity" />
                </span>
              </div>

              <div className="inline-flex h-10 w-full rounded-lg border border-border/60 bg-muted/30 p-1">
                {toneOptions.map((opt) => {
                  const isSelected = tone === opt.value;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTone(opt.value)}
                      disabled={isPending}
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-all",
                        isSelected
                          ? "bg-card text-foreground shadow-xs border border-border/50"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Chat link */}
            <div className="flex flex-col gap-1.5 w-full max-w-xs">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span>Chat link</span>
                <span title="Public URL for visitors to chat with your business.">
                  <Info className="size-3.5 opacity-60 hover:opacity-100 transition-opacity" />
                </span>
              </div>

              <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3">
                <span className="min-w-0 truncate font-mono text-xs text-muted-foreground select-all">
                  {chatPath}
                </span>

                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={handleCopyChatLink}
                    title="Copy chat link"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-primary" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    <span className="sr-only">Copy link</span>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    title="Open chat link in new tab"
                  >
                    <a href={chatPath} rel="noopener noreferrer" target="_blank">
                      <ExternalLink className="size-3.5" />
                      <span className="sr-only">Open chat link</span>
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <FloatingFormActions
        disableSubmit={!hasUnsavedChanges}
        isPending={isPending}
        message="You have unsaved public chat settings."
        onCancel={handleCancelChanges}
        state={floatingActionsState}
        submitLabel="Save settings"
        submitPendingLabel="Saving..."
        visible={shouldRenderFloatingActions}
      />
    </form>
  );
}