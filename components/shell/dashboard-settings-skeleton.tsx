import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DashboardSettingsSkeleton() {
  return <DashboardSettingsIndexSkeleton />;
}

export function DashboardSettingsIndexSkeleton() {
  return (
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <DashboardSettingsGeneralSkeletonContent />
      </div>
    </DashboardSettingsShellSkeleton>
  );
}

/**
 * Settings route skeletons render only the main column; `settings/layout.tsx`
 * already provides `DashboardPage`, the tabs, and spacing.
 */
function DashboardSettingsShellSkeleton({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
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
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <DashboardSettingsGeneralSkeletonContent />
      </div>
    </DashboardSettingsShellSkeleton>
  );
}

export function DashboardSettingsQuoteSkeleton() {
  return (
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <SettingsPageHeader descriptionWidth="w-[22rem]" titleWidth="max-w-sm" />

        <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-7">
          <div className="self-start">
            <div className="rounded-3xl border border-border/75 bg-muted/25 p-5 shadow-none sm:p-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-6 w-36 rounded-lg" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>

              <div className="mt-5 rounded-3xl border border-border/65 bg-background/85 p-5">
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div className="flex items-end justify-between gap-3" key={index}>
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-7 w-20 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-border/65 bg-background/85 p-4">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="mt-2 h-4 w-full rounded-md" />
                <Skeleton className="mt-2 h-4 w-11/12 rounded-md" />
                <Skeleton className="mt-2 h-4 w-4/5 rounded-md" />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <section className="section-panel p-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24 rounded-lg" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
                  <FieldSkeleton />
                  <FieldSkeleton />
                </div>
              </div>
            </section>

            <section className="section-panel p-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40 rounded-lg" />
                  <Skeleton className="h-4 w-44 rounded-md" />
                </div>

                <FieldSkeleton className="h-48 rounded-2xl" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardSettingsShellSkeleton>
  );
}

export function DashboardSettingsInquiryListSkeleton() {
  return (
    <div className="dashboard-side-stack">
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
    </div>
  );
}

export function DashboardSettingsInquiryDetailSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-14 rounded-md" />
        <Skeleton className="h-10 w-full max-w-xl rounded-2xl" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1">
            <Skeleton className="h-9 w-[5.25rem] rounded-md" />
            <Skeleton className="h-9 w-[4.75rem] rounded-md" />
            <Skeleton className="h-9 w-[5.75rem] rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg sm:ml-auto sm:w-36" />
        </div>

        <div className="min-w-0 space-y-6">
          <section className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded-lg" />
              <Skeleton className="h-4 w-full max-w-xl rounded-md" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/15 p-4"
                  key={index}
                >
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                  <Skeleton className="h-3 w-full rounded-md" />
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-6">
                <Skeleton className="h-24 rounded-xl" />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="space-y-5">
                    <FieldSkeleton />
                    <div className="grid gap-5 lg:grid-cols-2">
                      <FieldSkeleton />
                      <FieldSkeleton />
                    </div>
                  </div>
                  <Skeleton className="min-h-[12rem] rounded-3xl border border-border/70 bg-background/60" />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40 rounded-lg" />
              <Skeleton className="h-4 w-56 rounded-md" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <InquiryFieldCardSkeleton key={index} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export function DashboardSettingsPricingSkeleton() {
  return (
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-7">
          <div className="self-start">
            <div className="rounded-3xl border border-border/75 bg-muted/25 p-5 shadow-none sm:p-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-6 w-36 rounded-lg" />
                <Skeleton className="h-4 w-44 rounded-md" />
              </div>

              <div className="mt-5 rounded-3xl border border-border/65 bg-background/85 p-5">
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div className="flex items-end justify-between gap-3" key={index}>
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-7 w-10 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-border/65 bg-background/85 p-4">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="mt-2 h-4 w-full rounded-md" />
                <Skeleton className="mt-2 h-4 w-11/12 rounded-md" />
                <Skeleton className="mt-2 h-4 w-4/5 rounded-md" />
              </div>

              <Skeleton className="mt-5 h-11 w-full rounded-xl" />
            </div>
          </div>

          <div className="space-y-5">
            <section className="section-panel p-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40 rounded-md" />
                  <Skeleton className="h-4 w-44 rounded-md" />
                </div>

                <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
                  <FieldSkeleton />
                  <FieldSkeleton />
                </div>
                <FieldSkeleton className="h-24 rounded-2xl" />

                <div className="grid gap-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div className="rounded-2xl border border-border/70 bg-muted/15 p-5" key={index}>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-16 rounded-md" />
                            <Skeleton className="h-4 w-24 rounded-md" />
                          </div>
                          <Skeleton className="size-8 rounded-lg" />
                        </div>
                        <FieldSkeleton />
                        <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
                          <FieldSkeleton />
                          <FieldSkeleton />
                          <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                            <Skeleton className="h-3 w-16 rounded-md" />
                            <Skeleton className="mt-2 h-4 w-20 rounded-md" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-md" />
                  </div>
                  <div className="mt-4 border-t border-border/70 pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <Skeleton className="h-4 w-10 rounded-md" />
                      <Skeleton className="h-5 w-20 rounded-md" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Skeleton className="h-10 w-40 rounded-xl" />
                </div>
              </div>
            </section>

            {Array.from({ length: 2 }).map((_, sectionIndex) => (
              <section className="section-panel p-6" key={sectionIndex}>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32 rounded-md" />
                    <Skeleton className="h-4 w-44 rounded-md" />
                  </div>

                  {Array.from({ length: 2 }).map((__, entryIndex) => (
                    <div className="rounded-3xl border border-border/75 bg-card/97 p-5" key={entryIndex}>
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <Skeleton className="h-6 w-40 rounded-md" />
                            <Skeleton className="h-4 w-56 rounded-md" />
                          </div>
                          <Skeleton className="h-9 w-24 rounded-lg" />
                        </div>

                        <Skeleton className="h-20 w-full rounded-2xl" />

                        <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <Skeleton className="h-4 w-20 rounded-md" />
                            <Skeleton className="h-5 w-16 rounded-md" />
                          </div>
                          <div className="mt-4 space-y-3">
                            {Array.from({ length: 2 }).map((___, itemIndex) => (
                              <div
                                className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-background/80 px-4 py-3"
                                key={itemIndex}
                              >
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32 rounded-md" />
                                  <Skeleton className="h-3 w-24 rounded-md" />
                                </div>
                                <Skeleton className="h-4 w-16 rounded-md" />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Skeleton className="h-9 w-24 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </DashboardSettingsShellSkeleton>
  );
}

export function DashboardSettingsProfileSkeleton() {
  return (
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <SettingsPageHeader descriptionWidth="w-48" titleWidth="max-w-sm" />

        <section className="section-panel p-6">
          <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-7">
            <div className="self-start">
              <div className="soft-panel flex flex-col gap-5 p-5 shadow-none sm:p-6">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-6 w-36 rounded-lg" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>

                <div className="rounded-3xl border border-border/75 bg-background/80 px-5 py-5">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <Skeleton className="size-24 rounded-full" />
                    <div className="w-full space-y-2">
                      <Skeleton className="mx-auto h-5 w-32 rounded-md" />
                      <Skeleton className="mx-auto h-4 w-24 rounded-md" />
                      <Skeleton className="mx-auto h-4 w-40 rounded-md" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/70 pt-5">
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <section className="soft-panel px-5 py-5 shadow-none sm:px-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-36 rounded-lg" />
                    <Skeleton className="h-4 w-40 rounded-md" />
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <FieldSkeleton />
                    <FieldSkeleton />
                  </div>
                </div>
              </section>

              <section className="soft-panel px-5 py-5 shadow-none sm:px-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32 rounded-lg" />
                    <Skeleton className="h-4 w-36 rounded-md" />
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <FieldSkeleton />
                    <FieldSkeleton />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Skeleton className="h-12 w-full rounded-xl sm:w-40" />
        </div>
      </div>
    </DashboardSettingsShellSkeleton>
  );
}

export function DashboardSettingsEmailSkeleton() {
  return (
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <SettingsPageHeader descriptionWidth="w-[24rem]" titleWidth="max-w-sm" />

        <section className="section-panel p-6">
          <div className="flex flex-col gap-6">
            <section className="soft-panel px-5 py-5 shadow-none sm:px-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-36 rounded-lg" />
                  <Skeleton className="h-4 w-52 rounded-md" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton className="h-9 w-24 rounded-lg" key={index} />
                  ))}
                </div>
              </div>
            </section>

            <section className="soft-panel px-5 py-5 shadow-none sm:px-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 rounded-lg" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="mt-3 h-4 w-full rounded-md" />
                </div>

                <div className="grid gap-5">
                  <FieldSkeleton />
                  <FieldSkeleton />
                  <FieldSkeleton className="h-24 rounded-2xl" />
                  <FieldSkeleton />
                  <FieldSkeleton className="h-24 rounded-2xl" />
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="section-panel p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>

            <div className="soft-panel rounded-xl px-5 py-5 shadow-none sm:px-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>
                <Skeleton className="h-px w-full rounded-full" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-10 w-32 rounded-full" />
                  <Skeleton className="h-4 w-36 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Skeleton className="h-12 w-full rounded-xl sm:w-44" />
        </div>
      </div>
    </DashboardSettingsShellSkeleton>
  );
}

export function DashboardSettingsNotificationSkeleton() {
  return (
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <SettingsPageHeader descriptionWidth="w-40" titleWidth="max-w-sm" />

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <Skeleton className="h-6 w-28 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/15">
              {Array.from({ length: 3 }).map((_, index) => (
                <SettingsToggleRowSkeleton key={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/15">
              {Array.from({ length: 4 }).map((_, index) => (
                <SettingsToggleRowSkeleton key={index} />
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Skeleton className="h-10 w-full rounded-xl sm:w-24" />
          <Skeleton className="h-10 w-full rounded-xl sm:w-40" />
        </div>
      </div>
    </DashboardSettingsShellSkeleton>
  );
}

export function DashboardSettingsSecuritySkeleton() {
  return (
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <SettingsPageHeader descriptionWidth="w-[24rem]" titleWidth="max-w-sm" />

        <section className="section-panel p-6">
          <div className="space-y-5">
            <div className="space-y-1">
              <Skeleton className="h-6 w-36 rounded-md" />
              <Skeleton className="h-4 w-52 rounded-md" />
            </div>

            <div className="grid gap-5">
              <FieldSkeleton />
              <div className="grid gap-5 lg:grid-cols-2">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-4 w-48 rounded-md" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Skeleton className="h-10 w-40 rounded-xl" />
            </div>
          </div>
        </section>

        <section className="section-panel p-6">
          <div className="space-y-5">
            <div className="space-y-1">
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="mt-2 h-4 w-56 rounded-md" />
            </div>

            <Skeleton className="h-10 w-44 rounded-xl" />
          </div>
        </section>

        <section className="section-panel border-destructive/25 p-6">
          <div className="space-y-5">
            <div className="space-y-1">
              <Skeleton className="h-6 w-28 rounded-md" />
              <Skeleton className="h-4 w-56 rounded-md" />
            </div>

            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="mt-2 h-4 w-full rounded-md" />
              <Skeleton className="mt-2 h-4 w-5/6 rounded-md" />
            </div>

            <div className="grid gap-5">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>

            <div className="flex justify-end">
              <Skeleton className="h-10 w-40 rounded-xl" />
            </div>
          </div>
        </section>
      </div>
    </DashboardSettingsShellSkeleton>
  );
}

export function DashboardSettingsIntegrationSkeleton() {
  return (
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <SettingsPageHeader descriptionWidth="w-[22rem]" titleWidth="max-w-sm" />

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <Skeleton className="h-6 w-36 rounded-md" />
              <Skeleton className="h-4 w-56 rounded-md" />
            </div>

            <div className="soft-panel flex items-center gap-3 px-4 py-4 shadow-none">
              <Skeleton className="size-5 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>
            </div>

            <div className="flex justify-start">
              <Skeleton className="h-10 w-52 rounded-xl" />
            </div>
          </div>
        </section>
      </div>
    </DashboardSettingsShellSkeleton>
  );
}

export function DashboardSettingsCollectionSkeleton({
  variant = "replies",
}: {
  variant?: "knowledge" | "replies";
}) {
  const metricWidth = variant === "knowledge" ? "w-24" : "w-12";

  return (
    <DashboardSettingsShellSkeleton>
      <div className="dashboard-side-stack">
        <SettingsPageHeader descriptionWidth="w-[20rem]" titleWidth="max-w-sm" />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/75 bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className={`h-8 rounded-md ${metricWidth}`} />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/50 shadow-sm">
              <div className="flex flex-col">
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
            </div>
          </div>
        </section>
      </div>
    </DashboardSettingsShellSkeleton>
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

function InquiryFieldCardSkeleton({
  hasMetaCard = false,
}: {
  hasMetaCard?: boolean;
}) {
  return (
    <div className="soft-panel flex flex-col gap-5 px-4 py-4 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <Skeleton className="size-8 rounded-full" />
      </div>

      <div className={cn("grid gap-4", hasMetaCard ? "xl:grid-cols-[minmax(0,1fr)_12rem]" : "md:grid-cols-2")}>
        <FieldSkeleton />
        {hasMetaCard ? (
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="mt-2 h-4 w-24 rounded-md" />
          </div>
        ) : (
          <FieldSkeleton />
        )}
      </div>
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

function SettingsToggleRowSkeleton() {
  return (
    <div className="grid gap-4 border-b border-border/70 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="space-y-1">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-4 w-full max-w-sm rounded-md" />
      </div>
      <Skeleton className="h-6 w-11 rounded-full" />
    </div>
  );
}

function DashboardSettingsGeneralSkeletonContent() {
  return (
    <>
      <SettingsPageHeader descriptionWidth="w-56" titleWidth="max-w-sm" />

      <SettingsCardSkeleton titleWidth="w-36">
        <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-7">
          <div className="rounded-3xl border border-border/75 bg-muted/25 p-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-6 w-36 rounded-lg" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>

              <div className="mt-5 rounded-3xl border border-border/65 bg-background/85 p-5">
                <div className="flex flex-col items-center gap-4 text-center">
                  <Skeleton className="size-24 rounded-[1.6rem]" />
                  <div className="w-full space-y-2">
                    <Skeleton className="h-5 w-40 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 rounded-lg" />
                <Skeleton className="h-4 w-full max-w-md rounded-md" />
              </div>

              <div className="mt-5 space-y-5">
                <FieldSkeleton />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <FieldSkeleton />
                  <FieldSkeleton />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 rounded-lg" />
                <Skeleton className="h-4 w-full max-w-md rounded-md" />
              </div>

              <div className="mt-5">
                <FieldSkeleton className="h-36 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </SettingsCardSkeleton>

      <SettingsCardSkeleton titleWidth="w-36">
        <div className="space-y-5">
          <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-36 rounded-md" />
            <div className="mt-5">
              <FieldSkeleton />
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-36 rounded-md" />
            <div className="mt-5">
              <FieldSkeleton className="h-32 rounded-2xl" />
            </div>
          </div>
        </div>
      </SettingsCardSkeleton>

      <SettingsCardSkeleton destructive titleWidth="w-28">
        <Skeleton className="h-4 w-60 rounded-md" />
        <FieldSkeleton />
        <div className="flex justify-end">
          <Skeleton className="h-11 w-full rounded-xl sm:w-36" />
        </div>
      </SettingsCardSkeleton>
    </>
  );
}
