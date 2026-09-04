import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssistantChatLoading() {
  return (
    <DashboardPage className="flex flex-col h-full">
      <PageHeader
        title="Assistant"
        description="Ask questions, search data, or create inquiries and quotes"
      />
      <div className="flex-1 min-h-0">
        <Skeleton className="h-full" />
      </div>
    </DashboardPage>
  );
}
