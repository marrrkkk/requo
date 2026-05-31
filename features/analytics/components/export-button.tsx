"use client";

import { useCallback, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type ExportFormat = "csv" | "pdf";

type ExportButtonProps = {
  businessSlug: string;
  dateRange: { since: string; until: string };
};

export function ExportButton({ businessSlug, dateRange }: ExportButtonProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(format);

      try {
        const response = await fetch(
          `/api/business/${businessSlug}/analytics/export`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              format,
              since: dateRange.since,
              until: dateRange.until,
            }),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const message =
            data?.error ?? `Export failed (${response.status})`;
          toast.error(message);
          return;
        }

        // Stream file download
        const blob = await response.blob();
        const contentDisposition = response.headers.get(
          "Content-Disposition",
        );
        const filenameMatch = contentDisposition?.match(
          /filename="?([^"]+)"?/,
        );
        const filename =
          filenameMatch?.[1] ??
          `analytics-export.${format === "csv" ? "csv" : "pdf"}`;

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();

        // Cleanup
        setTimeout(() => {
          URL.revokeObjectURL(url);
          anchor.remove();
        }, 100);

        toast.success(
          `${format.toUpperCase()} export downloaded successfully.`,
        );
      } catch {
        toast.error("Export failed. Please try again.");
      } finally {
        setExporting(null);
      }
    },
    [businessSlug, dateRange],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting !== null}>
          {exporting ? (
            <Spinner className="size-4" />
          ) : (
            <Download data-icon="inline-start" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={exporting !== null}
          onClick={() => handleExport("csv")}
        >
          <FileSpreadsheet className="size-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={exporting !== null}
          onClick={() => handleExport("pdf")}
        >
          <FileText className="size-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
