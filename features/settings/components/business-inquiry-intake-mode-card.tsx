"use client";

import { startTransition, useEffect, useState } from "react";
import { CheckCircle2, FileText, Sparkles } from "lucide-react";

import { useRouter } from "next/navigation";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import type { BusinessPlan } from "@/lib/plans/plans";
import type { BusinessInquiryFormsActionState } from "@/features/settings/types";
import { LockedAction } from "@/features/paywall";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Intake Mode Selector Card
//
// Displayed at the top of the Fields tab. Lets the business owner choose
// between static form mode and AI conversational chat mode.
// Selecting a different mode stages the change; the floating unsaved-changes
// bar lets the user confirm (Save) or revert (Cancel).
// ---------------------------------------------------------------------------

type BusinessInquiryIntakeModeCardProps = {
  conversationalModeEnabled: boolean;
  formId: string;
  plan: BusinessPlan;
  toggleConversationalAction: (
    state: BusinessInquiryFormsActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormsActionState>;
};

const initialState: BusinessInquiryFormsActionState = {};

export function BusinessInquiryIntakeModeCard({
  conversationalModeEnabled,
  formId,
  plan,
  toggleConversationalAction,
}: BusinessInquiryIntakeModeCardProps) {
  const router = useRouter();
  const hasAiAccess = hasFeatureAccess(plan, "aiAssistant");
  const [actionState, formAction, isPending] = useActionStateWithSonner(
    toggleConversationalAction,
    initialState,
  );

  // Staged selection — null means no unsaved change
  const [stagedMode, setStagedMode] = useState<"form" | "chat" | null>(null);

  const currentMode: "form" | "chat" = conversationalModeEnabled ? "chat" : "form";
  const displayMode = stagedMode ?? currentMode;
  const hasUnsavedChanges = stagedMode !== null && stagedMode !== currentMode;
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);

  // Reset staged mode and refresh when action succeeds
  useEffect(() => {
    if (!actionState.success) return;
    startTransition(() => {
      setStagedMode(null);
      router.refresh();
    });
  }, [actionState.success, router]);

  function handleSelect(mode: "form" | "chat") {
    if (isPending) return;
    if (mode === currentMode) {
      setStagedMode(null);
    } else {
      setStagedMode(mode);
    }
  }

  function handleSave() {
    if (!hasUnsavedChanges || isPending) return;

    const wantChat = stagedMode === "chat";
    const formData = new FormData();
    formData.set("targetFormId", formId);
    formData.set("conversationalModeEnabled", wantChat ? "true" : "false");
    startTransition(() => formAction(formData));
  }

  function handleCancel() {
    if (isPending) return;
    setStagedMode(null);
  }

  return (
    <section className="section-panel p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">Intake mode</h3>
        <p className="text-sm text-muted-foreground">
          Choose how customers submit inquiries through this form.
        </p>
      </div>

      <form
        action={handleSave}
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        {/* Standard form option */}
        <IntakeModeOption
          active={displayMode === "form"}
          disabled={isPending}
          icon={<FileText className="size-4" />}
          iconClassName="bg-secondary text-secondary-foreground"
          label="Standard Form"
          description="Structured fields that customers fill out directly. Works for every plan."
          onClick={() => handleSelect("form")}
        />

        {/* AI Chat option */}
        {hasAiAccess ? (
          <IntakeModeOption
            active={displayMode === "chat"}
            disabled={isPending}
            icon={<Sparkles className="size-4" />}
            iconClassName="bg-primary/10 text-primary"
            label="AI Chat"
            description="An AI assistant that guides customers through the inquiry in a natural conversation."
            onClick={() => handleSelect("chat")}
          />
        ) : (
          <LockedAction feature="aiAssistant" plan={plan}>
            <IntakeModeOption
              active={false}
              disabled
              icon={<Sparkles className="size-4" />}
              iconClassName="bg-primary/10 text-primary"
              label="AI Chat"
              description="An AI assistant that guides customers through the inquiry in a natural conversation."
              locked
              onClick={() => {}}
            />
          </LockedAction>
        )}

        <FloatingFormActions
          disableSubmit={!hasUnsavedChanges}
          isPending={isPending}
          message="You have unsaved intake mode changes."
          onCancel={handleCancel}
          state={floatingActionsState}
          visible={shouldRenderFloatingActions}
        />
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Intake mode option tile
// ---------------------------------------------------------------------------

function IntakeModeOption({
  active,
  disabled,
  icon,
  iconClassName,
  label,
  description,
  locked,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  iconClassName?: string;
  label: string;
  description: string;
  locked?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "group relative flex items-start gap-3.5 rounded-lg border p-4 text-left transition-all",
        active
          ? "border-primary/60 bg-primary/[0.04] ring-1 ring-primary/20"
          : "border-border/60 bg-transparent hover:border-border hover:bg-accent/20",
        disabled && !active && "pointer-events-none opacity-60",
        locked && "cursor-not-allowed opacity-55",
      )}
      disabled={disabled || locked}
      onClick={onClick}
      type="button"
    >
      {/* Icon */}
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          iconClassName,
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{label}</span>

          {active ? (
            <CheckCircle2 className="size-3.5 text-primary" />
          ) : locked ? (
            <span className="rounded-md border border-border/80 bg-secondary/60 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
              Pro
            </span>
          ) : null}
        </div>
        <p className="text-[0.8rem] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}
