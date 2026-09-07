"use client";

import { useState } from "react";
import { ChevronDown, Download, FileImage, FileText } from "lucide-react";

import { ProFeatureNoticeButton } from "@/components/shared/pro-feature-notice-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type QuoteExportPopoverProps = {
  canExport: boolean;
  pdfHref: string;
  pngHref: string;
};

export function QuoteExportPopover({
  canExport,
  pdfHref,
  pngHref,
}: QuoteExportPopoverProps) {
  const [open, setOpen] = useState(false);

  if (!canExport) {
    return (
      <ProFeatureNoticeButton
        noticeDescription="Upgrade to Pro to export quote records as PDF, PNG, or CSV."
        noticeTitle="Export is a Pro feature."
        variant="outline"
      >
        <Download data-icon="inline-start" />
        Export
        <ChevronDown className="opacity-60" data-icon="inline-end" />
      </ProFeatureNoticeButton>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline">
          <Download data-icon="inline-start" />
          Export
          <ChevronDown className="opacity-60" data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-40 rounded-xl p-1.5"
      >
        <div className="grid gap-0.5">
          <Button asChild variant="ghost" className="w-full justify-start">
            <a
              aria-label="Export PDF"
              href={pdfHref}
              onClick={() => setOpen(false)}
            >
              <FileText data-icon="inline-start" />
              PDF
            </a>
          </Button>

          <Button asChild variant="ghost" className="w-full justify-start">
            <a
              aria-label="Export PNG"
              href={pngHref}
              onClick={() => setOpen(false)}
            >
              <FileImage data-icon="inline-start" />
              PNG
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
