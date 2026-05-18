"use client";

import { startTransition, useEffect } from "react";
import { Bot, FileText } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
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
  const router = useProgressRouter();
  const hasAiAccess = hasFeatureAccess(plan, "aiAssistant");
  const [actionState, formAction, isPending] = useActionStateWithSonner(
    toggleConversationalAction,
    initialState,
  );

  useEffect(() => {
    if (!actionState.success) return;
    router.refresh();
  }, [actionState.success, router]);

  function handleSelect(mode: "form" | "chat") {
    if (isPending) return;

    const wantChat = mode === "chat";

    if (wantChat === conversationalModeEnabled) return;

    const formData = new FormData();
    formData.set("targetFormId", formId);
    formData.set("enabled", wantChat ? "true" : "false");
    startTransition(() => formAction(formData));
  }

  return (
    <Card className="border-border/75 bg-card/96">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-base">Intake mode</CardTitle>
        <CardDescription>
          Choose how customers submit inquiries through this form.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Form option */}
          <button
            className={cn(
              "relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-colors",
              "hover:border-primary/40 hover:bg-accent/50",
              !conversationalModeEnabled
                ? "border-primary bg-primary/[0.04]"
                : "border-border/60 bg-transparent",
              isPending && "pointer-events-none opacity-60",
            )}
            disabled={isPending}
            onClick={() => handleSelect("form")}
            type="button"
          >
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <FileText className="size-4" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                Form
              </span>
              {!conversationalModeEnabled && isPending ? (
                <Spinner className="ml-auto size-3.5" />
              ) : null}
            </div>
            <p className="text-[0.8rem] leading-snug text-muted-foreground">
              Static fields customers fill out directly. Works for every plan.
            </p>
            {!conversationalModeEnabled ? (
              <Badge
                className="absolute right-3 top-3"
                variant="secondary"
              >
                Active
              </Badge>
            ) : null}
          </button>

          {/* AI Chat option */}
          {hasAiAccess ? (
            <button
              className={cn(
                "relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-colors",
                "hover:border-primary/40 hover:bg-accent/50",
                conversationalModeEnabled
                  ? "border-primary bg-primary/[0.04]"
                  : "border-border/60 bg-transparent",
                isPending && "pointer-events-none opacity-60",
              )}
              disabled={isPending}
              onClick={() => handleSelect("chat")}
              type="button"
            >
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  AI Chat
                </span>
                {conversationalModeEnabled && isPending ? (
                  <Spinner className="ml-auto size-3.5" />
                ) : null}
              </div>
              <p className="text-[0.8rem] leading-snug text-muted-foreground">
                A conversational assistant that collects inquiry details naturally.
              </p>
              {conversationalModeEnabled ? (
                <Badge
                  className="absolute right-3 top-3"
                  variant="secondary"
                >
                  Active
                </Badge>
              ) : null}
            </button>
          ) : (
            <LockedAction feature="aiAssistant" plan={plan}>
              <div
                className={cn(
                  "relative flex cursor-not-allowed flex-col gap-2 rounded-xl border-2 border-border/60 p-4 text-left opacity-60",
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="size-4" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    AI Chat
                  </span>
                  <Badge className="ml-auto" variant="outline">
                    Pro
                  </Badge>
                </div>
                <p className="text-[0.8rem] leading-snug text-muted-foreground">
                  A conversational assistant that collects inquiry details naturally.
                </p>
              </div>
            </LockedAction>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
