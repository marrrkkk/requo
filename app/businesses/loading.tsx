import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessesLoading() {
  return (
    <div className="min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <BrandMark subtitle="Business hub" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-52 rounded-md" />
              <Skeleton className="h-11 w-72 rounded-xl" />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-8 xl:grid-cols-3">
          <section className="space-y-4 xl:col-span-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-8 w-40 rounded-lg" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card className="border-border/80 bg-card/98" key={index}>
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <Skeleton className="size-12 rounded-xl" />
                        <div className="min-w-0 space-y-2">
                          <Skeleton className="h-6 w-40 rounded-md" />
                          <Skeleton className="h-4 w-28 rounded-md" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-14 rounded-md" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-16 rounded-md" />
                      <Skeleton className="h-6 w-28 rounded-md" />
                      <Skeleton className="h-6 w-20 rounded-md" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <aside className="xl:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <Skeleton className="h-7 w-36 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
