import type { ReactNode } from "react";

import {
  DashboardDetailLayout,
  DashboardPage,
  DashboardSection,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DashboardSettingsSkeleton() {
  return <DashboardSettingsIndexSkeleton />;
}

export function DashboardSettingsIndexSkeleton() {
  return <DashboardSettingsGeneralSkeleton />;
}

type DashboardSettingsFormSkeletonProps = {
  variant?: "general" | "quote";
};

export function DashboardSettingsFormSkeleton({
  variant = "general",
}: DashboardSettingsFormSkeletonProps) {
  return variant === "general" ? (
    <DashboardSettingsGeneralSkeleton />
  ) : (
    <DashboardSettingsQuoteSkeleton />
  );
}

export function DashboardSettingsGeneralSkeleton() {
  return (
    <DashboardPage className="dashboard-side-stack">
      <SettingsPageHeader descriptionWidth="w-80" titleWidth="max-w-sm" />

      <SettingsCardSkeleton titleWidth="w-36">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <FieldSkeleton />
          <LogoPreviewSkeleton />
        </div>
      </SettingsCardSkeleton>

      <SettingsCardSkeleton titleWidth="w-36">
        <FieldSkeleton />
        <FieldSkeleton className="h-28 rounded-2xl" />
      </SettingsCardSkeleton>

      <SettingsCardSkeleton titleWidth="w-48">
        <ToggleCardSkeleton />
      </SettingsCardSkeleton>

      <div className="toolbar-panel">
        <div className="flex items-center justify-between gap-4">
          <div />
          <Skeleton className="h-11 w-full rounded-xl sm:w-40" />
        </div>
      </div>

      <SettingsCardSkeleton destructive titleWidth="w-28">
        <Skeleton className="h-4 w-60 rounded-md" />
        <FieldSkeleton />
        <div className="flex justify-end">
          <Skeleton className="h-11 w-full rounded-xl sm:w-36" />
        </div>
      </SettingsCardSkeleton>
    </DashboardPage>
  );
}

export function DashboardSettingsQuoteSkeleton() {
  return (
    <DashboardPage className="dashboard-side-stack">
      <SettingsPageHeader descriptionWidth="w-[22rem]" titleWidth="max-w-sm" />

      <SettingsCardSkeleton titleWidth="w-32">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <FieldSkeleton className="h-36 rounded-2xl" />
      </SettingsCardSkeleton>

      <SettingsCardSkeleton titleWidth="w-28">
        <ToggleCardSkeleton />
      </SettingsCardSkeleton>

      <div className="toolbar-panel">
        <div className="flex items-center justify-between gap-4">
          <div />
          <Skeleton className="h-11 w-full rounded-xl sm:w-44" />
        </div>
      </div>
    </DashboardPage>
  );
}

export function DashboardSettingsInquiryListSkeleton() {
  return (
    <DashboardPage className="dashboard-side-stack">
      <div className="flex flex-col gap-4">
        <SettingsPageHeader descriptionWidth="w-[22rem]" titleWidth="max-w-sm" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>

      <SettingsCardSkeleton titleWidth="w-44">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
        </div>
      </SettingsCardSkeleton>

      <SettingsCardSkeleton titleWidth="w-20">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className={cn(
                "flex items-center justify-between gap-4 px-4 py-4",
                index > 0 && "border-t border-border/70",
              )}
              key={index}
            >
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-4 w-56 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="size-4 rounded-sm" />
                <Skeleton className="size-4 rounded-sm" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3">
          <Skeleton className="h-4 w-16 rounded-md" />
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                className={cn(
                  "flex items-center justify-between gap-4 px-4 py-4",
                  index > 0 && "border-t border-border/70",
                )}
                key={index}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-28 rounded-md" />
                  <Skeleton className="h-4 w-44 rounded-md" />
                </div>
                <Skeleton className="size-4 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      </SettingsCardSkeleton>
    </DashboardPage>
  );
}

export function DashboardSettingsInquiryDetailSkeleton() {
  return (
    <DashboardPage>
      <div className="flex flex-col gap-4">
        <SettingsPageHeader descriptionWidth="w-[22rem]" titleWidth="max-w-lg" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>

      <DashboardDetailLayout className="items-start xl:grid-cols-[minmax(0,1.06fr)_21rem]">
        <DashboardSidebarStack>
          <DashboardSection
            description={<Skeleton className="h-4 w-56 rounded-md" />}
            title={<Skeleton className="h-6 w-24 rounded-md" />}
          >
            <div className="grid gap-5">
              <FieldSkeleton />
              <FieldSkeleton />
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <FieldSkeleton />
                <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-border/70 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="soft-panel px-4 py-4 shadow-none">
                  <Skeleton className="h-4 w-64 rounded-md" />
                </div>
                <Skeleton className="h-10 w-full rounded-xl sm:w-48" />
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            description={<Skeleton className="h-4 w-44 rounded-md" />}
            title={<Skeleton className="h-6 w-28 rounded-md" />}
          >
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="soft-panel flex flex-col gap-5 px-4 py-4 shadow-none" key={index}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-28 rounded-md" />
                      <Skeleton className="h-4 w-36 rounded-md" />
                    </div>
                    <div className="flex gap-3">
                      <Skeleton className="h-6 w-12 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FieldSkeleton />
                    <FieldSkeleton />
                  </div>
                </div>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection
            description={<Skeleton className="h-4 w-44 rounded-md" />}
            title={<Skeleton className="h-6 w-28 rounded-md" />}
          >
            <div className="grid gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="soft-panel flex flex-col gap-5 px-4 py-4 shadow-none" key={index}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-28 rounded-md" />
                      <Skeleton className="h-4 w-24 rounded-md" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="size-8 rounded-lg" />
                      <Skeleton className="size-8 rounded-lg" />
                      <Skeleton className="size-8 rounded-lg" />
                    </div>
                  </div>
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_14rem]">
                    <FieldSkeleton />
                    <div className="soft-panel flex items-center px-4 py-4 shadow-none">
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </div>
                  </div>
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <FieldSkeleton className="h-20 rounded-2xl" />
                    <div className="soft-panel flex items-center gap-3 px-4 py-4 shadow-none">
                      <Skeleton className="h-6 w-12 rounded-full" />
                      <Skeleton className="h-4 w-10 rounded-md" />
                    </div>
                    <div className="soft-panel flex items-center gap-3 px-4 py-4 shadow-none">
                      <Skeleton className="h-6 w-14 rounded-full" />
                      <Skeleton className="h-4 w-16 rounded-md" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-36 rounded-xl" />
          </DashboardSection>

          <DashboardSection
            description={<Skeleton className="h-4 w-56 rounded-md" />}
            title={<Skeleton className="h-6 w-52 rounded-md" />}
          >
            <div className="grid gap-5">
              <div className="soft-panel flex items-center justify-between gap-4 px-4 py-4 shadow-none">
                <Skeleton className="h-6 w-44 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className="soft-panel min-h-40 px-4 py-4 shadow-none" key={index}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <Skeleton className="h-5 w-20 rounded-md" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-20 w-full rounded-2xl" />
                      <Skeleton className="h-4 w-full rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="soft-panel flex items-center gap-4 px-5 py-5 shadow-none">
                  <Skeleton className="size-16 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-8 w-40 rounded-md" />
                  </div>
                </div>
                <div className="info-tile bg-muted/20 shadow-none">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="mt-3 h-4 w-full rounded-md" />
                  <Skeleton className="mt-2 h-4 w-4/5 rounded-md" />
                </div>
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            description={<Skeleton className="h-4 w-28 rounded-md" />}
            title={<Skeleton className="h-6 w-24 rounded-md" />}
          >
            <div className="grid gap-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
              <FieldSkeleton className="h-24 rounded-2xl" />
              <FieldSkeleton className="h-28 rounded-2xl" />
              <div className="grid gap-5 lg:grid-cols-2">
                <FieldSkeleton />
                <FieldSkeleton className="h-20 rounded-2xl" />
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            description={<Skeleton className="h-4 w-20 rounded-md" />}
            title={<Skeleton className="h-6 w-36 rounded-md" />}
          >
            <div className="flex justify-end">
              <Skeleton className="h-10 w-full rounded-xl sm:w-32" />
            </div>
            <div className="grid gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="soft-panel p-4 shadow-none" key={index}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-20 rounded-md" />
                        <Skeleton className="h-4 w-48 rounded-md" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="size-8 rounded-lg" />
                        <Skeleton className="size-8 rounded-lg" />
                        <Skeleton className="size-8 rounded-lg" />
                      </div>
                    </div>
                    <div className="grid gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
                      <FieldSkeleton />
                      <div className="grid gap-5">
                        <FieldSkeleton />
                        <FieldSkeleton className="h-20 rounded-2xl" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardSection>

          <div className="toolbar-panel">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-56 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl sm:w-40" />
            </div>
          </div>
        </DashboardSidebarStack>

        <DashboardSidebarStack className="xl:sticky xl:top-[5.5rem]">
          <DashboardSection
            description={<Skeleton className="h-4 w-32 rounded-md" />}
            title={<Skeleton className="h-6 w-20 rounded-md" />}
          >
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </DashboardSection>

          <DashboardSection
            description={<Skeleton className="h-4 w-36 rounded-md" />}
            title={<Skeleton className="h-6 w-28 rounded-md" />}
          >
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </DashboardSection>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

export function DashboardSettingsPricingSkeleton() {
  return (
    <DashboardPage>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>

      <DashboardDetailLayout className="xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardSection title={<Skeleton className="h-6 w-40 rounded-md" />}>
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <FieldSkeleton />
            <FieldSkeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </DashboardSection>

        <DashboardSidebarStack>
          {Array.from({ length: 2 }).map((_, sectionIndex) => (
            <DashboardSection
              key={sectionIndex}
              title={<Skeleton className="h-6 w-32 rounded-md" />}
            >
              <div className="grid gap-4">
                {Array.from({ length: 2 }).map((__, entryIndex) => (
                  <div className="soft-panel p-4" key={entryIndex}>
                    <div className="flex flex-col gap-3">
                      <Skeleton className="h-5 w-32 rounded-md" />
                      <Skeleton className="h-4 w-48 rounded-md" />
                      <FieldSkeleton className="h-24 rounded-2xl" />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardSection>
          ))}
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-4 w-24 rounded-md" />
      <Skeleton className={className ?? "h-12 rounded-xl"} />
    </div>
  );
}

function SettingsPageHeader({
  titleWidth = "max-w-lg",
  descriptionWidth = "w-72",
}: {
  titleWidth?: string;
  descriptionWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-20 rounded-md" />
      <Skeleton className={cn("h-11 w-full rounded-2xl", titleWidth)} />
      <Skeleton className={cn("h-4 rounded-md", descriptionWidth)} />
    </div>
  );
}

function SettingsCardSkeleton({
  children,
  titleWidth,
  destructive = false,
}: {
  children: ReactNode;
  titleWidth: string;
  destructive?: boolean;
}) {
  return (
    <section
      className={cn(
        "section-panel p-6",
        destructive && "border-destructive/25",
      )}
    >
      <div className="flex flex-col gap-6">
        <Skeleton className={cn("h-6 rounded-md", titleWidth)} />
        {children}
      </div>
    </section>
  );
}

function ToggleCardSkeleton() {
  return (
    <div className="soft-panel flex items-start gap-3 px-4 py-4 shadow-none">
      <Skeleton className="mt-1 h-6 w-12 rounded-full" />
      <div className="flex min-w-0 flex-1 gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function LogoPreviewSkeleton() {
  return (
    <div className="soft-panel p-4 shadow-none">
      <Skeleton className="h-4 w-28 rounded-md" />
      <div className="soft-panel mt-4 flex min-h-32 items-center justify-center bg-muted/20 p-4 shadow-none">
        <Skeleton className="size-20 rounded-2xl" />
      </div>
    </div>
  );
}
