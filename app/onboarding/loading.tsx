import { BrandMark } from "@/components/shared/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        {/* Fixed brand mark matching actual page layout */}
        <div className="fixed top-4 left-4 z-10 sm:left-6 lg:left-8">
          <BrandMark subtitle={null} />
        </div>

        <div className="flex flex-1 items-center justify-center pt-12 pb-6 sm:pt-8">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex w-full flex-col gap-5">
              {/* Step title and description */}
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Skeleton className="h-7 w-56 rounded-lg" />
                <Skeleton className="h-4 w-72 rounded-md" />
              </div>

              {/* Step indicator matching OnboardingStepper structure */}
              <nav
                aria-label="Onboarding progress"
                className="mx-auto w-full max-w-md"
              >
                <div className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <Skeleton className="size-8 rounded-full" />
                    <Skeleton className="h-3 w-12 rounded-md" />
                  </div>
                  <div className="relative mx-2 h-0.5 flex-1 rounded-full bg-border" />
                  <div className="flex flex-col items-center gap-1.5">
                    <Skeleton className="size-8 rounded-full" />
                    <Skeleton className="h-3 w-14 rounded-md" />
                  </div>
                  <div className="relative mx-2 h-0.5 flex-1 rounded-full bg-border" />
                  <div className="flex flex-col items-center gap-1.5">
                    <Skeleton className="size-8 rounded-full" />
                    <Skeleton className="h-3 w-10 rounded-md" />
                  </div>
                </div>
              </nav>

              {/* Form fields area */}
              <div className="mx-auto w-full max-w-md py-4">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-16 rounded-md" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                </div>
              </div>

              {/* Form actions */}
              <div className="mx-auto flex w-full max-w-md justify-end">
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
