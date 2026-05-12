import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <Skeleton className="h-8 w-48 rounded-md" />
      <Skeleton className="h-4 w-full max-w-md rounded-md" />
      <div className="section-panel space-y-4 p-6">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
