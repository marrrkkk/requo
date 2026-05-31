import { Skeleton } from "@/components/ui/skeleton";

/**
 * Structural loading state for the (checkout) route group.
 * Renders checkout page frame and step indicators synchronously.
 * Uses <Skeleton> only for pricing and plan details (data-dependent).
 */
export default function CheckoutGroupLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center px-4 py-12 sm:py-16">
      {/* Checkout frame */}
      <div className="w-full max-w-lg">
        {/* Step indicators — rendered synchronously */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              1
            </span>
            <span className="text-sm font-medium text-foreground">Plan</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              2
            </span>
            <span className="text-sm text-muted-foreground">Payment</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              3
            </span>
            <span className="text-sm text-muted-foreground">Confirm</span>
          </div>
        </div>

        {/* Card frame — structural */}
        <div className="min-h-[380px] rounded-xl border border-border bg-background p-6 shadow-sm sm:p-8">
          {/* Section heading placeholder */}
          <div className="mb-6 space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Choose your plan
            </h2>
            <p className="text-sm text-muted-foreground">
              Select the plan that works best for your business.
            </p>
          </div>

          {/* Plan details — data-dependent, use Skeleton */}
          <div className="space-y-4">
            <div className="min-h-[4.5rem] rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>
                <Skeleton className="h-7 w-24 rounded-md" />
              </div>
            </div>

            <div className="min-h-[4.5rem] rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-4 w-44 rounded-md" />
                </div>
                <Skeleton className="h-7 w-24 rounded-md" />
              </div>
            </div>
          </div>

          {/* Pricing summary — data-dependent, use Skeleton */}
          <div className="mt-6 border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total</span>
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
          </div>

          {/* Action button placeholder — structural */}
          <div className="mt-6">
            <div className="h-11 w-full rounded-xl bg-primary/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
