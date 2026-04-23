import { BrandMark } from "@/components/shared/brand-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="auth-page">
      <div className="mx-auto w-full max-w-[30rem]">
        <Card className="auth-form-card gap-0">
          <CardHeader className="gap-4 border-b border-border/70 bg-background/34 pb-6">
            <BrandMark subtitle={null} />
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-4 w-[4.5rem] rounded-md" />
              <Skeleton className="h-10 w-56 rounded-lg" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6 sm:pt-7">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="mx-auto h-5 w-36 rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
