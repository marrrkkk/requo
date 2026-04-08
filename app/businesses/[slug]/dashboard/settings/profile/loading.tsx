import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessProfileSettingsLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Account"
        title={<Skeleton className="h-11 w-56 rounded-xl" />}
        description={
          <Skeleton className="h-4 w-56 rounded-md" />
        }
      />

      <div className="mt-8 space-y-6">
        <Card className="gap-0 border-border/75 bg-card/97">
          <CardHeader className="gap-2.5 pb-6">
            <Skeleton className="h-7 w-36 rounded-lg" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-7">
              <div className="space-y-5">
                <div className="rounded-3xl border border-border/75 bg-muted/25 p-5">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton className="h-6 w-32 rounded-lg" />
                    <Skeleton className="h-4 w-40 rounded-md" />
                  </div>

                  <div className="mt-5 rounded-3xl border border-border/65 bg-background/85 p-5">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <Skeleton className="size-24 rounded-full" />
                      <div className="w-full space-y-2">
                        <Skeleton className="h-5 w-36 rounded-md" />
                        <Skeleton className="h-4 w-24 rounded-md" />
                        <Skeleton className="h-4 w-full rounded-md" />
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
              </div>

              <div className="space-y-5">
                {Array.from({ length: 2 }).map((_, sectionIndex) => (
                  <div
                    className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6"
                    key={sectionIndex}
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-36 rounded-lg" />
                      <Skeleton className="h-4 w-full max-w-md rounded-md" />
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      {Array.from({ length: 2 }).map((_, fieldIndex) => (
                        <div className="space-y-2" key={fieldIndex}>
                          <Skeleton className="h-4 w-28 rounded-md" />
                          <Skeleton className="h-11 w-full rounded-xl" />
                          {sectionIndex === 1 ? (
                            <Skeleton className="h-4 w-3/4 rounded-md" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>

        </Card>
      </div>
    </>
  );
}
