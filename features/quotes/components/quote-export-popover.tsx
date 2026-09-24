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
  /**
   * Render the joined split-button (main action downloads PDF directly,
   * chevron opens the PDF/PNG menu). Defaults to the single popover trigger
   * so existing callers (e.g. invoice detail) keep their current UI.
   */
  split?: boolean;
};

export function QuoteExportPopover({
  canExport,
  pdfHref,
  pngHref,
  split = false,
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

  if (split) {
    return (
      <div className="flex w-full items-center sm:w-auto" data-split-group>
        <Button
          asChild
          className="min-w-0 flex-1 rounded-r-none border-r-0 sm:flex-none"
          type="button"
          variant="outline"
        >
          <a aria-label="Export PDF" href={pdfHref}>
            <Download data-icon="inline-start" />
            Export
          </a>
        </Button>
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <Button
              aria-label="More export options"
              className="shrink-0 rounded-l-none border-l-border/40 px-2"
              type="button"
              variant="outline"
            >
              <ChevronDown className="size-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 rounded-xl p-1.5">
            <ExportMenuItems onSelect={() => setOpen(false)} pdfHref={pdfHref} pngHref={pngHref} />
          </PopoverContent>
        </Popover>
      </div>
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
        <ExportMenuItems onSelect={() => setOpen(false)} pdfHref={pdfHref} pngHref={pngHref} />
      </PopoverContent>
    </Popover>
  );
}

function ExportMenuItems({
  onSelect,
  pdfHref,
  pngHref,
}: {
  onSelect: () => void;
  pdfHref: string;
  pngHref: string;
}) {
  return (
    <div className="grid gap-0.5">
      <Button asChild variant="ghost" className="w-full justify-start">
        <a aria-label="Export PDF" href={pdfHref} onClick={onSelect}>
          <FileText data-icon="inline-start" />
          PDF
        </a>
      </Button>

      <Button asChild variant="ghost" className="w-full justify-start">
        <a aria-label="Export PNG" href={pngHref} onClick={onSelect}>
          <FileImage data-icon="inline-start" />
          PNG
        </a>
      </Button>
    </div>
  );
}
