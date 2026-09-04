import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { OwnerAssistantChat } from "@/features/owner-assistant/components/owner-assistant-chat";
import { AssistantHistorySidebar } from "@/features/owner-assistant/components/assistant-history-sidebar";
import { loadAssistantSession } from "@/features/owner-assistant/session-service";
import { db } from "@/lib/db/client";
import { ownerAssistantMessages } from "@/lib/db/schema/owner-assistant";
import { asc, eq } from "drizzle-orm";

type OwnerAssistantChatPageProps = {
  params: Promise<{ businessSlug: string; sessionId: string }>;
  searchParams: Promise<{ q?: string }>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Assistant Chat",
  description: "Chat with your business assistant",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo", sessionId: "session_demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

export default function OwnerAssistantChatPage({
  params,
  searchParams,
}: OwnerAssistantChatPageProps) {
  return (
    <DashboardPage className="flex flex-col h-full">
      <PageHeader
        title="Assistant"
        description="Ask questions, search data, or create inquiries and quotes"
      />
      <Suspense fallback={<ChatSkeleton />}>
        <RegionErrorBoundary fallback={<ChatErrorState />}>
          <ChatRegion params={params} searchParams={searchParams} />
        </RegionErrorBoundary>
      </Suspense>
    </DashboardPage>
  );
}

async function ChatRegion({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string; sessionId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { businessSlug, sessionId } = await params;
  const { q } = await searchParams;
  const { user, businessContext } = await getAppShellContext(businessSlug);

  const sessionData = await loadAssistantSession({
    businessId: businessContext.business.id,
    userId: user.id,
    sessionId,
    messageLimit: 100,
  });

  if (!sessionData) {
    notFound();
  }

  const rows = await db
    .select({
      id: ownerAssistantMessages.id,
      role: ownerAssistantMessages.role,
      content: ownerAssistantMessages.content,
      toolName: ownerAssistantMessages.toolName,
      toolCallId: ownerAssistantMessages.toolCallId,
    })
    .from(ownerAssistantMessages)
    .where(eq(ownerAssistantMessages.sessionId, sessionData.sessionId))
    .orderBy(asc(ownerAssistantMessages.createdAt))
    .limit(100);

  return (
    <div className="relative flex flex-1 min-h-0">
      <AssistantHistorySidebar
        businessSlug={businessSlug}
        activeSessionId={sessionData.sessionId}
      />
      <div className="flex-1 min-w-0">
        <OwnerAssistantChat
          businessSlug={businessSlug}
          businessId={businessContext.business.id}
          userId={user.id}
          plan={businessContext.business.plan}
          sessionId={sessionData.sessionId}
          initialMessages={rows.map((row) => ({
            id: row.id,
            role: row.role,
            content: row.content,
            toolName: row.toolName,
            toolCallId: row.toolCallId,
          }))}
          autoPrompt={typeof q === "string" && q.trim() ? q : null}
        />
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 h-full">
      <Skeleton className="h-full" />
    </div>
  );
}

function ChatErrorState() {
  return (
    <div className="flex items-center justify-center h-full p-4">
      <p className="text-sm text-muted-foreground">
        This conversation couldn&apos;t be loaded. Please try again.
      </p>
    </div>
  );
}
