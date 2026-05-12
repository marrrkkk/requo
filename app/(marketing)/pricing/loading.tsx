import { Skeleton } from "@/components/ui/skeleton";

export default function PricingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="section-panel space-y-4 p-6" key={`pricing-card-${index}`}>
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
