import type { ReactNode } from "react";

import {
  DashboardDetailLayout,
  DashboardPage,
  DashboardSidebarStack,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DashboardDetailPageSkeletonProps = {
  variant?: "inquiry" | "quote";
};

export function DashboardDetailPageSkeleton({
  variant = "inquiry",
}: DashboardDetailPageSkeletonProps) {
  return (
    <DashboardPage>
      <header className="dashboard-detail-header">
        <div className="dashboard-detail-header-copy">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-11 w-full max-w-xl rounded-2xl" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
          </div>
          <div className="dashboard-detail-header-meta">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        </div>
        <div className="dashboard-detail-header-actions">
          <Skeleton className="h-11 w-full rounded-xl sm:w-36" />
        </div>
      </header>

      {variant === "inquiry" ? <InquiryDetailSkeleton /> : <QuoteDetailSkeleton />}
    </DashboardPage>
  );
}

export function DashboardQuoteEditorSkeleton() {
  return (
    <DashboardPage>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>

      <div className="dashboard-detail-layout items-start xl:grid-cols-[minmax(0,1.08fr)_0.92fr]">
        <DashboardSidebarStack className="min-w-0">
          <SectionSkeleton titleWidth="w-32" descriptionWidth="w-56">
            <InfoTileSkeleton />
            <FieldStack />
            <TwoFieldGrid />
            <TwoFieldGrid />
            <FieldStack area />
          </SectionSkeleton>

          <SectionSkeleton
            action={<Skeleton className="h-10 w-28 rounded-xl" />}
            titleWidth="w-28"
            descriptionWidth="w-48"
          >
            {Array.from({ length: 2 }).map((_, index) => (
              <div className="soft-panel p-4" key={index}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-5 w-14 rounded-md" />
                    <Skeleton className="size-9 rounded-lg" />
                  </div>
                  <FieldStack />
                  <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
                    <FieldStack />
                    <FieldStack />
                    <InfoTileSkeleton />
                  </div>
                </div>
              </div>
            ))}
          </SectionSkeleton>

          <SectionSkeleton titleWidth="w-36" descriptionWidth="w-60">
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="flex items-center justify-between gap-4" key={index}>
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
              ))}
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-14 rounded-md" />
                <Skeleton className="h-5 w-28 rounded-md" />
              </div>
            </div>
            <div className="dashboard-actions justify-between">
              <Skeleton className="h-4 w-60 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl sm:w-40" />
            </div>
          </SectionSkeleton>
        </DashboardSidebarStack>

        <QuotePreviewSkeleton className="xl:sticky xl:top-[5.5rem] xl:self-start" />
      </div>
    </DashboardPage>
  );
}

export function DashboardInquiryEditorSkeleton() {
  return (
    <DashboardPage>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
      </div>

      <div className="dashboard-detail-layout items-start xl:grid-cols-[minmax(0,1.08fr)_0.92fr]">
        <DashboardSidebarStack className="min-w-0">
          <SectionSkeleton
            action={
              <>
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </>
            }
            titleWidth="w-32"
            descriptionWidth="w-64"
          >
            <FieldStack />
          </SectionSkeleton>

          <SectionSkeleton titleWidth="w-32" descriptionWidth="w-48">
            <TwoFieldGrid />
            <FieldStack />
          </SectionSkeleton>

          <SectionSkeleton titleWidth="w-32" descriptionWidth="w-64">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldStack />
              <FieldStack />
              <FieldStack />
              <FieldStack area />
            </div>
          </SectionSkeleton>

          <SectionSkeleton titleWidth="w-28" descriptionWidth="w-52">
            <FieldStack />
          </SectionSkeleton>

          <SectionSkeleton titleWidth="w-24" descriptionWidth="w-60">
            <ContentPanel lines={2} labelWidth="w-24" />
            <div className="dashboard-actions justify-between">
              <Skeleton className="h-4 w-64 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl sm:w-40" />
            </div>
          </SectionSkeleton>
        </DashboardSidebarStack>

        <InquiryPreviewSkeleton className="xl:sticky xl:top-[5.5rem] xl:self-start" />
      </div>
    </DashboardPage>
  );
}

