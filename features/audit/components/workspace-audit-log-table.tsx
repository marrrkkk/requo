import Link from "next/link";

import {
  DashboardEmptyState,
  DashboardSection,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      <TooltipProvider delayDuration={300}>
        <DashboardTableContainer>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[10rem]">When</TableHead>
                <TableHead className="w-[12rem]">Actor</TableHead>
                <TableHead className="w-[16rem]">Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => {
                const timestamp = formatAuditTimestamp(item);
                const actorLabel = formatAuditActorLabel(item);
                const actionSummary = formatAuditActionSummary(item);
                const fullAction = item.businessName
                  ? `${actionSummary} in ${item.businessName}`
                  : actionSummary;
                const details = formatAuditEventDetails(item);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="align-top w-[10rem]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex flex-col gap-1 truncate cursor-default">
                            <span className="text-sm font-medium text-foreground truncate" suppressHydrationWarning>
                              {timestamp.absolute}
                            </span>
                            <span className="text-xs text-muted-foreground truncate" suppressHydrationWarning>
                              {timestamp.relative}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent suppressHydrationWarning>
                          {timestamp.absolute} ({timestamp.relative})
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>

                    <TableCell className="align-top w-[12rem]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate text-sm font-medium text-foreground cursor-default">
                            {actorLabel}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{actorLabel}</TooltipContent>
                      </Tooltip>
                    </TableCell>

                    <TableCell className="align-top w-[16rem]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate text-sm font-medium text-foreground cursor-default">
                            {fullAction}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{fullAction}</TooltipContent>
                      </Tooltip>
                    </TableCell>

                    <TableCell className="align-top">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate text-sm leading-6 text-muted-foreground cursor-default">
                            {details}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md whitespace-normal">
                          {details}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DashboardTableContainer>
      </TooltipProvider>

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
