import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountProfileLoading() {
  return (
    <div className="dashboard-side-stack">
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
  );
}
