"use client";

import { useCallback, useId, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  FormActions,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmPasswordDialog } from "@/features/admin/components/confirm-password-dialog";
import {
  forceCancelSubscriptionAction,
  manualPlanOverrideAction,
} from "@/features/admin/mutations";
import type { AdminActionResult } from "@/features/admin/types";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { getUserSafeErrorMessage } from "@/lib/action-state";
import type { SubscriptionStatus } from "@/lib/billing/types";
import { planMeta, type BusinessPlan } from "@/lib/plans/plans";

type AdminSubscriptionOverrideFormProps = {
  subscriptionId: string;
  userId: string;
  ownerEmail: string;
  currentPlan: string;
  currentStatus: SubscriptionStatus;
};

/** Plans the admin is allowed to set via manual override (Zod rejects "free"). */
const OVERRIDABLE_PLANS: ReadonlyArray<Exclude<BusinessPlan, "free">> = [
  "pro",
  "business",
];

type PendingAction = "plan_override" | "force_cancel" | null;

/**
 * Destructive overrides for an account subscription (Req 7.1–7.4, 9.1).
 *
 * Two actions share this form, each separately gated by the
 * `ConfirmPasswordDialog`:
 *
 * - **Manual plan override** — routes through
 *   `manualPlanOverrideAction`, which calls
 *   `lib/billing/subscription-service.ts#activateSubscription`. The
 *   service keeps `businesses.plan` in sync on every owned business.
 * - **Force cancel** — routes through `forceCancelSubscriptionAction`,
 *   which calls `cancelSubscription` on the subscription service so
 *   `syncOwnerBusinessPlans` runs.
 *
 * No direct writes to `account_subscriptions` here — the server
 * actions own that contract. We only:
 *   1. Collect input (plan + optional reason).
 *   2. Open the confirm dialog to obtain a short-lived token.
 *   3. Call the server action with the token.
 *   4. Toast success, `router.refresh()` the page; or display the
 *      safe error inline.
 */
