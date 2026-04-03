import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PublicRouteSkeleton() {
  return (
    <div className="page-wrap py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col gap-6">
        <header className="section-panel flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </header>

        <section className="hero-panel px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-12 w-full max-w-xl rounded-xl" />
                <Skeleton className="h-24 w-full max-w-2xl rounded-xl" />
              </div>

              <div className="grid gap-3">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            </div>

            <Card>
              <CardHeader className="gap-3">
                <Skeleton className="h-8 w-44 rounded-lg" />
                <Skeleton className="h-4 w-full max-w-sm rounded-md" />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
