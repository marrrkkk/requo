"use client";

import * as React from "react";
import { CircleHelp } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type HelpTooltipProps = {
  label: string;
  content: string;
  className?: string;
};

export function HelpTooltip({
  label,
  content,
  className,
}: HelpTooltipProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const trigger = (
    <button
      aria-label={`${label} info`}
      className={cn(
        "inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/20",
        className,
      )}
      type="button"
    >
      <CircleHelp className="size-3.5" />
    </button>
  );

  if (!mounted) {
    return trigger;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
