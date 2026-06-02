import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { BillingProvider, SubscriptionStatus } from "@/lib/billing/types";

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
  polar: "Polar",
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

type AdminSubscriptionsTableBodyProps = {
  items: AdminSubscriptionRow[];
};

export function AdminSubscriptionsTableBody({
  items,
}: AdminSubscriptionsTableBodyProps) {
  return (
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
  );
}
