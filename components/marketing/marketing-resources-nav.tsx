"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { resourceLinks } from "@/components/marketing/marketing-data";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const defaultTriggerClass = "public-page-header-link";

export function MarketingResourcesNav({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleOpen = useCallback(() => {
    clearTimer();
    setOpen(true);
  }, [clearTimer]);

  const handleClose = useCallback(() => {
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  }, [clearTimer]);

  const handleContentEnter = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleContentLeave = useCallback(() => {
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 100);
  }, [clearTimer]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(defaultTriggerClass, "gap-1", triggerClassName, "group")}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        Resources
        <span className="nav-underline" aria-hidden="true" />
        <ChevronDown
          aria-hidden="true"
          className="size-3 opacity-50 transition-transform duration-150 group-data-[state=open]:rotate-180"
        />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={4}
        className="w-52 gap-0 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={handleContentEnter}
        onMouseLeave={handleContentLeave}
        onPointerDownOutside={() => setOpen(false)}
        onEscapeKeyDown={() => setOpen(false)}
      >
        {resourceLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center rounded-md px-2.5 py-2 text-[0.84rem] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground"
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}
