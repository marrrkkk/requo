import { BrandMark } from "@/components/shared/brand-mark";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountProfileLoading() {
  return (
    <div className="min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <BrandMark subtitle="Account" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </header>

        <div className="flex-1 py-8">
          <PageHeader
            eyebrow="Account"
            title={<Skeleton className="h-11 w-64 rounded-xl" />}
            description={
              <span className="block space-y-2">
                <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
                <Skeleton className="h-4 w-4/5 max-w-xl rounded-md" />
              </span>
            }
          />

          <div className="mt-8 space-y-6">
            <Card className="gap-0 border-border/75 bg-card/97">
              <CardHeader className="gap-3 pb-5">
                <Skeleton className="h-7 w-36 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                <div className="space-y-3">
                  <Skeleton className="h-7 w-40 rounded-lg" />
                  <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div className="space-y-2" key={index}>
                      <Skeleton className="h-4 w-28 rounded-md" />
                      <Skeleton className="h-11 w-full rounded-xl" />
                      {index >= 2 ? (
                        <Skeleton className="h-4 w-56 rounded-md" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="toolbar-panel">
              <Skeleton className="h-11 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
