import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PublicRouteSkeletonProps = {
  variant?: "inquiry" | "quote";
  previewMode?: boolean;
};

export function PublicRouteSkeleton({
  variant = "inquiry",
  previewMode = false,
}: PublicRouteSkeletonProps) {
  if (variant === "inquiry") {
    return <InquiryRouteSkeleton previewMode={previewMode} />;
  }

  return (
    <PublicPageShell headerAction={<Skeleton className="h-10 w-36 rounded-lg" />}>
      <PublicHeroSurface className="lg:py-12 flex justify-center">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8">
          <QuotePreviewSkeleton />
          <QuoteInteractiveColumnSkeleton />
        </div>
      </PublicHeroSurface>
    </PublicPageShell>
  );
}

function InquiryRouteSkeleton({ previewMode }: { previewMode: boolean }) {
  return (
    <div className="public-page">
      <div className="public-page-stack">
        {previewMode ? (
          <div className="rounded-none border-b border-primary/20 bg-primary/5 px-4 py-3 sm:px-6">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
              <Skeleton className="h-5 w-24 rounded-md" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32 rounded-xl" />
                <Skeleton className="hidden h-10 w-32 rounded-xl sm:block" />
              </div>
            </div>
          </div>
        ) : null}

        <header className="public-page-header">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="size-14 rounded-2xl" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
          </div>
        </header>

        <PublicHeroSurface className="lg:py-12">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.8fr)] xl:items-start">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-4">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-14 w-full max-w-2xl rounded-2xl" />
                <Skeleton className="h-20 w-full max-w-xl rounded-2xl" />
              </div>

              <div className="grid gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} size="sm" className="bg-background/92">
                    <CardHeader className="gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-accent">
                        <Skeleton className="size-4 rounded-sm" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-32 rounded-md" />
                        <Skeleton className="h-4 w-48 rounded-md" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            <InquiryFormSkeleton
              className={cn("xl:sticky xl:top-6", previewMode && "xl:top-24")}
            />
          </div>
        </PublicHeroSurface>
      </div>
    </div>
  );
}

function InquiryFormSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-0 border-border/75 bg-card/96", className)}>
      <CardHeader className="gap-3 pb-5">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-sm rounded-md" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

function QuotePreviewSkeleton() {
  return (
    <article className="section-panel overflow-hidden p-5 sm:p-6 w-full">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-border/80 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-10 w-48 rounded-xl" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
            <div className="soft-panel px-4 py-3 shadow-none">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div className="info-tile h-full shadow-none" key={index}>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-20 rounded-md" />
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
              </div>
            ))}
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

function QuoteInteractiveColumnSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="gap-0 bg-background/94 w-full">
        <CardHeader className="gap-2 pb-5">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-5 w-full max-w-md rounded-md" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 bg-background/94 w-full">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-56 rounded-lg" />
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-11 w-full rounded-xl sm:w-48" />
        </CardContent>
      </Card>
    </div>
  );
}
