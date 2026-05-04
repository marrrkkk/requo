import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div className="auth-page">
      <div className="mx-auto w-full max-w-[30rem]">
        <Card className="auth-form-card gap-0">
          <CardHeader className="gap-4 border-b border-border/70 bg-background/34 pb-6">
            <BrandMark subtitle={null} />
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-10 w-48 rounded-lg sm:w-56" />
              <Skeleton className="h-5 w-64 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="pt-6 sm:pt-7">
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Skeleton className="h-11 w-full rounded-md" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/70" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3">
                    <Skeleton className="h-3 w-36 rounded-sm" />
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20 rounded-sm" />
                    <Skeleton className="h-4 w-32 rounded-sm" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>

              <Skeleton className="h-11 w-full rounded-md" />

              <div className="flex justify-center pt-1">
                <Skeleton className="h-5 w-48 rounded-sm" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
