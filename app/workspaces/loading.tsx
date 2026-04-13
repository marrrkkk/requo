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
          <Skeleton className="h-8 w-24 rounded-md max-sm:hidden" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4 pb-8">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-5 w-full max-w-2xl rounded-md" />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="space-y-4 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Card className="border-border/80 bg-card/98" key={index}>
                  <CardHeader className="gap-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <Skeleton className="size-12 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-6 w-32 rounded-md" />
                          <Skeleton className="h-4 w-20 rounded-md" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-14 rounded-md" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-24 rounded-md" />
                      <Skeleton className="h-6 w-16 rounded-md" />
                    </div>
                    <Skeleton className="h-10 w-full sm:w-36 rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <aside className="xl:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-32 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
