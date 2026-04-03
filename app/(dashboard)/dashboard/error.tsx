"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps) {
  return (
    <div className="flex min-h-[28rem] items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="gap-4">
          <div className="flex size-12 items-center justify-center rounded-full border bg-destructive/10 text-destructive">
            <AlertTriangle />
          </div>
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Dashboard error</span>
            <CardTitle className="text-3xl">
              This view did not load.
            </CardTitle>
            <CardDescription className="max-w-xl text-sm leading-7">
              The dashboard is still available, but this route hit an unexpected error before rendering.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-xl border border-border/80 bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
            Try this route again. If it keeps failing, go back to the overview and retry from a fresh navigation state.
          </div>
          {process.env.NODE_ENV === "development" ? (
            <div className="rounded-xl border border-border/80 bg-muted/35 px-4 py-3 font-mono text-xs leading-6 text-muted-foreground">
              {error.message}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
          <Button onClick={reset} type="button" variant="outline">
            <RotateCcw data-icon="inline-start" />
            Try again
          </Button>
          <Button asChild>
            <Link href="/dashboard">Back to overview</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
