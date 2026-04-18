import { DashboardSection, DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FormPerformanceAnalyticsRow } from "@/features/analytics/types";
import { formatAnalyticsPercent } from "@/features/analytics/utils";

export function AnalyticsFormPerformanceTable({
  rows,
}: {
  rows: FormPerformanceAnalyticsRow[];
}) {
  const activeRows = rows.filter(
    (row) =>
      row.viewCount > 0 ||
      row.submissionCount > 0 ||
      row.sentQuoteCount > 0 ||
      row.acceptedQuoteCount > 0,
  );

  if (!activeRows.length) {
    return (
      <DashboardSection
        title="Form performance"
        description="Compare which inquiry forms are attracting visits and turning those visits into quotes."
      >
        <div className="soft-panel border-dashed bg-muted/15 p-5 text-sm leading-6 text-muted-foreground shadow-none">
          Form performance appears here once your public forms start getting visits or submissions.
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Form performance"
      description="Last 30 days of traffic, submissions, and downstream quote conversion by form."
    >
      <DashboardTableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Visitors</TableHead>
              <TableHead className="text-right">Inquiries</TableHead>
              <TableHead className="text-right">Form CVR</TableHead>
              <TableHead className="text-right">Inquiry to quote</TableHead>
              <TableHead className="text-right">Quote to accepted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeRows.map((row) => (
              <TableRow key={row.formId}>
                <TableCell className="min-w-[15rem] whitespace-normal">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold tracking-tight text-foreground">
                        {row.formName}
                      </p>
                      {row.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                      {row.archivedAt ? (
                        <Badge variant="outline">Archived</Badge>
                      ) : row.publicInquiryEnabled ? (
                        <Badge variant="outline">Live</Badge>
                      ) : (
                        <Badge variant="outline">Hidden</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">/{row.formSlug}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {row.viewCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {row.uniqueVisitorCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {row.submissionCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {formatAnalyticsPercent(row.formConversionRate)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {formatAnalyticsPercent(row.inquiryToQuoteRate)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {formatAnalyticsPercent(row.quoteAcceptanceRate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardTableContainer>
    </DashboardSection>
  );
}
