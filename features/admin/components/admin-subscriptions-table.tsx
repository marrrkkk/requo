"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { X } from "lucide-react";

import {
  DashboardActionsRow,
  DashboardEmptyState,
  DashboardSection,
  DashboardTableContainer,
  DashboardToolbar,
} from "@/components/shared/dashboard-layout";
import { DataListPagination } from "@/components/shared/data-list-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminSubscriptionDetailPath } from "@/features/admin/navigation";
import type { AdminSubscriptionRow } from "@/features/admin/types";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type { BillingProvider, SubscriptionStatus } from "@/lib/billing/types";
import {
  billingProviders,
  subscriptionStatuses,
} from "@/lib/db/schema/subscriptions";

type AdminSubscriptionsTableProps = {
  items: AdminSubscriptionRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Current URL-param status filter. Empty string means "all statuses". */
  status: SubscriptionStatus | "";
  /** Current URL-param provider filter. Empty string means "all providers". */
  provider: BillingProvider | "";
};

const STATUS_FILTER_ALL = "all";
const PROVIDER_FILTER_ALL = "all";

const statusLabels: Record<SubscriptionStatus, string> = {
  free: "Free",
  pending: "Pending",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  expired: "Expired",
  incomplete: "Incomplete",
};

const providerLabels: Record<BillingProvider, string> = {
  paddle: "Paddle",
};

const statusBadgeVariant: Record<
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

/**
 * Paginated subscriptions list for `/admin/subscriptions` (Req 6.1).
 *
 * Status + provider filters (Req 6.3) live in URL parameters. Filter
 * changes navigate immediately via `router.replace`, which re-renders
 * the server component and feeds fresh props back in. Keeping the
 * URL as the source of truth avoids a local-state mirror that has to
 * be re-synced on back/forward navigation.
 *
 * Read-only: the override form lives on the detail page. All writes
 * route through the server actions in `features/admin/mutations.ts`,
 * which in turn call `lib/billing/subscription-service.ts` per
 * DESIGN.md.
 */
export function AdminSubscriptionsTable({
  items,
  total,
  page,
  pageSize,
  status,
  provider,
}: AdminSubscriptionsTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();

  const statusValue = status || STATUS_FILTER_ALL;
  const providerValue = provider || PROVIDER_FILTER_ALL;

  const navigate = useCallback(
    (nextStatus: string, nextProvider: string) => {
      const params = new URLSearchParams();

      if (nextStatus !== STATUS_FILTER_ALL) {
        params.set("status", nextStatus);
      }

      if (nextProvider !== PROVIDER_FILTER_ALL) {
        params.set("provider", nextProvider);
      }

      const href = params.size ? `${pathname}?${params.toString()}` : pathname;
      const currentHref = searchParams.size
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

      if (href === currentHref) {
        return;
      }

      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const searchParamsRecord = Object.fromEntries(searchParams.entries());
  const canClear =
    statusValue !== STATUS_FILTER_ALL || providerValue !== PROVIDER_FILTER_ALL;

  return (
    <DashboardSection
      description="Account subscriptions across the platform. Filter by status or provider to narrow results."
      title="All subscriptions"
    >
      <DashboardToolbar>
        <div className="flex flex-col gap-4">
          <div className="data-list-toolbar-summary">
            <p className="text-sm leading-6 text-muted-foreground">
              Filter account subscriptions by status and billing provider.
            </p>
            <p className="data-list-toolbar-count">
              {total} {total === 1 ? "subscription" : "subscriptions"}
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <Field className="min-w-0 w-full sm:w-[14rem]">
              <FieldLabel
                className="meta-label px-0.5"
                htmlFor="admin-subscriptions-status"
              >
                Status
              </FieldLabel>
              <FieldContent>
                <Combobox
                  id="admin-subscriptions-status"
                  onValueChange={(value) => navigate(value, providerValue)}
                  options={[
                    { label: "All statuses", value: STATUS_FILTER_ALL },
                    ...subscriptionStatuses.map((value) => ({
                      label: statusLabels[value],
                      value,
                    })),
                  ]}
                  placeholder="Status"
                  value={statusValue}
                />
              </FieldContent>
            </Field>

            <Field className="min-w-0 w-full sm:w-[14rem]">
              <FieldLabel
                className="meta-label px-0.5"
                htmlFor="admin-subscriptions-provider"
              >
                Provider
              </FieldLabel>
              <FieldContent>
                <Combobox
                  id="admin-subscriptions-provider"
                  onValueChange={(value) => navigate(statusValue, value)}
                  options={[
                    { label: "All providers", value: PROVIDER_FILTER_ALL },
                    ...billingProviders.map((value) => ({
                      label: providerLabels[value] ?? value,
                      value,
                    })),
                  ]}
                  placeholder="Provider"
                  value={providerValue}
                />
              </FieldContent>
            </Field>

            <DashboardActionsRow className="sm:ml-auto">
              <Button
                className="w-full sm:w-auto"
                disabled={!canClear}
                onClick={() => navigate(STATUS_FILTER_ALL, PROVIDER_FILTER_ALL)}
                type="button"
                variant="ghost"
              >
                <X data-icon="inline-start" />
                Clear
              </Button>
              {isPending ? (
                <Spinner
                  aria-hidden="true"
                  className="hidden sm:inline-flex"
                />
              ) : null}
            </DashboardActionsRow>
          </div>
        </div>
      </DashboardToolbar>

      {items.length === 0 ? (
        <DashboardEmptyState
          className="border"
          description={
            canClear
              ? "No subscriptions match the current filters."
              : "No account subscriptions have been created yet."
          }
          title="No subscriptions found"
          variant="section"
        />
      ) : (
        <DashboardTableContainer>
          <Table className="min-w-[56rem]">
            <TableCaption className="sr-only">
              Newest subscriptions appear first.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead className="w-[8rem]">Plan</TableHead>
                <TableHead className="w-[9rem]">Status</TableHead>
                <TableHead className="w-[8rem]">Provider</TableHead>
                <TableHead className="w-[10rem]">Period ends</TableHead>
                <TableHead className="w-[10rem]">Canceled at</TableHead>
                <TableHead className="w-[6rem]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {row.ownerEmail}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {row.userId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[row.status]}>
                      {statusLabels[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {providerLabels[row.provider] ?? row.provider}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(row.currentPeriodEnd)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(row.canceledAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        href={getAdminSubscriptionDetailPath(row.id)}
                        prefetch={true}
                      >
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DashboardTableContainer>
      )}

      <DataListPagination
        currentPage={page}
        pageSize={pageSize}
        pathname={pathname}
        searchParams={searchParamsRecord}
        totalItems={total}
        totalPages={totalPages}
      />
    </DashboardSection>
  );
}
