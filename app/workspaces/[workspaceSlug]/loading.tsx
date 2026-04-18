import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceLoading() {
  return (
    <div className="min-h-svh w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <BrandMark subtitle="Loading..." />
          <div className="h-4 w-px bg-border max-sm:hidden" />
          <Button
            className="max-sm:hidden"
            size="sm"
            variant="ghost"
            disabled
          >
            <ArrowLeft data-icon="inline-start" className="size-4" />
            All workspaces
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <Skeleton className="h-10 max-w-md rounded-lg sm:h-11" />
            <Skeleton className="mt-2 h-5 w-full max-w-2xl rounded-md" />
          </div>

          <div className="grid flex-1 gap-6 xl:grid-cols-3">
            <section className="space-y-4 xl:col-span-2">
              <div className="w-full">
                <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="inline-flex h-10 w-full max-w-[19rem] items-center gap-0.5 rounded-lg border border-border/80 bg-[var(--table-header-bg)] p-1 sm:w-fit">
                    <Skeleton className="h-8 flex-1 rounded-md sm:w-[9.25rem]" />
                    <Skeleton className="h-8 flex-1 rounded-md sm:w-[8.25rem]" />
                  </div>
                  <Skeleton className="h-9 w-full shrink-0 rounded-md sm:w-40" />
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <Card className="border-border/80 bg-card/98" key={index}>
                        <CardHeader className="gap-3">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <Skeleton className="size-12 shrink-0 rounded-xl" />
                              <div className="mt-1 min-w-0 flex-1 space-y-2">
                                <Skeleton className="h-5 w-32 rounded-md" />
                                <Skeleton className="h-4 w-20 rounded-md" />
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-6 w-12 rounded-full" />
                            <Skeleton className="h-6 w-24 sm:w-32 rounded-full" />
                          </div>
                          <Skeleton className="h-10 w-full rounded-md sm:w-36" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <aside className="xl:col-span-1">
              <div className="sticky top-6">
                <Card>
                  <CardHeader className="pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <Skeleton className="h-3 w-24 rounded-md" />
                        <div className="flex flex-wrap items-center gap-3">
                          <Skeleton className="h-8 w-28 rounded-md" />
                          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-14 shrink-0 rounded-full" />
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-5 pt-6">
                    <div className="space-y-2">
                      <Skeleton className="h-9 w-36 rounded-md" />
                      <Skeleton className="h-4 w-full max-w-sm rounded-md" />
                    </div>
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
