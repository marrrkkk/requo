"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Copies a reply to the clipboard and confirms it in place.
 *
 * The confirmation is announced to assistive tech through a polite live
 * region, because the only visual change is the icon swap.
 */
export function CopyButton({
  value,
  className,
  label = "Copy reply",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <Button
        aria-label={copied ? "Copied" : label}
        className={cn("text-muted-foreground", className)}
        onClick={() => void handleCopy()}
        size="icon-xs"
        variant="ghost"
      >
        {copied ? <Check /> : <Copy />}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </>
  );
}
