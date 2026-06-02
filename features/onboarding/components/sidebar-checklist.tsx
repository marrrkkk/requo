"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleDashed,
  Minimize2,
  PartyPopper,
  X,
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

const CHECKLIST_DISMISSED_KEY = "requo:checklist:dismissed";

export function SidebarChecklist({ items }: SidebarChecklistProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const completedCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Check localStorage for dismissal
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (localStorage.getItem(CHECKLIST_DISMISSED_KEY)) {
          setDismissed(true);
        }
      } catch {
        // localStorage unavailable
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Show celebration when all items are complete
  useEffect(() => {
    if (!allComplete || dismissed) return;
    const showTimer = setTimeout(() => {
      setShowCelebration(true);
    }, 0);
    const hideTimer = setTimeout(() => {
      setShowCelebration(false);
    }, 5000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [allComplete, dismissed]);

  function handleDismiss() {
    try {
      localStorage.setItem(CHECKLIST_DISMISSED_KEY, new Date().toISOString());
    } catch {
      // localStorage unavailable
    }
    setDismissed(true);
    setOpen(false);
  }

  if (dismissed) {
    return null;
  }

  // Show celebration state when all complete
  if (allComplete && showCelebration) {
    return (
      <div className="px-4 pb-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
          <PartyPopper className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">All set!</p>
            <p className="text-[10px] text-muted-foreground">You&apos;ve completed all getting started steps.</p>
          </div>
          <button
            aria-label="Dismiss"
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            type="button"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
    );
  }

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
                  "flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-accent/50",
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
              </Link>
            ))}
          </div>

          {/* Dismiss option */}
          <div className="border-t border-border/60 px-4 py-2">
            <button
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={handleDismiss}
              type="button"
            >
              Hide checklist
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
