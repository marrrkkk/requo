import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspacesLoading() {
  return (
    <div className="min-h-svh w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <BrandMark subtitle="Workspaces" />
          <div className="h-4 w-px bg-border max-sm:hidden" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-2 pb-8">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl rounded-md" />
          <Skeleton className="mt-2 h-5 w-3/4 max-w-xl rounded-md sm:hidden" />
        </div>

        <div className="w-full space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card className="border-border/80 bg-card/98" key={index}>
                  <CardHeader className="gap-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <Skeleton className="size-12 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2 mt-1">
                          <Skeleton className="h-5 w-32 rounded-md" />
                          <Skeleton className="h-4 w-20 rounded-md" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-14 rounded-full" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-10 w-full sm:w-36 rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
