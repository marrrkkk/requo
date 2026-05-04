import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileClock,
  Inbox,
  RefreshCw,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import {
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminBasicTable,
  AdminMetricCard,
  AdminMetricGrid,
  formatDateTime,
  formatNumber,
} from "@/features/admin/components/admin-common";
import { getAdminOverview } from "@/features/admin/queries";
import { planMeta, workspacePlans } from "@/lib/plans";

type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;

type PriorityState = "urgent" | "watch" | "clear";

type AdminPriority = {
  badge: string;
  cta: string;
  description: string;
  href: string;
  icon: LucideIcon;
  score: number;
  state: PriorityState;
  title: string;
};

type AdminReviewItem = {
  badge: string;
  description: ReactNode;
  href: string;
  key: string;
  meta: ReactNode;
  title: ReactNode;
};

function getBadgeVariant(state: PriorityState) {
  if (state === "urgent") {
    return "destructive";
  }

  if (state === "watch") {
    return "secondary";
  }

  return "outline";
}

function formatPercent(part: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((part / total) * 100)}%`;
}

function getAdminPriorities(overview: AdminOverview): AdminPriority[] {
  const billingExceptions =
    overview.counts.failedPayments +
    overview.counts.pastDueSubscriptions +
    overview.counts.pendingSubscriptions;
  const customerWorkflowRisk =
    overview.counts.openInquiries +
    overview.counts.sentQuotesAwaitingResponse +
    overview.counts.overdueFollowUps;

  const priorities: AdminPriority[] = [
    {
      badge:
        overview.counts.dueDeletionRequests > 0
          ? `${formatNumber(overview.counts.dueDeletionRequests)} due`
          : `${formatNumber(overview.counts.pendingDeletionRequests)} scheduled`,
      cta: "Open deletion queue",
      description:
        overview.counts.dueDeletionRequests > 0
          ? "Complete due workspace deletions or cancel anything that should stay active."
          : "Check scheduled workspace deletion requests before they become due.",
      href: "/admin/deletion-requests",
      icon: FileClock,
      score:
        overview.counts.dueDeletionRequests > 0
          ? 100
          : overview.counts.pendingDeletionRequests > 0
            ? 45
            : 0,
      state:
        overview.counts.dueDeletionRequests > 0
          ? "urgent"
          : overview.counts.pendingDeletionRequests > 0
            ? "watch"
            : "clear",
      title: "Deletion requests",
    },
    {
      badge: `${formatNumber(billingExceptions)} issues`,
      cta: "Review billing",
      description:
        billingExceptions > 0
          ? "Failed payments, past-due subscriptions, or pending checkout states need billing review."
          : "Payment and subscription exception queues are clear.",
      href: "/admin/subscriptions",
      icon: CreditCard,
      score:
        overview.counts.failedPayments > 0
          ? 90
          : overview.counts.pastDueSubscriptions > 0
            ? 70
            : overview.counts.pendingSubscriptions > 0
              ? 35
              : 0,
      state:
        overview.counts.failedPayments > 0
          ? "urgent"
          : billingExceptions > 0
            ? "watch"
            : "clear",
      title: "Billing exceptions",
    },
    {
      badge: `${formatNumber(overview.counts.unprocessedBillingEvents)} waiting`,
      cta: "Open system status",
      description:
        overview.counts.unprocessedBillingEvents > 0
          ? "Billing webhooks are recorded but not processed. Check provider handling before support escalates."
          : "Billing webhook processing is caught up.",
      href: "/admin/system",
      icon: RefreshCw,
      score: overview.counts.unprocessedBillingEvents > 0 ? 80 : 0,
      state:
        overview.counts.unprocessedBillingEvents > 0 ? "urgent" : "clear",
      title: "Webhook backlog",
    },
    {
      badge: `${formatNumber(customerWorkflowRisk)} signals`,
      cta: "Inspect businesses",
      description:
        customerWorkflowRisk > 0
          ? "Open inquiries, unanswered sent quotes, or overdue follow-ups point to owners who may need support."
          : "Customer workflow signals look calm across businesses.",
      href: "/admin/businesses",
      icon: BellRing,
      score: customerWorkflowRisk > 0 ? 25 : 0,
      state: customerWorkflowRisk > 0 ? "watch" : "clear",
      title: "Customer workflow risk",
    },
  ];

  const sorted = priorities.sort((left, right) => right.score - left.score);

  if (sorted[0]?.score > 0) {
    return sorted;
  }

  return [
    {
      badge: "Clear",
      cta: "View audit logs",
      description:
        "No urgent admin queues are waiting. Review recent admin activity and product health next.",
      href: "/admin/audit-logs",
      icon: ShieldCheck,
      score: 1,
      state: "clear",
      title: "No blocking admin work",
    },
    ...sorted.slice(0, 3),
  ];
}

function getReviewItems(overview: AdminOverview): AdminReviewItem[] {
  return [
    ...overview.dueDeletionRequests.map((request) => ({
      badge: request.scheduledDeletionAt
        ? request.scheduledDeletionAt.getTime() <= Date.now()
          ? "Deletion due"
          : "Scheduled"
        : "Scheduled",
      description: (
        <>
          Owner {request.ownerEmail} / {request.slug}
        </>
      ),
      href: `/admin/deletion-requests/${request.id}`,
      key: `deletion-${request.id}`,
      meta: `Scheduled ${formatDateTime(request.scheduledDeletionAt)}`,
      title: request.name,
    })),
    ...overview.atRiskSubscriptions.map((subscription) => ({
      badge: subscription.status.replace(/_/g, " "),
      description: (
        <>
          {subscription.ownerEmail} / {subscription.billingProvider}
        </>
      ),
      href: `/admin/subscriptions/${subscription.workspaceId}`,
      key: `subscription-${subscription.workspaceId}`,
      meta: `Renews ${formatDateTime(subscription.currentPeriodEnd)}`,
      title: subscription.workspaceName,
    })),
    ...overview.recentFailedPayments.map((payment) => ({
      badge: "Payment failed",
      description: (
        <>
          {payment.provider} / {payment.status}
        </>
      ),
      href: `/admin/workspaces/${payment.workspaceId}`,
      key: `payment-${payment.id}`,
      meta: formatDateTime(payment.createdAt),
      title: payment.workspaceName,
    })),
    ...overview.recentUnprocessedBillingEvents.map((event) => ({
      badge: "Webhook waiting",
      description: (
        <>
          {event.provider} / {event.eventType}
        </>
      ),
      href: event.workspaceId
        ? `/admin/workspaces/${event.workspaceId}`
        : "/admin/system",
      key: `webhook-${event.id}`,
      meta: event.workspaceName ?? "Not attached to a workspace",
      title: event.workspaceName ?? "Unattached billing event",
    })),
  ].slice(0, 8);
}

export async function AdminOverviewDashboard() {
  const overview = await getAdminOverview();
  const priorities = getAdminPriorities(overview);
  const primaryPriority = priorities[0];
  const reviewItems = getReviewItems(overview);
  const conversionRate = formatPercent(
    overview.counts.acceptedQuotes,
    overview.counts.totalQuotes,
  );

  return (
    <>
      <DashboardSection
        action={
          <Button asChild>
            <Link href={primaryPriority.href} prefetch={true}>
              {primaryPriority.cta}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        }
        description={primaryPriority.description}
        title={primaryPriority.title}
      >
        <div className="grid gap-3 lg:grid-cols-4">
          {priorities.map((priority) => (
            <PriorityPanel key={priority.title} priority={priority} />
          ))}
        </div>
      </DashboardSection>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {priorities.map((priority) => (
          <AdminQueueCard key={priority.title} priority={priority} />
        ))}
      </div>

      <AdminMetricGrid>
        <AdminMetricCard
          description={`${formatNumber(overview.counts.recentUserAccounts)} joined in the last 7 days`}
          label="Users"
          value={formatNumber(overview.counts.totalUsers)}
        />
        <AdminMetricCard
          description={`${formatNumber(overview.counts.unverifiedUsers)} accounts still unverified`}
          label="Unverified users"
          value={formatNumber(overview.counts.unverifiedUsers)}
        />
        <AdminMetricCard
          description={`${formatNumber(overview.counts.totalBusinesses)} businesses across active workspaces`}
          label="Workspaces"
          value={formatNumber(overview.counts.totalWorkspaces)}
        />
        <AdminMetricCard
          description={`${formatNumber(overview.counts.pastDueSubscriptions)} past due, ${formatNumber(overview.counts.pendingSubscriptions)} pending`}
          label="Billing review"
          value={formatNumber(
            overview.counts.pastDueSubscriptions +
              overview.counts.pendingSubscriptions,
          )}
        />
        <AdminMetricCard
          description="New or waiting inquiries that need owner attention"
          label="Open inquiries"
          value={formatNumber(overview.counts.openInquiries)}
        />
        <AdminMetricCard
          description={`${formatNumber(overview.counts.viewedQuotesAwaitingResponse)} have been viewed`}
          label="Sent quotes waiting"
          value={formatNumber(overview.counts.sentQuotesAwaitingResponse)}
        />
        <AdminMetricCard
          description={`${formatNumber(overview.counts.upcomingFollowUps)} due in the next 7 days`}
          label="Overdue follow-ups"
          value={formatNumber(overview.counts.overdueFollowUps)}
        />
        <AdminMetricCard
          description={`${formatNumber(overview.counts.recentAcceptedQuotes)} accepted in the last 7 days`}
          label={`Accepted quotes / ${conversionRate}`}
          value={formatNumber(overview.counts.acceptedQuotes)}
        />
      </AdminMetricGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <DashboardSection
          description="Specific records from the queues above. Work these before browsing general lists."
          title="Needs review"
        >
          <AdminReviewList items={reviewItems} />
        </DashboardSection>

        <DashboardSection
          description="Fast read on whether the product workflow is moving."
          title="Workflow pulse"
        >
          <div className="grid gap-3">
            <PulseRow
              icon={Inbox}
              label="Inquiries captured"
              meta="Last 7 days"
              value={formatNumber(overview.counts.recentInquiries)}
            />
            <PulseRow
              icon={Send}
              label="Quotes created"
              meta="Last 7 days"
              value={formatNumber(overview.counts.recentQuotes)}
            />
            <PulseRow
              icon={CheckCircle2}
              label="Quotes accepted"
              meta="Last 7 days"
              value={formatNumber(overview.counts.recentAcceptedQuotes)}
            />
            <PulseRow
              icon={Clock3}
              label="Follow-ups queued"
              meta="Due in next 7 days"
              value={formatNumber(overview.counts.upcomingFollowUps)}
            />
          </div>
        </DashboardSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardSection
          description="Workspace plan cache counts. Billing provider state remains the source of truth."
          title="Plan mix"
        >
          <AdminBasicTable
            headers={["Plan", "Workspaces"]}
            rows={workspacePlans.map((plan) => [
              planMeta[plan].label,
              formatNumber(overview.planCounts[plan]),
            ])}
          />
        </DashboardSection>

        <DashboardSection
          description="Newest accounts to inspect when support needs user context."
          title="Recent signups"
        >
          <AdminBasicTable
            headers={["User", "Created"]}
            rows={overview.recentUsers.map((item) => [
              <Link
                className="underline-offset-4 hover:underline"
                href={`/admin/users/${item.id}`}
                key={item.id}
              >
                {item.email}
              </Link>,
              formatDateTime(item.createdAt),
            ])}
          />
        </DashboardSection>

        <DashboardSection
          description="Newest workspaces to check when onboarding or billing looks unusual."
          title="Recent workspaces"
        >
          <AdminBasicTable
            headers={["Workspace", "Created"]}
            rows={overview.recentWorkspaces.map((item) => [
              <Link
                className="flex min-w-0 flex-col gap-1 underline-offset-4 hover:underline"
                href={`/admin/workspaces/${item.id}`}
                key={item.id}
              >
                <span>{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.ownerEmail}
                </span>
              </Link>,
              formatDateTime(item.createdAt),
            ])}
          />
        </DashboardSection>
      </div>
    </>
  );
}

function PriorityPanel({ priority }: { priority: AdminPriority }) {
  const Icon = priority.icon;

  return (
    <div className="rounded-lg border border-border/70 bg-background/50 p-4">
      <div className="flex items-start gap-3">
        <span className="control-surface flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{priority.title}</p>
            <Badge variant={getBadgeVariant(priority.state)}>
              {priority.badge}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {priority.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminQueueCard({ priority }: { priority: AdminPriority }) {
  const Icon = priority.icon;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          {priority.title}
        </CardTitle>
        <CardDescription>{priority.description}</CardDescription>
        <CardAction>
          <Badge variant={getBadgeVariant(priority.state)}>
            {priority.badge}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {priority.state === "clear"
            ? "Monitor this queue during routine checks."
            : "Open the queue and handle the oldest or highest-risk record first."}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild size="sm" variant="outline">
          <Link href={priority.href} prefetch={true}>
            {priority.cta}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function AdminReviewList({ items }: { items: AdminReviewItem[] }) {
  if (!items.length) {
    return (
      <DashboardEmptyState
        action={
          <Button asChild variant="outline">
            <Link href="/admin/audit-logs" prefetch={true}>
              View audit logs
            </Link>
          </Button>
        }
        description="Failed payments, due deletions, at-risk subscriptions, and webhook backlogs are clear."
        icon={CheckCircle2}
        title="No records need review"
        variant="flat"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
          key={item.key}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{item.badge}</Badge>
              <p className="font-medium text-foreground">{item.title}</p>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
            <p className="text-xs text-muted-foreground">{item.meta}</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={item.href} prefetch={true}>
              Open
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

function PulseRow({
  icon: Icon,
  label,
  meta,
  value,
}: {
  icon: LucideIcon;
  label: string;
  meta: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/50 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="control-surface flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

export function AdminOverviewFallback() {
  return (
    <>
      <DashboardSection title="Start here">
        <div className="grid gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="rounded-lg border border-border/70 bg-background/50 p-4"
              key={index}
            >
              <div className="flex items-start gap-3">
                <Skeleton className="size-9 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="mt-3 h-4 w-full rounded-md" />
                  <Skeleton className="mt-2 h-4 w-3/4 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardSection>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} size="sm">
            <CardHeader>
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-32 rounded-md" />
            </CardFooter>
          </Card>
        ))}
      </div>

      <AdminMetricGrid>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            className="rounded-lg border border-border/70 bg-card p-5 shadow-sm"
            key={index}
          >
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="mt-4 h-9 w-20 rounded-md" />
            <Skeleton className="mt-3 h-4 w-36 rounded-md" />
          </div>
        ))}
      </AdminMetricGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        {["Needs review", "Workflow pulse"].map((title) => (
          <DashboardSection key={title} title={title}>
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/50 p-4"
                  key={index}
                >
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-36 rounded-md" />
                    <Skeleton className="mt-2 h-4 w-48 rounded-md" />
                  </div>
                  <Skeleton className="h-9 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </DashboardSection>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {["Plan mix", "Recent signups", "Recent workspaces"].map((title) => (
          <DashboardSection key={title} title={title}>
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="flex items-center justify-between gap-4"
                  key={index}
                >
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </DashboardSection>
        ))}
      </div>
    </>
  );
}
