import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessFormsLoading() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-32 rounded-2xl" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card className="h-full border-border/80 bg-card/98" key={index}>
              <CardHeader className="gap-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex w-0 min-w-0 flex-1 items-start gap-3">
                    <div className="w-0 min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-6 w-44 max-w-full rounded-md" />
                      <Skeleton className="h-4 w-52 max-w-full rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Skeleton className="h-6 w-28 rounded-full" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-28 rounded-lg" />
                  <Skeleton className="h-9 w-28 rounded-lg" />
                  <Skeleton className="h-9 w-32 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
