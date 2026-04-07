import { DashboardPage } from "@/components/shared/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessFormsLoading() {
  return (
    <DashboardPage className="dashboard-side-stack">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-11 w-full max-w-sm rounded-2xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card className="border-border/80 bg-card/98" key={index}>
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <Skeleton className="size-12 rounded-xl" />
                    <div className="min-w-0 space-y-2">
                      <Skeleton className="h-6 w-36 rounded-md" />
                      <Skeleton className="h-4 w-40 rounded-md" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full rounded-xl sm:w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardPage>
  );
}
