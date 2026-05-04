import { BrandMark } from "@/components/shared/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignupLoading() {
  return (
    <div className="auth-page relative xl:overflow-hidden xl:py-0">
      <div className="absolute left-6 top-6 z-10 sm:left-8 sm:top-8 xl:left-10 xl:top-10">
        <BrandMark subtitle={null} />
      </div>
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-10 px-5 py-10 sm:px-6 xl:grid xl:h-screen xl:grid-cols-[1fr_auto_1fr] xl:items-center xl:gap-16 xl:px-8 xl:py-0">
        <div className="flex w-full justify-center xl:justify-end">
          <div className="flex w-full max-w-[26rem] flex-col gap-8 pt-12 xl:pt-0">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-[2.35rem] w-48 rounded-lg sm:w-64" />
                <Skeleton className="h-5 w-56 rounded-md" />
              </div>
            </div>
            <div>
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
                    <span className="bg-background px-3">
                      <Skeleton className="h-3 w-36 rounded-sm" />
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2.5">
                    <Skeleton className="h-4 w-20 rounded-sm" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Skeleton className="h-4 w-24 rounded-sm" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Skeleton className="h-4 w-16 rounded-sm" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>

                <Skeleton className="h-11 w-full rounded-md" />

                <div className="flex justify-center pt-1">
                  <Skeleton className="h-5 w-48 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden h-[40rem] w-px shrink-0 bg-border/70 xl:block" />
        <div className="flex w-full justify-center xl:justify-start">
          <div className="hidden xl:flex xl:w-full xl:max-w-[28rem] xl:flex-col xl:justify-center">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-[2.5rem] w-64 rounded-lg" />
                <Skeleton className="h-6 w-11/12 rounded-md" />
              </div>
              <div className="mt-2 grid gap-8">
                <div className="flex items-start gap-5">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex w-full flex-col gap-2 pt-1">
                    <Skeleton className="h-5 w-32 rounded-sm" />
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-4/5 rounded-sm" />
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex w-full flex-col gap-2 pt-1">
                    <Skeleton className="h-5 w-32 rounded-sm" />
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-4/5 rounded-sm" />
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex w-full flex-col gap-2 pt-1">
                    <Skeleton className="h-5 w-32 rounded-sm" />
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-4/5 rounded-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
