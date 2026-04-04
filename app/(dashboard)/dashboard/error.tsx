"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { usePathname } from "next/navigation";

import { StatePageCard } from "@/components/shared/state-page-card";
import { Button } from "@/components/ui/button";
import {
  getWorkspaceDashboardPath,
  getWorkspaceDashboardSlugFromPathname,
  workspaceHubPath,
} from "@/features/workspaces/routes";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps) {
  const pathname = usePathname();
  const workspaceSlug = getWorkspaceDashboardSlugFromPathname(pathname);
  const overviewHref = workspaceSlug
    ? getWorkspaceDashboardPath(workspaceSlug)
    : workspaceHubPath;

  return (
    <StatePageCard
      actions={
        <>
          <Button onClick={reset} type="button" variant="outline">
            <RotateCcw data-icon="inline-start" />
            Try again
          </Button>
          <Button asChild>
            <Link href={overviewHref}>Back to overview</Link>
          </Button>
        </>
      }
      description="The dashboard is still available, but this route hit an unexpected error before rendering."
      eyebrow="Dashboard error"
      media={
        <div className="flex size-12 items-center justify-center rounded-full border bg-destructive/10 text-destructive">
          <AlertTriangle />
        </div>
      }
      title="This view did not load."
    >
      <div className="state-card-note">
        Try this route again. If it keeps failing, go back to the overview and
        retry from a fresh navigation state.
      </div>
      {process.env.NODE_ENV === "development" ? (
        <div className="rounded-xl border border-border/80 bg-muted/35 px-4 py-3 font-mono text-xs leading-6 text-muted-foreground">
          {error.message}
        </div>
      ) : null}
    </StatePageCard>
  );
}
