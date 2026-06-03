"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export type NextStepSuggestion = {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

type NextStepBannerProps = {
  suggestion: NextStepSuggestion | null;
};

const BANNER_DISMISSED_PREFIX = "requo:next-step:dismissed:";

export function NextStepBanner({ suggestion }: NextStepBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!suggestion) return;
    const key = `${BANNER_DISMISSED_PREFIX}${suggestion.id}`;
    // Use setTimeout to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      try {
        if (!localStorage.getItem(key)) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [suggestion]);

  if (!suggestion || !visible) {
    return null;
  }

  function handleDismiss() {
    if (!suggestion) return;
    try {
      const key = `${BANNER_DISMISSED_PREFIX}${suggestion.id}`;
      localStorage.setItem(key, new Date().toISOString());
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.03]">
      <div className="flex items-center gap-4 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {suggestion.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {suggestion.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm" variant="default">
            <Link href={suggestion.href}>
              {suggestion.ctaLabel}
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
          <button
            aria-label="Dismiss suggestion"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={handleDismiss}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
