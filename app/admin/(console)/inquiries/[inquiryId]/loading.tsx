import { Skeleton } from "@/components/ui/skeleton";

export default function AdminInquiryDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />
      </div>
      <div className="section-panel space-y-4">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      <div className="section-panel space-y-4">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
