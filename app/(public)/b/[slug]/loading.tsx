import { Skeleton } from "@/components/ui/skeleton";

export default function PublicBusinessLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 py-20">
      <div className="flex flex-col items-center gap-4 text-center">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-4 w-80 rounded-md" />
      </div>
    </div>
  );
}
