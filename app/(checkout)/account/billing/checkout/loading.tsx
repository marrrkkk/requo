import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="min-h-svh w-full bg-background">
      {/* Header skeleton */}
      <header className="flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-4 w-20 rounded-md" />
          <div className="h-4 w-px bg-border max-sm:hidden" />
          <Skeleton className="hidden h-8 w-32 rounded-lg sm:block" />
        </div>
        <Skeleton className="h-4 w-28 rounded-md" />
      </header>

      {/* Content skeleton */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10 xl:gap-14">
          {/* Left: Payment form skeleton */}
          <div className="order-2 flex flex-col gap-5 lg:order-1">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-64 rounded-md" />
              <Skeleton className="h-4 w-full max-w-sm rounded-md" />
            </div>
            <div className="section-panel p-6">
              <div className="flex flex-col gap-5">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Right: Order summary skeleton */}
          <div className="order-1 flex flex-col gap-5 lg:order-2">
            <div className="section-panel p-5 sm:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="size-11 rounded-xl" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-28 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-4 w-44 rounded-md" />
                  <Skeleton className="h-4 w-36 rounded-md" />
                </div>
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
