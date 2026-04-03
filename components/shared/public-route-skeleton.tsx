import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PublicRouteSkeletonProps = {
  variant?: "inquiry" | "quote";
};

export function PublicRouteSkeleton({
  variant = "inquiry",
}: PublicRouteSkeletonProps) {
  return (
    <PublicPageShell headerAction={<Skeleton className="h-10 w-36 rounded-lg" />}>
      <PublicHeroSurface className="lg:py-12">
        <div
          className={
            variant === "quote"
              ? "grid gap-10 xl:grid-cols-[minmax(0,0.84fr)_minmax(24rem,1.16fr)] xl:items-start"
              : "grid gap-10 xl:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.8fr)] xl:items-start"
          }
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-12 w-full max-w-xl rounded-xl" />
              <Skeleton className="h-20 w-full max-w-2xl rounded-xl" />
            </div>

            {variant === "quote" ? <QuoteRouteLeadSkeleton /> : <InquiryRouteLeadSkeleton />}
          </div>

          {variant === "quote" ? <QuotePreviewSkeleton /> : <InquiryFormSkeleton />}
        </div>
      </PublicHeroSurface>
    </PublicPageShell>
  );
}

function InquiryRouteLeadSkeleton() {
  return (
    <>
      <div className="grid gap-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>

      <Card className="gap-0 bg-background/92 shadow-none">
        <CardHeader className="gap-3 pb-5">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-sm rounded-md" />
        </CardHeader>
      </Card>
    </>
  );
}

function QuoteRouteLeadSkeleton() {
  return (
    <>
      <Card className="gap-0 bg-background/92 shadow-none">
        <CardHeader className="gap-3 pb-5">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-xs rounded-md" />
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="info-tile shadow-none" key={index}>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="gap-0 bg-background/92 shadow-none">
        <CardHeader className="gap-3 pb-5">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-sm rounded-md" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </CardContent>
      </Card>

      <Card className="gap-0 bg-background/92 shadow-none">
        <CardHeader className="gap-3 pb-5">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-sm rounded-md" />
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-11 w-full rounded-xl sm:w-44" />
        </CardContent>
      </Card>
    </>
  );
}

function InquiryFormSkeleton() {
  return (
    <Card className="gap-0 border-border/75 bg-card/96">
      <CardHeader className="gap-3 pb-5">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-sm rounded-md" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
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
    <article className="section-panel overflow-hidden p-5 sm:p-6 xl:sticky xl:top-6 xl:self-start">
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
