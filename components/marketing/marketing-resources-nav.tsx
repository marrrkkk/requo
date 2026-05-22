"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { resourceLinks } from "@/components/marketing/marketing-data";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const HOVER_OPEN_DELAY_MS = 80;
const HOVER_CLOSE_DELAY_MS = 160;

export function MarketingResourcesNav() {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const openTimerRef = useRef<number | null>(null);

  const cancelOpen = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    cancelClose();
    if (openTimerRef.current !== null) return;
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      setOpen(true);
    }, HOVER_OPEN_DELAY_MS);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelOpen();
    if (closeTimerRef.current !== null) return;
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  }, [cancelOpen]);

  useEffect(
    () => () => {
      cancelOpen();
      cancelClose();
    },
    [cancelOpen, cancelClose],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      cancelOpen();
      cancelClose();
      setOpen(next);
    },
    [cancelOpen, cancelClose],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="public-page-header-link group inline-flex items-center gap-1 transition-colors focus:outline-none data-[state=open]:text-primary"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
      >
        Resources
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={10}
        className="w-56 gap-0 p-1.5"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onPointerDownOutside={() => handleOpenChange(false)}
        onEscapeKeyDown={() => handleOpenChange(false)}
      >
        <span className="px-2.5 pb-1.5 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Legal
        </span>
        {resourceLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium text-foreground/80 outline-none transition-colors hover:bg-transparent hover:text-primary focus-visible:bg-accent focus-visible:text-primary"
            onClick={() => handleOpenChange(false)}
          >
            {link.label}
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}
