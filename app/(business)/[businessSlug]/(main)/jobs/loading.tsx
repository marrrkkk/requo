import { Circle, Clock, CheckCircle2 } from "lucide-react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Jobs"
        description="Track accepted work from start to finish."
      />

      {/* Search bar placeholder */}
      <div className="relative max-w-sm">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Board columns — headers rendered synchronously, card content uses Skeleton */}
      <div className="grid min-h-[360px] grid-cols-1 gap-4 md:grid-cols-3">
        {/* To Do column */}
        <div className="flex min-h-48 flex-col gap-3 rounded-xl bg-muted/50 p-4">
          <div className="flex items-center gap-2">
            <Circle className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">To Do</span>
            <Badge variant="secondary" className="ml-auto">
              <Skeleton className="h-3 w-3 rounded" />
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>

        {/* In Progress column */}
        <div className="flex min-h-48 flex-col gap-3 rounded-xl bg-muted/50 p-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span className="text-sm font-medium">In Progress</span>
            <Badge variant="secondary" className="ml-auto">
              <Skeleton className="h-3 w-3 rounded" />
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>

        {/* Done column */}
        <div className="flex min-h-48 flex-col gap-3 rounded-xl bg-muted/50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            <span className="text-sm font-medium">Done</span>
            <Badge variant="secondary" className="ml-auto">
              <Skeleton className="h-3 w-3 rounded" />
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
