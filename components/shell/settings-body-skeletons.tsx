import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Body-only fallbacks for settings pages that render their real
 * <PageHeader /> synchronously and stream the form body via <Suspense>.
 *
 * These intentionally omit the page-header skeleton (which is what the
 * broader skeletons in `dashboard-settings-skeleton.tsx` include).
 */

function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-4 w-24 rounded-md" />
      <Skeleton className={className ?? "h-12 rounded-xl"} />
    </div>
  );
}

function CardSkeleton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("section-panel p-6", className)}>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function TitleBlock({ titleWidth = "w-40", descriptionWidth = "w-56" }) {
  return (
    <div className="space-y-2">
      <Skeleton className={cn("h-6 rounded-md", titleWidth)} />
      <Skeleton className={cn("h-4 rounded-md", descriptionWidth)} />
    </div>
  );
}

export function SettingsFormBodySkeleton() {
  return (
    <div className="dashboard-side-stack">
      <CardSkeleton>
        <TitleBlock />
        <div className="grid gap-4">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton className="h-28 rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </CardSkeleton>
      <CardSkeleton>
        <TitleBlock titleWidth="w-32" descriptionWidth="w-48" />
        <FieldSkeleton />
        <FieldSkeleton className="h-28 rounded-2xl" />
      </CardSkeleton>
    </div>
  );
}

export function SettingsNotificationsBodySkeleton() {
  return (
    <div className="dashboard-side-stack">
      {Array.from({ length: 2 }).map((_, index) => (
        <CardSkeleton key={index}>
          <TitleBlock titleWidth="w-32" descriptionWidth="w-40" />
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/15">
            {Array.from({ length: 4 }).map((__, row) => (
              <div
                className="grid gap-4 border-b border-border/70 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                key={row}
              >
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-4 w-full max-w-sm rounded-md" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </CardSkeleton>
      ))}
    </div>
  );
}

export function SettingsCollectionBodySkeleton() {
  return (
    <div className="dashboard-side-stack">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/75 bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <CardSkeleton>
        <TitleBlock titleWidth="w-32" descriptionWidth="w-44" />
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/50 shadow-sm">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className={cn(index > 0 && "border-t border-border/70")}
              key={index}
            >
              <div className="flex items-start justify-between gap-4 px-4 py-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-11/12 rounded-md" />
                </div>
                <Skeleton className="size-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </CardSkeleton>
    </div>
  );
}

export function SettingsBillingBodySkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-col gap-10">
        <section className="section-panel p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-8 w-40 rounded-lg" />
                <Skeleton className="h-4 w-60 rounded-md" />
              </div>
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="info-tile" key={index}>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="h-6 w-24 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40 rounded-md" />
          <div className="overflow-hidden rounded-2xl border border-border/70">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] gap-4 px-4 py-4",
                  index > 0 && "border-t border-border/70",
                )}
                key={index}
              >
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentHistoryBodySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-40 rounded-md" />
      <div className="overflow-hidden rounded-2xl border border-border/70">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] gap-4 px-4 py-4",
              index > 0 && "border-t border-border/70",
            )}
            key={index}
          >
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BillingStatusCardBodySkeleton() {
  return (
    <section className="section-panel p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-4 w-60 rounded-md" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="info-tile" key={index}>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ManagerBodySkeleton() {
  return (
    <div className="dashboard-side-stack">
      <CardSkeleton>
        <div className="flex items-center justify-between gap-4">
          <TitleBlock titleWidth="w-32" descriptionWidth="w-48" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="rounded-2xl border border-border/70 bg-muted/15 p-5" key={index}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 rounded-md" />
                  <Skeleton className="h-4 w-full max-w-md rounded-md" />
                  <Skeleton className="h-4 w-full max-w-sm rounded-md" />
                </div>
                <Skeleton className="size-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </CardSkeleton>
    </div>
  );
}
