import { Skeleton } from "@/components/ui/skeleton";

export default function InquiryFormLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-60 rounded-md" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
      </div>
      <div className="section-panel space-y-5 p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="flex flex-col gap-2" key={`inquire-field-${index}`}>
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
