import Link from "next/link";

import {
  DashboardEmptyState,
  DashboardSection,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkspaceAuditLogPage } from "@/features/audit/types";
import {
  formatAuditActionSummary,
  formatAuditActorLabel,
  formatAuditEventDetails,
  formatAuditTimestamp,
} from "@/features/audit/utils";

type WorkspaceAuditLogTableProps = {
  buildPageHref: (page: number) => string;
  page: WorkspaceAuditLogPage;
};

export function WorkspaceAuditLogTable({
  buildPageHref,
  page,
}: WorkspaceAuditLogTableProps) {
  if (!page.items.length) {
    return (
      <DashboardEmptyState
        className="border"
        description="Meaningful lifecycle, billing, member, and security actions will appear here as they happen."
        title="No audit events yet"
        variant="section"
      />
    );
  }

  return (
    <DashboardSection
      description="Newest events first. This log records meaningful admin, lifecycle, billing, and security actions."
      title="Workspace audit log"
    >
      <DashboardTableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[11rem]">When</TableHead>
              <TableHead className="min-w-[10rem]">Actor</TableHead>
              <TableHead className="min-w-[13rem]">Action</TableHead>
              <TableHead className="min-w-[8rem]">Business</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.items.map((item) => {
              const timestamp = formatAuditTimestamp(item);

              return (
                <TableRow key={item.id}>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {timestamp.absolute}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timestamp.relative}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {formatAuditActorLabel(item)}
                      </span>
                      {item.source !== "app" ? (
                        <Badge className="w-fit" variant="outline">
                          {item.source}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="text-sm font-medium text-foreground">
                      {formatAuditActionSummary(item)}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    {item.businessId && item.businessName ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-foreground">
                          {item.businessName}
                        </span>
                        {item.businessSlug ? (
                          <span className="text-xs text-muted-foreground">
                            /{item.businessSlug}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Workspace</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="text-sm leading-6 text-muted-foreground">
                      {formatAuditEventDetails(item)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DashboardTableContainer>

      {page.pageCount > 1 ? (
        <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page.page} of {page.pageCount}
          </p>
          <div className="dashboard-actions">
            <Button
              asChild
              disabled={page.page <= 1}
              variant="outline"
            >
              <Link href={buildPageHref(page.page - 1)} prefetch={true}>
                Previous
              </Link>
            </Button>
            <Button
              asChild
              disabled={page.page >= page.pageCount}
              variant="outline"
            >
              <Link href={buildPageHref(page.page + 1)} prefetch={true}>
                Next
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </DashboardSection>
  );
}
