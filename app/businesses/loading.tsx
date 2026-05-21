import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { businessesHubPath } from "@/features/businesses/routes";

export default function BusinessesLoading() {
  return (
    <div className="min-h-svh w-full bg-background">
      {/* Header renders immediately with real brand + static text */}
      <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <BrandMark subtitle="Businesses" href={businessesHubPath} />
          <div className="h-4 w-px bg-border max-sm:hidden" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        {/* Real heading text renders immediately — no skeleton for known copy */}
        <div className="space-y-2 pb-8">
          <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
            Your businesses
          </h1>
          <p className="max-w-2xl text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-[0.96rem]">
            Manage your businesses, settings, and team access.
          </p>
        </div>

        {/* Only dynamic content is skeletonized */}
        <div className="w-full space-y-6">
          <section className="space-y-4">
            <Skeleton className="h-4 w-32 rounded-md" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card className="relative border-border/80 bg-card/98" key={index}>
                  <CardHeader className="gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-6 w-40 rounded-md" />
                        <Skeleton className="h-4 w-32 rounded-md" />
                      </div>
                      <Skeleton className="h-6 w-14 rounded-full" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-16 rounded-md" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
                  </CardContent>
                  <Skeleton className="absolute right-4 bottom-4 size-10 rounded-lg" />
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
