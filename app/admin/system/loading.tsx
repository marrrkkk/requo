import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function FeedRowFallback({ lines = 2 }: { lines?: 2 | 3 }) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 p-3">
      <Skeleton className="h-4 w-2/3 rounded-md" />
      <Skeleton className="h-3 w-1/2 rounded-md" />
      {lines === 3 ? <Skeleton className="h-3 w-1/3 rounded-md" /> : null}
    </div>
  );
}

export default function AdminSystemLoading() {
  return (
    <DashboardPage>
      <PageHeader
        description="System health, admin access, and configuration."
        title="System"
      />
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5">
            <div className="flex items-center gap-4">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-48 rounded-md" />
                <Skeleton className="h-4 w-full max-w-md rounded-md" />
              </div>
              <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="space-y-2 rounded-lg border border-border/70 p-3"
                  key={index}
                >
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  className="space-y-2 rounded-lg border border-border/70 p-3"
                  key={index}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="size-9 rounded-lg" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-full rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="grid items-start gap-6 xl:grid-cols-3">
          <Card className="min-w-0 xl:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-36 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {Array.from({ length: 3 }).map((_, index) => (
                <FeedRowFallback key={index} lines={2} />
              ))}
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader>
              <Skeleton className="h-5 w-36 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {Array.from({ length: 3 }).map((_, index) => (
                <FeedRowFallback key={index} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}
