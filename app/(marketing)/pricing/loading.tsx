import { Skeleton } from "@/components/ui/skeleton";

/**
 * Structural loading state for the pricing page.
 * Renders section headings and plan card structure synchronously.
 * Uses Skeleton only for dynamic pricing values (currency-dependent amounts).
 */
export default function PricingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-5 py-12 sm:px-6 lg:px-8">
      {/* Page heading — rendered structurally */}
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="eyebrow">PRICING</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          Simple, transparent pricing.
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
          Start free. Upgrade when you grow.
        </p>
        {/* Interval toggle placeholder */}
        <Skeleton className="mt-2 h-10 w-56 rounded-full" />
      </div>

      {/* Plan cards — structure rendered, dynamic prices skeletonized */}
      <div className="grid gap-6 md:grid-cols-3">
        {(["Free", "Pro", "Business"] as const).map((planName) => (
          <div
            className="section-panel flex min-h-[320px] flex-col gap-5 p-6"
            key={planName}
          >
            <p className="text-sm font-semibold text-foreground">{planName}</p>
            {/* Dynamic price value */}
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            {/* Feature list skeleton */}
            <div className="flex flex-1 flex-col gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  className="h-4 w-3/4 rounded-md"
                  key={`${planName}-feature-${i}`}
                />
              ))}
            </div>
            {/* CTA button placeholder */}
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Comparison table heading */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Compare plans
        </h2>
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
    </div>
  );
}
