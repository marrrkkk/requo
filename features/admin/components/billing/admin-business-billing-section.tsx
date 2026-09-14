import Link from "next/link";

import { DashboardSection } from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { getAdminUserDetailPath } from "@/features/admin/navigation";
import type {
  AdminBusinessBilling,
  AdminBusinessSubscriptionSummary,
  AdminSubscriptionDetail,
} from "@/features/admin/types";
import { planMeta, type BusinessPlan } from "@/lib/plans";

/**
 * Copy for the plan-drift warning.
 *
 * The admin reads `account_subscriptions` while runtime plan resolution
 * reads `business_subscriptions`, and the two can disagree. Returns null
 * when there is nothing to warn about so the section stays quiet in the
 * common case.
 */
export function getBillingDriftNote(
  effectivePlan: BusinessPlan,
  accountPlan: string | null,
): string | null {
  if (!accountPlan || accountPlan === effectivePlan) {
    return null;
  }

  return (
    `The owner's account subscription is ${accountPlan} but this business ` +
    `resolves to ${effectivePlan}. Each source is labelled below — neither ` +
    `is claimed as the single source of truth.`
  );
}

function SourceRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="meta-label">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function formatTimestamp(value: Date | null): string {
  if (!value) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AdminBusinessBillingSectionProps = {
  billing: AdminBusinessBilling;
};

/**
 * Billing section for the admin business detail page (read-only).
 *
 * Presents every plan signal with its source labelled: the denormalized
 * `businesses.plan` read cache ("effective, cached"), the owner's
 * `account_subscriptions` row ("account subscription"), and the
 * business-scoped `business_subscriptions` row. The full subscription
 * detail and the override form live on the owner's user detail page,
 * linked from here.
 */
export function AdminBusinessBillingSection({
  billing,
}: AdminBusinessBillingSectionProps) {
  const driftNote = getBillingDriftNote(
    billing.effectivePlan,
    billing.accountSubscription?.plan ?? null,
  );

  return (
    <DashboardSection
      description="Every plan signal for this business, each labelled with its source."
      title="Billing"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="meta-label">Effective plan (cached)</h3>
          <div className="mt-2 grid gap-5 sm:grid-cols-2">
            <SourceRow
              label="Plan"
              value={
                <Badge variant={billing.effectivePlan === "free" ? "outline" : "secondary"}>
                  {planMeta[billing.effectivePlan].label}
                </Badge>
              }
            />
            <SourceRow
              label="Source"
              value="businesses.plan — denormalized read cache, kept in sync by the subscription service."
            />
          </div>
        </div>

        <div>
          <h3 className="meta-label">Account subscription (owner)</h3>
          <div className="mt-2">
            <OwnerAccountSubscription
              ownerEmail={billing.ownerEmail}
              ownerUserId={billing.ownerUserId}
              subscription={billing.accountSubscription}
            />
          </div>
        </div>

        <div>
          <h3 className="meta-label">Business subscription</h3>
          <div className="mt-2">
            <BusinessSubscriptionRow
              subscription={billing.businessSubscription}
            />
          </div>
        </div>

        {driftNote ? (
          <p className="text-xs leading-5 text-muted-foreground">{driftNote}</p>
        ) : null}
      </div>
    </DashboardSection>
  );
}

function OwnerAccountSubscription({
  ownerEmail,
  ownerUserId,
  subscription,
}: {
  ownerEmail: string;
  ownerUserId: string;
  subscription: AdminSubscriptionDetail | null;
}) {
  if (!subscription) {
    return (
      <p className="text-sm text-muted-foreground">
        No account subscription — {ownerEmail} is on the free plan.{" "}
        <OwnerLink ownerUserId={ownerUserId} />
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SourceRow label="Plan" value={subscription.plan} />
      <SourceRow label="Status" value={subscription.status} />
      <SourceRow
        label="Current period ends"
        value={formatTimestamp(subscription.currentPeriodEnd)}
      />
      <SourceRow
        label="Full detail"
        value={<OwnerLink ownerUserId={ownerUserId} />}
      />
    </div>
  );
}

function BusinessSubscriptionRow({
  subscription,
}: {
  subscription: AdminBusinessSubscriptionSummary | null;
}) {
  if (!subscription) {
    return (
      <p className="text-sm text-muted-foreground">
        No business subscription row — implicitly on the free plan.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SourceRow label="Plan" value={subscription.plan} />
      <SourceRow label="Status" value={subscription.status} />
      <SourceRow label="Provider" value={subscription.provider} />
      <SourceRow
        label="Current period ends"
        value={formatTimestamp(subscription.currentPeriodEnd)}
      />
    </div>
  );
}

function OwnerLink({ ownerUserId }: { ownerUserId: string }) {
  return (
    <Link
      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      href={getAdminUserDetailPath(ownerUserId)}
      prefetch={true}
    >
      View owner billing in admin →
    </Link>
  );
}