export function AdminSubscriptionOverrideForm({
  subscriptionId,
  userId,
  ownerEmail,
  currentPlan,
  currentStatus,
}: AdminSubscriptionOverrideFormProps) {
  const router = useProgressRouter();
  const planFieldId = useId();
  const planReasonFieldId = useId();
  const cancelReasonFieldId = useId();

  const defaultPlan: Exclude<BusinessPlan, "free"> =
    OVERRIDABLE_PLANS.includes(currentPlan as Exclude<BusinessPlan, "free">)
      ? (currentPlan as Exclude<BusinessPlan, "free">)
      : "pro";

  const [plan, setPlan] = useState<Exclude<BusinessPlan, "free">>(defaultPlan);
  const [planReason, setPlanReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  // Force-cancel is a no-op if the subscription is already canceled.
  // Surface this as a disabled state rather than an action-time error.
  const isAlreadyCanceled =
    currentStatus === "canceled" || currentStatus === "expired";

  const openConfirmDialog = useCallback((action: PendingAction) => {
    setInlineError(null);
    setPendingAction(action);
    setConfirmOpen(true);
  }, []);

  const handleConfirmed = useCallback(
    async (token: string) => {
      if (!pendingAction) {
        return;
      }

      const action = pendingAction;

      // Clear the pending-action intent as soon as the confirmation
      // dialog hands back its token. The transition below owns the
      // rest of the lifecycle.
      setPendingAction(null);

      startTransition(async () => {
        let result: AdminActionResult;

        try {
          if (action === "plan_override") {
            result = await manualPlanOverrideAction({
              userId,
              plan,
              reason: planReason.trim() || undefined,
              confirmToken: token,
            });
          } else {
            result = await forceCancelSubscriptionAction({
              subscriptionId,
              reason: cancelReason.trim() || undefined,
              confirmToken: token,
            });
          }
        } catch (error) {
          const message = getUserSafeErrorMessage(
            error,
            action === "plan_override"
              ? "Couldn't update this subscription."
              : "Couldn't cancel this subscription.",
          );
          setInlineError(message);
          toast.error(message, { id: `admin-subscription-${action}` });
          return;
        }

        if (!result.ok) {
          setInlineError(result.error);
          toast.error(result.error, { id: `admin-subscription-${action}` });
          return;
        }

        setInlineError(null);
        if (action === "plan_override") {
          setPlanReason("");
        } else {
          setCancelReason("");
        }
        toast.success(result.message ?? "Subscription updated.", {
          id: `admin-subscription-${action}`,
        });
        router.refresh();
      });
    },
    [
      cancelReason,
      plan,
      pendingAction,
      planReason,
      router,
      subscriptionId,
      userId,
    ],
  );

  const confirmDialogLabel =
    pendingAction === "plan_override"
      ? `Override ${ownerEmail} to ${planMeta[plan].label}`
      : `Force cancel ${ownerEmail}'s subscription`;

  const confirmDialogDescription =
    pendingAction === "plan_override"
      ? "The plan change will propagate to every business this user owns."
      : "Status is set to canceled. Grace-period access continues until the current period ends.";

  return (
    <>
      <section className="section-panel p-6">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1.5">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Subscription overrides
            </h2>
            <p className="text-sm text-muted-foreground">
              High-trust actions that bypass normal billing flows. Each
              action requires a fresh password confirmation and routes
              through the subscription service.
            </p>
          </header>

          {inlineError ? (
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t complete that action</AlertTitle>
              <AlertDescription>{inlineError}</AlertDescription>
            </Alert>
          ) : null}

          <FormSection
            description="Switch this user to a different paid plan. The service keeps every owned business in sync."
            title="Manual plan override"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={planFieldId}>Target plan</FieldLabel>
                <FieldContent>
                  <Combobox
                    id={planFieldId}
                    onValueChange={(value) =>
                      setPlan(value as Exclude<BusinessPlan, "free">)
                    }
                    options={OVERRIDABLE_PLANS.map((value) => ({
                      label: planMeta[value].label,
                      value,
                    }))}
                    placeholder="Select plan"
                    value={plan}
                  />
                  <FieldDescription>
                    Current plan: {currentPlan}.
                  </FieldDescription>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor={planReasonFieldId}>
                  Reason <span className="meta-label">(optional)</span>
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    disabled={isPending}
                    id={planReasonFieldId}
                    maxLength={500}
                    onChange={(event) =>
                      setPlanReason(event.currentTarget.value)
                    }
                    placeholder="Optional note for the audit log."
                    rows={3}
                    value={planReason}
                  />
                  <FieldDescription>
                    Recorded on the admin audit row. 500 characters max.
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>

            <FormActions>
              <Button
                disabled={isPending}
                onClick={() => openConfirmDialog("plan_override")}
                type="button"
              >
                {isPending && pendingAction === null ? (
                  <>
                    <Spinner data-icon="inline-start" aria-hidden="true" />
                    Applying…
                  </>
                ) : (
                  "Apply plan override"
                )}
              </Button>
            </FormActions>
          </FormSection>

          <FormSection
            description="Immediately set status to canceled and downgrade the user's businesses after the grace period."
            title="Force cancel"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={cancelReasonFieldId}>
                  Reason <span className="meta-label">(optional)</span>
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    disabled={isPending || isAlreadyCanceled}
                    id={cancelReasonFieldId}
                    maxLength={500}
                    onChange={(event) =>
                      setCancelReason(event.currentTarget.value)
                    }
                    placeholder="Optional note for the audit log."
                    rows={3}
                    value={cancelReason}
                  />
                  <FieldDescription>
                    Recorded on the admin audit row. 500 characters max.
                  </FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>

            <FormActions>
              <Button
                disabled={isPending || isAlreadyCanceled}
                onClick={() => openConfirmDialog("force_cancel")}
                type="button"
                variant="destructive"
              >
                {isAlreadyCanceled ? "Already canceled" : "Force cancel"}
              </Button>
            </FormActions>
          </FormSection>
        </div>
      </section>

      <ConfirmPasswordDialog
        actionLabel={confirmDialogLabel}
        confirmLabel={
          pendingAction === "force_cancel" ? "Force cancel" : "Apply override"
        }
        description={confirmDialogDescription}
        onConfirmed={handleConfirmed}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setPendingAction(null);
          }
        }}
        open={confirmOpen}
      />
    </>
  );
}
