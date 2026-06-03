import Link from "next/link";

import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
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
import { getAdminBusinessDetailPath } from "@/features/admin/navigation";
import type { AdminBusinessRow } from "@/features/admin/types";
import { planMeta, type BusinessPlan } from "@/lib/plans";

type AdminBusinessesTableBodyProps = {
  items: AdminBusinessRow[];
  totalItems: number;
  firstItemIndex: number;
  lastItemIndex: number;
};

export function AdminBusinessesTableBody({
  items,
  totalItems,
  firstItemIndex,
  lastItemIndex,
}: AdminBusinessesTableBodyProps) {
  return (
    <Table className="min-w-[72rem] table-fixed">
      <TableCaption className="sr-only">
        {totalItems
          ? `Showing businesses ${firstItemIndex}-${lastItemIndex} of ${totalItems}, newest first.`
          : "No businesses to display."}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[18rem]">Business</TableHead>
          <TableHead className="w-[16rem]">Owner</TableHead>
          <TableHead className="w-[8rem]">Plan</TableHead>
          <TableHead className="w-[8rem] text-right">Members</TableHead>
          <TableHead className="w-[10rem]">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const href = getAdminBusinessDetailPath(item.id);

          return (
            <TableRow className="group/row" key={item.id}>
              <TableCell className="w-[18rem]">
                <div className="table-meta-stack max-w-full">
                  <TruncatedTextWithTooltip
                    className="table-link"
                    href={href}
                    prefetch={true}
                    text={item.name}
                  />
                  <TruncatedTextWithTooltip
                    className="table-supporting-text"
                    href={href}
                    prefetch={true}
                    text={item.slug}
                  />
                </div>
              </TableCell>
              <TableCell className="w-[16rem]">
                <TruncatedTextWithTooltip
                  className="table-emphasis"
                  href={href}
                  prefetch={true}
                  text={item.ownerEmail}
                />
              </TableCell>
              <TableCell className="w-[8rem]">
                <Link
                  className="inline-flex max-w-full"
                  href={href}
                  prefetch={true}
                >
                  <AdminBusinessPlanBadge plan={item.plan} />
                </Link>
              </TableCell>
              <TableCell className="w-[8rem] text-right tabular-nums">
                <Link
                  className="block text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                  href={href}
                  prefetch={true}
                >
                  {item.memberCount.toLocaleString()}
                </Link>
              </TableCell>
              <TableCell className="w-[10rem]">
                <Link
                  className="block text-sm text-muted-foreground transition-colors hover:text-primary group-hover/row:text-primary"
                  href={href}
                  prefetch={true}
                >
                  {formatAdminDate(item.createdAt)}
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function AdminBusinessPlanBadge({ plan }: { plan: BusinessPlan }) {
  return (
    <Badge variant={plan === "free" ? "outline" : "secondary"}>
      {planMeta[plan].label}
    </Badge>
  );
}

function formatAdminDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
