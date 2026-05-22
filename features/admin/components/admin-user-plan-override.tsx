"use client";

import { Crown } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { DashboardSection } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { ConfirmPasswordDialog } from "@/features/admin/components/confirm-password-dialog";
import { manualPlanOverrideAction } from "@/features/admin/mutations";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { businessPlans, planMeta, type BusinessPlan } from "@/lib/plans/plans";

type AdminUserPlanOverrideProps = {
  targetUserId: string;
  targetEmail: string;
  /** Current effective plan for the user, derived from subscription. */
  currentPlan: BusinessPlan;
};

const paidPlanOptions = businessPlans
  .filter((p) => p !== "free")
  .map((plan) => ({
    label: planMeta[plan].label,
    value: plan,
  }));

/**
 * Plan override combobox on the admin user detail page.
 * Allows setting a user's subscription to pro or business without
 * needing a billing provider checkout.
 */
export function AdminUserPlanOverride({
  targetUserId,
  targetEmail,
  currentPlan,
}: AdminUserPlanOverrideProps) {
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState<string>(
    currentPlan === "free" ? "pro" : currentPlan,
  );
  const [showConfirm, setShowConfirm] = useState(false);

  const canOverride =
    selectedPlan !== currentPlan && selectedPlan !== "free";

  const handleConfirmed = useCallback(
    (token: string) => {
      setShowConfirm(false);

      startTransition(async () => {
        const result = await manualPlanOverrideAction({
          userId: targetUserId,
          plan: selectedPlan as Exclude<BusinessPlan, "free">,
          confirmToken: token,
        });

        if (result.ok) {
          toast.success(
            result.message ??
              `Set ${targetEmail} to ${planMeta[selectedPlan as BusinessPlan]?.label ?? selectedPlan}.`,
          );
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    },
    [router, selectedPlan, targetEmail, targetUserId],
  );

  return (
    <>
      <DashboardSection
        description={`Override the subscription plan for ${targetEmail}. Current plan: ${planMeta[currentPlan].label}.`}
        title="Plan override"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
          <Field className="min-w-0 w-full sm:w-[14rem]">
            <FieldLabel
              className="meta-label px-0.5"
              htmlFor="admin-plan-override"
            >
              Set plan
            </FieldLabel>
            <FieldContent>
              <Combobox
                disabled={isPending}
                id="admin-plan-override"
                onValueChange={setSelectedPlan}
                options={paidPlanOptions}
                placeholder="Choose a plan"
                value={selectedPlan}
              />
            </FieldContent>
          </Field>

          <Button
            disabled={isPending || !canOverride}
            onClick={() => setShowConfirm(true)}
            type="button"
            variant="default"
          >
            <Crown data-icon="inline-start" />
            {isPending ? "Applying…" : "Apply override"}
          </Button>
        </div>
      </DashboardSection>

      <ConfirmPasswordDialog
        actionLabel="Override plan"
        confirmLabel="Apply override"
        description={`This will set ${targetEmail} to the ${planMeta[selectedPlan as BusinessPlan]?.label ?? selectedPlan} plan. All their businesses will inherit this plan.`}
        onConfirmed={handleConfirmed}
        onOpenChange={setShowConfirm}
        open={showConfirm}
      />
    </>
  );
}
