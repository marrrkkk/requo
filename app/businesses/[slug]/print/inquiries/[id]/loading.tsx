import { Skeleton } from "@/components/ui/skeleton";

export default function InquiryPrintLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-lg rounded-md" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
