import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { AiSettingsBodySkeleton } from "@/components/shell/settings-body-skeletons";
import {
  createMemoryEntryAction,
  deleteKnowledgeFileAction,
  deleteMemoryEntryAction,
  retryKnowledgeFileAction,
  updateMemoryEntryAction,
  uploadKnowledgeFileAction,
} from "@/features/memory/actions";
import { KnowledgeManager } from "@/features/memory/components/knowledge-manager";
import {
  getBusinessKnowledgeSummary,
  listBusinessKnowledgeFiles,
  listBusinessMemories,
} from "@/features/memory/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Knowledge base · Settings",
  description:
    "Manage the business knowledge used to ground AI quote drafts.",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

type KnowledgeBaseSettingsPageProps = {
  params: Promise<{ businessSlug: string }>;
};

/**
 * Knowledge base settings page — non-blocking structural shell.
 *
 * Returns the page header synchronously. Dynamic reads (memories, files,
 * summary) are resolved inside a Suspense-wrapped child server component.
 */
export default function KnowledgeBaseSettingsPage({
  params,
}: KnowledgeBaseSettingsPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Knowledge base"
        description="Add facts, files, and context your AI assistant uses when drafting quotes."
      />
      <Suspense fallback={<AiSettingsBodySkeleton />}>
        <KnowledgeBaseContent params={params} />
      </Suspense>
    </>
  );
}

async function KnowledgeBaseContent({
  params,
}: KnowledgeBaseSettingsPageProps) {
  const { businessSlug } = await params;
  const { businessContext } = await getBusinessOperationalPageContext(businessSlug);
  const { business } = businessContext;
  const businessId = business.id;
  const plan = business.plan;
  const slug = business.slug;

  const [memories, knowledgeFiles, summary] = await Promise.all([
    listBusinessMemories(businessId),
    listBusinessKnowledgeFiles(businessId),
    getBusinessKnowledgeSummary(businessId, plan),
  ]);

  // Bind slug into server actions so components only receive (prevState, formData)
  const boundCreateEntry = createMemoryEntryAction.bind(null, slug);
  const boundUpdateEntry = updateMemoryEntryAction.bind(null, slug);
  const boundDeleteEntry = deleteMemoryEntryAction.bind(null, slug);
  const boundUploadFile = uploadKnowledgeFileAction.bind(null, slug);
  const boundDeleteFile = deleteKnowledgeFileAction.bind(null, slug);
  const boundRetryFile = retryKnowledgeFileAction.bind(null, slug);

  return (
    <KnowledgeManager
      createEntryAction={boundCreateEntry}
      deleteEntryAction={boundDeleteEntry}
      deleteFileAction={boundDeleteFile}
      knowledgeFiles={knowledgeFiles}
      memories={memories}
      retryFileAction={boundRetryFile}
      sourceCount={summary.sourceCount}
      sourceLimit={summary.sourceLimit}
      updateEntryAction={boundUpdateEntry}
      uploadFileAction={boundUploadFile}
    />
  );
}
