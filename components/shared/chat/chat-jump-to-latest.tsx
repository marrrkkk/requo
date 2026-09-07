"use client";

import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The detached affordance for both chat surfaces: a small centred pill just
 * above the composer reading "Jump to latest", present only while the reader
 * is detached from the bottom. A native button, so keyboard and screen-reader
 * users reach it by tab order alone.
 */
export function ChatJumpToLatest({ onJump }: { onJump: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-2 flex -translate-y-full justify-center">
      <Button
        className="pointer-events-auto rounded-full shadow-md"
        onClick={onJump}
        size="xs"
        type="button"
        variant="secondary"
      >
        <ArrowDown data-icon="inline-start" />
        Jump to latest
      </Button>
    </div>
  );
}
