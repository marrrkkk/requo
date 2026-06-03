"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for marketing pages. Prevents the entire page from going
 * blank when a server or client error occurs in pricing, legal, or other
 * marketing routes. Renders a minimal recovery UI with retry and navigation.
 */
export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[marketing-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60svh] w-full items-center justify-center px-5 py-16">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Something went wrong
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          We hit an unexpected error loading this page. Try refreshing, or head
          back to the home page.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground/60">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset} variant="outline" size="default">
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
          <Button asChild size="default">
            <Link href="/">
              Go home
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