function InquiryDetailSkeleton() {
  return (
    <DashboardDetailLayout className="xl:grid-cols-[1.45fr_0.95fr]">
      <DashboardSidebarStack>
        <SectionSkeleton titleWidth="w-28" descriptionWidth="w-48">
          <DashboardStatsGrid className="xl:grid-cols-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <InfoTileSkeleton key={index} />
            ))}
          </DashboardStatsGrid>
          <ContentPanel lines={4} />
        </SectionSkeleton>

        <SectionSkeleton titleWidth="w-32" descriptionWidth="w-44">
          <FeedSkeleton count={2} withAction />
        </SectionSkeleton>

        <div className="dashboard-detail-support-grid">
          <SectionSkeleton titleWidth="w-32" descriptionWidth="w-56">
            <ContentPanel lines={3} />
            <FeedSkeleton count={2} withBody />
          </SectionSkeleton>

          <SectionSkeleton titleWidth="w-28" descriptionWidth="w-44">
            <FeedSkeleton count={3} />
          </SectionSkeleton>
        </div>
      </DashboardSidebarStack>

      <DashboardSidebarStack>
        <SectionSkeleton titleWidth="w-32" descriptionWidth="w-52">
          <InfoTileSkeleton />
          <InfoTileSkeleton />
          <ActionsSkeleton widths={["sm:w-32", "sm:w-28"]} />
        </SectionSkeleton>

        <SectionSkeleton titleWidth="w-28" descriptionWidth="w-44">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <InfoTileSkeleton key={index} />
            ))}
          </div>
          <ActionsSkeleton widths={["sm:w-28", "sm:w-32"]} />
        </SectionSkeleton>

        <SectionSkeleton titleWidth="w-16" descriptionWidth="w-40">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </SectionSkeleton>

        <SectionSkeleton titleWidth="w-28" descriptionWidth="w-40">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </SectionSkeleton>
      </DashboardSidebarStack>
    </DashboardDetailLayout>
  );
}

function QuoteDetailSkeleton() {
  return (
    <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
      <DashboardSidebarStack>
        <QuotePreviewSkeleton />

        <SectionSkeleton titleWidth="w-28" descriptionWidth="w-40">
          <FeedSkeleton count={1} />
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTileSkeleton />
            <InfoTileSkeleton />
          </div>
          <ActionsSkeleton widths={["sm:w-28"]} />
        </SectionSkeleton>

        <SectionSkeleton titleWidth="w-28" descriptionWidth="w-44">
          <FeedSkeleton count={3} />
        </SectionSkeleton>
      </DashboardSidebarStack>

      <DashboardSidebarStack>
        <SectionSkeleton titleWidth="w-36" descriptionWidth="w-44">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <InfoTileSkeleton key={index} />
            ))}
          </div>
        </SectionSkeleton>

        <SectionSkeleton titleWidth="w-28" descriptionWidth="w-44">
          <ContentPanel lines={3} />
          <ContentPanel labelWidth="w-28" lines={2} />
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTileSkeleton />
            <InfoTileSkeleton />
          </div>
          <ActionsSkeleton widths={["sm:w-32", "sm:w-36"]} />
        </SectionSkeleton>

        <SectionSkeleton titleWidth="w-16" descriptionWidth="w-40">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </SectionSkeleton>
      </DashboardSidebarStack>
    </DashboardDetailLayout>
  );
}

