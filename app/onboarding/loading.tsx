import { BrandMark } from "@/components/shared/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark subtitle="Onboarding" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </header>

        <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="w-full max-w-xl">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>

              <div className="flex min-h-[19rem] flex-col justify-center gap-8">
                <Skeleton className="h-12 w-full max-w-sm rounded-xl" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>
              </div>

              <div className="flex justify-end">
                <Skeleton className="h-11 w-36 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
