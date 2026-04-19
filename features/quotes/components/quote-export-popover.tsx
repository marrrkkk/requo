"use client";

import { useState } from "react";
import { ChevronDown, Download, FileImage, FileText } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type QuoteExportPopoverProps = {
  pdfHref: string;
  pngHref: string;
};

export function QuoteExportPopover({
  pdfHref,
  pngHref,
}: QuoteExportPopoverProps) {
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
      <PopoverContent align="end" className="w-72 rounded-xl p-3">
        <PopoverHeader className="gap-1 px-1">
          <PopoverTitle>Export quote</PopoverTitle>
          <PopoverDescription>
            Download the customer-facing quote in the format you need.
          </PopoverDescription>
        </PopoverHeader>

        <div className="grid gap-2">
          <Button
            asChild
            className="h-auto w-full justify-start px-3 py-3"
            size="sm"
            variant="ghost"
          >
            <a
              aria-label="Export PDF"
              href={pdfHref}
              onClick={() => setOpen(false)}
            >
              <FileText className="mt-0.5" />
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span className="text-sm font-medium text-foreground">PDF</span>
                <span className="text-xs text-muted-foreground">
                  Best for sharing and printing.
                </span>
              </span>
            </a>
          </Button>

          <Button
            asChild
            className="h-auto w-full justify-start px-3 py-3"
            size="sm"
            variant="ghost"
          >
            <a
              aria-label="Export PNG"
              href={pngHref}
              onClick={() => setOpen(false)}
            >
              <FileImage className="mt-0.5" />
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span className="text-sm font-medium text-foreground">PNG</span>
                <span className="text-xs text-muted-foreground">
                  Best for quick previews and image sharing.
                </span>
              </span>
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