function SectionSkeleton({
  children,
  action,
  titleWidth,
  descriptionWidth,
}: {
  children: ReactNode;
  action?: ReactNode;
  titleWidth: string;
  descriptionWidth: string;
}) {
  return (
    <section className="section-panel p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Skeleton className={`h-6 ${titleWidth} rounded-md`} />
            <Skeleton className={`mt-3 h-4 ${descriptionWidth} rounded-md`} />
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoTileSkeleton({ compact = false }: { compact?: boolean } = {}) {
  return (
    <div className="info-tile">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-5 w-full rounded-md" />
        {!compact ? <Skeleton className="h-4 w-24 rounded-md" /> : null}
      </div>
    </div>
  );
}

function FeedSkeleton({
  count,
  withAction = false,
  withBody = false,
}: {
  count: number;
  withAction?: boolean;
  withBody?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div className="dashboard-detail-feed-item" key={index}>
          <div className="dashboard-detail-feed-heading">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-full max-w-sm rounded-md" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </div>
            {withAction ? <Skeleton className="h-9 w-24 rounded-lg" /> : null}
          </div>
          {withBody ? (
            <div className="dashboard-detail-feed-body">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-11/12 rounded-md" />
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ContentPanel({
  lines,
  labelWidth = "w-16",
}: {
  lines: number;
  labelWidth?: string;
}) {
  return (
    <div className="soft-panel px-4 py-4 shadow-none">
      <Skeleton className={`h-3 ${labelWidth} rounded-md`} />
      <div className="mt-3 flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton className="h-4 w-full rounded-md last:w-4/5" key={index} />
        ))}
      </div>
    </div>
  );
}

function FieldStack({ area = false }: { area?: boolean }) {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-4 w-24 rounded-md" />
      <Skeleton className={area ? "h-28 w-full rounded-2xl" : "h-12 w-full rounded-xl"} />
    </div>
  );
}

function TwoFieldGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FieldStack />
      <FieldStack />
    </div>
  );
}

function ActionsSkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="dashboard-actions sm:justify-end">
      {widths.map((width, index) => (
        <Skeleton className={cn("h-11 w-full rounded-xl", width)} key={index} />
      ))}
    </div>
  );
}

function QuotePreviewSkeleton({ className }: { className?: string }) {
  return (
    <article className={cn("section-panel overflow-hidden p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-border/80 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-10 w-56 rounded-xl" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
            <ContentPanel lines={2} labelWidth="w-20" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoTileSkeleton />
            <InfoTileSkeleton />
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.2rem] border border-border/75 bg-background/92">
          <div className="grid grid-cols-[minmax(0,1fr)_4rem_7rem_7rem] gap-0 border-b border-border/80 bg-muted/35 px-4 py-3">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="mx-auto h-4 w-8 rounded-md" />
            <Skeleton className="ml-auto h-4 w-14 rounded-md" />
            <Skeleton className="ml-auto h-4 w-14 rounded-md" />
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_4rem_7rem_7rem] gap-0 border-t border-border/80 px-4 py-3 first:border-t-0"
              key={index}
            >
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="mx-auto h-4 w-6 rounded-md" />
              <Skeleton className="ml-auto h-4 w-12 rounded-md" />
              <Skeleton className="ml-auto h-4 w-14 rounded-md" />
            </div>
          ))}
        </div>

        <div className="soft-panel ml-auto flex w-full max-w-sm flex-col gap-3 px-4 py-4 shadow-none">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="flex items-center justify-between gap-4" key={index}>
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function InquiryPreviewSkeleton({ className }: { className?: string }) {
  return (
    <article className={cn("section-panel overflow-hidden p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-border/80 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-10 w-52 rounded-xl" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
            <ContentPanel lines={2} labelWidth="w-20" />
          </div>
          <div className="dashboard-detail-header-meta">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>

        <DashboardStatsGrid className="xl:!grid-cols-2">
          <InfoTileSkeleton compact />
          <InfoTileSkeleton compact />
          <InfoTileSkeleton compact />
          <InfoTileSkeleton compact />
        </DashboardStatsGrid>

        <ContentPanel lines={4} labelWidth="w-24" />

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTileSkeleton />
          <InfoTileSkeleton />
        </div>
      </div>
    </article>
  );
}
