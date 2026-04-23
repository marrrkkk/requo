"use client";

import { useState } from "react";
import { ChevronDown, Download, FileImage, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type InquiryExportPopoverProps = {
  pdfHref: string;
  pngHref: string;
};

export function InquiryExportPopover({
  pdfHref,
  pngHref,
}: InquiryExportPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline">
          <Download data-icon="inline-start" />
          Export
          <ChevronDown className="opacity-60" data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 rounded-xl p-1.5">

        <div className="grid gap-0.5">
          <a
            aria-label="Export PDF"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[var(--control-accent-bg)] hover:text-foreground"
            href={pdfHref}
            onClick={() => setOpen(false)}
          >
            <FileText className="size-4" />
            PDF
          </a>

          <a
            aria-label="Export PNG"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[var(--control-accent-bg)] hover:text-foreground"
            href={pngHref}
            onClick={() => setOpen(false)}
          >
            <FileImage className="size-4" />
            PNG
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
