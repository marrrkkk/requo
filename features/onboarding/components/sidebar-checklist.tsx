"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleDashed,
  Minimize2,
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChecklistItem = {
  id: string;
  title: string;
  complete: boolean;
  href: string;
};

type SidebarChecklistProps = {
  items: ChecklistItem[];
};

export function SidebarChecklist({ items }: SidebarChecklistProps) {
  const [open, setOpen] = useState(false);

  const completedCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (allComplete) {
    return null;
  }

  return (
    <div className="px-4 pb-3 group-data-[collapsible=icon]:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 w-full justify-between gap-2 rounded-lg border-border/70 px-3 text-sm font-medium shadow-none"
          >
            <span>Getting started</span>
            <span className="tabular-nums text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-72 p-0"
          side="right"
          sideOffset={8}
        >
          <div className="flex items-start justify-between border-b border-border/60 px-4 py-3">
            <div>
              <p className="font-heading text-sm font-semibold text-foreground">
                Getting started
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {completedCount}/{totalCount} steps completed
              </p>
            </div>
            <button
              aria-label="Close popover"
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setOpen(false)}
              type="button"
            >
              <Minimize2 className="size-3.5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-4 pt-3 pb-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col py-1">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent/50",
                  item.complete && "opacity-60",
                )}
              >
                {item.complete ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    item.complete
                      ? "text-muted-foreground line-through"
                      : "font-medium text-foreground",
                  )}
                >
                  {item.title}
                </span>
                {item.complete ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                ) : null}
              </Link>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
