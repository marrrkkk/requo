import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FormPerformanceRow } from "@/features/analytics/types";
import { formatPercent } from "@/features/analytics/utils";

export function AnalyticsFormTable({ rows }: { rows: FormPerformanceRow[] }) {
  if (rows.length === 0) return null;

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle>Form performance</CardTitle>
        <CardDescription>
          Per-form traffic, submissions, and acceptance.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-right">Conversion</TableHead>
                <TableHead className="text-right">Accepted</TableHead>
                <TableHead className="text-right">Accept rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.formId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.formName}</span>
                      {row.isDefault ? (
                        <Badge variant="secondary" className="text-[0.6rem]">
                          Default
                        </Badge>
                      ) : null}
                      {row.archivedAt ? (
                        <Badge variant="outline" className="text-[0.6rem]">
                          Archived
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.viewCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.submissionCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(row.formConversionRate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.acceptedQuoteCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(row.quoteAcceptanceRate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
