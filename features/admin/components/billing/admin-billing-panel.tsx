import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardEmptyState,
  DashboardSection,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminSubscriptionBillingEvent,
  AdminSubscriptionDetail,
  AdminSubscriptionPaymentAttempt,
} from "@/features/admin/types";
import { formatPrice } from "@/lib/billing/plans";
import type {
  BillingProvider,
  PaymentAttemptStatus,
  SubscriptionStatus,
} from "@/lib/billing/types";

const subscriptionStatusLabel: Record<SubscriptionStatus, string> = {
  free: "Free",
  pending: "Pending",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  expired: "Expired",
  incomplete: "Incomplete",
};

const subscriptionStatusVariant: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline" | "ghost"
> = {
  free: "outline",
  pending: "secondary",
  active: "default",
  past_due: "destructive",
  canceled: "outline",
  expired: "outline",
  incomplete: "secondary",
};

const paymentStatusVariant: Record<
  PaymentAttemptStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  succeeded: "default",
  failed: "destructive",
  expired: "outline",
};

const providerLabels: Record<BillingProvider, string> = {
  polar: "Polar",
};

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

function formatDate(value: Date | null): string {
  if (!value) {
    return "—";
  }

  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="meta-label">{label}</span>
      <span className="text-sm text-foreground break-words">{value}</span>
    </div>
  );
}

type AdminBillingPanelProps = {
  /** Full account-subscription detail, or null when the user is on free. */
  subscription: AdminSubscriptionDetail | null;
};

/**
 * Billing panel mounted on the admin user detail page.
 *
 * Salvaged from the deleted `/admin/subscriptions/[subscriptionId]` view:
 * the subscription details grid plus the recent payment attempts and
 * recent billing events. Informational only — the destructive override
 * form (`AdminSubscriptionOverrideForm`) is mounted separately by the page.
 */
export function AdminBillingPanel({ subscription }: AdminBillingPanelProps) {
  if (!subscription) {
    return (
      <DashboardSection
        description="Account subscription shared across every business this user owns."
        title="Billing"
      >
        <p className="text-sm text-muted-foreground">
          No account subscription. The user is on the free plan.
        </p>
      </DashboardSection>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardSection
        description="Authoritative subscription state from account_subscriptions."
        title="Billing"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <DetailRow
            label="Status"
            value={
              <Badge variant={subscriptionStatusVariant[subscription.status]}>
                {subscriptionStatusLabel[subscription.status]}
              </Badge>
            }
          />
          <DetailRow
            label="Plan"
            value={<Badge variant="outline">{subscription.plan}</Badge>}
          />
          <DetailRow
            label="Provider"
            value={
              providerLabels[subscription.provider] ?? subscription.provider
            }
          />
          <DetailRow label="Currency" value={subscription.billingCurrency} />
          <DetailRow
            label="Current period start"
            value={formatTimestamp(subscription.currentPeriodStart)}
          />
          <DetailRow
            label="Current period end"
            value={formatTimestamp(subscription.currentPeriodEnd)}
          />
          <DetailRow
            label="Canceled at"
            value={formatTimestamp(subscription.canceledAt)}
          />
          <DetailRow
            label="Trial ends"
            value={formatTimestamp(subscription.trialEndsAt)}
          />
          <DetailRow
            label="Payment method"
            value={subscription.paymentMethod ?? "—"}
          />
          <DetailRow
            label="Provider customer id"
            value={subscription.providerCustomerId ?? "—"}
          />
          <DetailRow
            label="Provider subscription id"
            value={subscription.providerSubscriptionId ?? "—"}
          />
          <DetailRow
            label="Provider checkout id"
            value={subscription.providerCheckoutId ?? "—"}
          />
          <DetailRow
            label="Created"
            value={formatTimestamp(subscription.createdAt)}
          />
          <DetailRow
            label="Updated"
            value={formatTimestamp(subscription.updatedAt)}
          />
        </div>
      </DashboardSection>

      <RecentPaymentsSection
        attempts={subscription.recentPaymentAttempts}
      />

      <RecentBillingEventsSection events={subscription.recentBillingEvents} />
    </div>
  );
}

function RecentPaymentsSection({
  attempts,
}: {
  attempts: AdminSubscriptionPaymentAttempt[];
}) {
  return (
    <DashboardSection
      description="Most recent payment attempts for the owner, newest first."
      title="Recent payment attempts"
    >
      {attempts.length === 0 ? (
        <DashboardEmptyState
          className="border"
          description="No payment attempts recorded for this account yet."
          title="No payment attempts"
          variant="section"
        />
      ) : (
        <DashboardTableContainer>
          <Table className="min-w-[44rem]">
            <TableCaption className="sr-only">
              Recent payment attempts.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[10rem]">When</TableHead>
                <TableHead className="w-[7rem]">Plan</TableHead>
                <TableHead className="w-[7rem]">Amount</TableHead>
                <TableHead className="w-[8rem]">Status</TableHead>
                <TableHead>Provider payment id</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(attempt.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{attempt.plan}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-foreground">
                    {formatPrice(attempt.amount, attempt.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={paymentStatusVariant[attempt.status]}>
                      {attempt.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="break-all">
                      {attempt.providerPaymentId}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DashboardTableContainer>
      )}
    </DashboardSection>
  );
}

function RecentBillingEventsSection({
  events,
}: {
  events: AdminSubscriptionBillingEvent[];
}) {
  return (
    <DashboardSection
      description="Most recent provider webhook events for this user."
      title="Recent billing events"
    >
      {events.length === 0 ? (
        <DashboardEmptyState
          className="border"
          description="No billing events recorded for this account yet."
          title="No billing events"
          variant="section"
        />
      ) : (
        <DashboardDetailFeed>
          {events.map((event) => (
            <DashboardDetailFeedItem
              key={event.id}
              meta={
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(event.createdAt)}
                  {event.processedAt ? null : " · unprocessed"}
                </span>
              }
              title={event.eventType}
            >
              <p className="text-xs text-muted-foreground break-all">
                {event.providerEventId}
              </p>
            </DashboardDetailFeedItem>
          ))}
        </DashboardDetailFeed>
      )}
    </DashboardSection>
  );
}
