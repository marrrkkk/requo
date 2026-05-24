import { Skeleton } from "@/components/ui/skeleton";

/**
 * The knowledge page immediately redirects to settings/knowledge.
 * This minimal skeleton covers the brief moment before the redirect completes.
 */
export default function BusinessDashboardKnowledgeLoading() {
  return (
    <div className="flex min-h-48 items-center justify-center">
      <Skeleton className="h-5 w-32 rounded-md" />
    </div>
  );
}
