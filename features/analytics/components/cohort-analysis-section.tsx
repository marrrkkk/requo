import { Users } from "lucide-react";

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
import type { CohortRow } from "@/features/analytics/types";

type CohortAnalysisSectionProps = {
  cohorts: CohortRow[];
};

/**
 * Returns a background color class based on the retention rate.
 * Higher retention = stronger green, lower = lighter/gray.
 */
function getRetentionCellColor(rate: number): string {
  if (rate >= 0.5) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
  if (rate >= 0.3) return "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300";
  if (rate >= 0.15) return "bg-emerald-500/8 text-emerald-800 dark:text-emerald-200";
  if (rate > 0) return "bg-emerald-500/4 text-muted-foreground";
  return "bg-muted/50 text-muted-foreground";
}

function formatRate(returned: number, total: number): string {
  if (total === 0) return "—";
  const pct = (returned / total) * 100;
  return `${Math.round(pct)}%`;
}

function formatMonthLabel(cohortMonth: string): string {
  const [year, month] = cohortMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function CohortAnalysisSection({ cohorts }: CohortAnalysisSectionProps) {
  if (cohorts.length === 0) {
    return (
      <Card className="gap-0 bg-background/72">
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cohort analysis
          </CardTitle>
          <CardDescription>
            Cohort analysis requires at least 3 months of data.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Cohort analysis
        </CardTitle>
        <CardDescription>
          Customer retention by first inquiry month. Shows the percentage of
          customers who submitted a new inquiry within each interval.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Cohort</TableHead>
                <TableHead className="text-center w-24">Customers</TableHead>
                <TableHead className="text-center w-28">3 months</TableHead>
                <TableHead className="text-center w-28">6 months</TableHead>
                <TableHead className="text-center w-28">12 months</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((row) => (
                <TableRow key={row.cohortMonth}>
                  <TableCell className="font-medium">
                    {formatMonthLabel(row.cohortMonth)}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.totalCustomers}
                  </TableCell>
                  <TableCell className="text-center p-1">
                    <span
                      className={`inline-flex items-center justify-center rounded px-2 py-1 text-xs font-medium ${getRetentionCellColor(row.totalCustomers > 0 ? row.returnedIn3Months / row.totalCustomers : 0)}`}
                    >
                      {formatRate(row.returnedIn3Months, row.totalCustomers)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center p-1">
                    <span
                      className={`inline-flex items-center justify-center rounded px-2 py-1 text-xs font-medium ${getRetentionCellColor(row.totalCustomers > 0 ? row.returnedIn6Months / row.totalCustomers : 0)}`}
                    >
                      {formatRate(row.returnedIn6Months, row.totalCustomers)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center p-1">
                    <span
                      className={`inline-flex items-center justify-center rounded px-2 py-1 text-xs font-medium ${getRetentionCellColor(row.totalCustomers > 0 ? row.returnedIn12Months / row.totalCustomers : 0)}`}
                    >
                      {formatRate(row.returnedIn12Months, row.totalCustomers)}
                    </span>
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
