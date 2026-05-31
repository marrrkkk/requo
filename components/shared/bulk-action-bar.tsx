"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type BulkActionBarProps = {
  selectedCount: number;
  totalOnPage: number;
  totalMatchingFilters?: number;
  maxSelection: number;
  allOnPageSelected: boolean;
  onSelectAllOnPage: () => void;
  onSelectAllMatchingFilters?: () => void;
  onDeselectAll: () => void;
  children: React.ReactNode;
};

export function BulkActionBar({
  selectedCount,
  totalOnPage,
  totalMatchingFilters,
  maxSelection,
  allOnPageSelected,
  onSelectAllOnPage,
  onSelectAllMatchingFilters,
  onDeselectAll,
  children,
}: BulkActionBarProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedCount > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsExiting(false);
    } else if (isVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedCount, isVisible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCount > 0) {
        onDeselectAll();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedCount, onDeselectAll]);

  if (!mounted || (!isVisible && selectedCount === 0)) {
    return null;
  }

  const content = (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        className="soft-panel motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-bottom-2 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=open]:duration-200 motion-safe:data-[state=open]:ease-(--motion-ease-emphasized) motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:slide-out-to-bottom-2 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=closed]:duration-150 motion-safe:data-[state=closed]:ease-(--motion-ease-standard) data-[state=closed]:pointer-events-none motion-reduce:animate-none flex w-max max-w-2xl items-center justify-between gap-3 border-border/80 bg-background/95 px-4 py-3 shadow-xl backdrop-blur"
        data-state={isExiting ? "closed" : "open"}
        role="toolbar"
        aria-label="Bulk actions"
      >
        <div className="flex items-center gap-3 border-r border-border/50 pr-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          
          <div className="hidden items-center gap-1.5 sm:flex">
            {allOnPageSelected ? (
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={onDeselectAll}
                type="button"
              >
                Deselect all
              </button>
            ) : (
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={onSelectAllOnPage}
                type="button"
              >
                Select page
              </button>
            )}

            {totalMatchingFilters !== undefined &&
              totalMatchingFilters > totalOnPage &&
              onSelectAllMatchingFilters && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                    disabled={selectedCount >= maxSelection}
                    onClick={onSelectAllMatchingFilters}
                    type="button"
                  >
                    Select all
                    {totalMatchingFilters > maxSelection ? ` (max ${maxSelection})` : ""}
                  </button>
                </>
              )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {children}
          <Button
            className="ml-1 size-8 rounded-full"
            onClick={onDeselectAll}
            size="icon"
            variant="ghost"
            aria-label="Cancel selection"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
