"use client";

import { Minus, MoveVertical, Plus, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_EMAIL_TEMPLATE_BLOCKS } from "@/features/settings/email-templates";

type BlockPaletteProps = {
  blockCount: number;
  disabled?: boolean;
  onAdd: (type: "text" | "divider" | "spacer") => void;
};

export function BlockPalette({ blockCount, disabled, onAdd }: BlockPaletteProps) {
  const remaining = MAX_EMAIL_TEMPLATE_BLOCKS - blockCount;
  const atLimit = remaining <= 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={disabled || atLimit}
          onClick={() => onAdd("text")}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus data-icon="inline-start" />
          <Type data-icon="inline-start" className="size-3.5" aria-hidden="true" />
          Add text
        </Button>
        <Button
          disabled={disabled || atLimit}
          onClick={() => onAdd("divider")}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus data-icon="inline-start" />
          <Minus data-icon="inline-start" className="size-3.5" aria-hidden="true" />
          Add divider
        </Button>
        <Button
          disabled={disabled || atLimit}
          onClick={() => onAdd("spacer")}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus data-icon="inline-start" />
          <MoveVertical data-icon="inline-start" className="size-3.5" aria-hidden="true" />
          Add spacer
        </Button>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {atLimit
          ? `Block limit reached (${MAX_EMAIL_TEMPLATE_BLOCKS} blocks). Remove a block to add another.`
          : `${blockCount} of ${MAX_EMAIL_TEMPLATE_BLOCKS} blocks used.`}
      </p>
    </div>
  );
}
