import { BookCopy, FileStack, Sparkles, TextQuote } from "lucide-react";

import {
  DashboardDetailLayout,
  DashboardEmptyState,
  DashboardPage,
  DashboardSection,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
import { PageHeader } from "@/components/shared/page-header";
import {
  createKnowledgeFaqAction,
  deleteKnowledgeFaqAction,
  deleteKnowledgeFileAction,
  updateKnowledgeFaqAction,
  uploadKnowledgeFileAction,
} from "@/features/knowledge/actions";
import { KnowledgeFaqCard } from "@/features/knowledge/components/knowledge-faq-card";
import { KnowledgeFaqForm } from "@/features/knowledge/components/knowledge-faq-form";
import { KnowledgeFileDeleteButton } from "@/features/knowledge/components/knowledge-file-delete-button";
import { KnowledgeFileUploadForm } from "@/features/knowledge/components/knowledge-file-upload-form";
import { getKnowledgeDashboardData } from "@/features/knowledge/queries";
import {
  formatKnowledgeDate,
  formatKnowledgeFileSize,
  getKnowledgeTextPreview,
} from "@/features/knowledge/utils";
import { Separator } from "@/components/ui/separator";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

export default async function KnowledgePage() {
  const { workspaceContext } = await requireCurrentWorkspaceContext();
  const knowledgeData = await getKnowledgeDashboardData(
    workspaceContext.workspace.id,
  );
  const readyFileCount = knowledgeData.files.filter((file) =>
    Boolean(file.extractedText?.trim()),
  ).length;
  const contextSourceCount = readyFileCount + knowledgeData.faqs.length;

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Knowledge"
        title="Business context"
        description="Store files and short FAQs for reuse."
      />

      <DashboardStatsGrid className="md:grid-cols-3 xl:grid-cols-3">
        <InfoTile
          description="Files"
          icon={FileStack}
          label="Knowledge files"
          value={`${knowledgeData.files.length}`}
          valueClassName="text-2xl font-semibold tracking-tight"
        />
        <InfoTile
          icon={TextQuote}
          label="FAQs"
          value={`${knowledgeData.faqs.length}`}
          description="Reusable internal answers."
          valueClassName="text-2xl font-semibold tracking-tight"
        />
        <InfoTile
          icon={Sparkles}
          label="Ready sources"
          value={`${contextSourceCount}`}
          description="Files with extracted text plus FAQs."
          valueClassName="text-2xl font-semibold tracking-tight"
        />
      </DashboardStatsGrid>

      <DashboardDetailLayout className="xl:grid-cols-[1.1fr_0.9fr]">
        <div className="dashboard-side-stack">
          <DashboardSection
            description="Add a text-based reference file."
            title="Upload a knowledge file"
          >
            <KnowledgeFileUploadForm action={uploadKnowledgeFileAction} />
          </DashboardSection>

          <DashboardSection
            description="Newest files first."
            title="Uploaded files"
          >
              {knowledgeData.files.length ? (
                <div className="flex flex-col gap-4">
                  {knowledgeData.files.map((file) => (
                    <div
                      key={file.id}
                      className="soft-panel p-4"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex flex-col gap-1">
                            <p className="font-medium text-foreground">
                              {file.title}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {file.fileName}
                            </p>
                          </div>

                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <span className="rounded-md border border-border/80 bg-secondary px-3 py-1 text-xs text-muted-foreground">
                              {formatKnowledgeFileSize(file.fileSize)}
                            </span>
                            <span className="rounded-md border border-border/80 bg-secondary px-3 py-1 text-xs text-muted-foreground">
                              {formatKnowledgeDate(file.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                          <div className="soft-panel bg-muted/20 p-4 shadow-none">
                            <p className="meta-label">Text preview</p>
                            <p className="mt-3 text-sm leading-7 text-foreground">
                              {getKnowledgeTextPreview(file.extractedText) ??
                                "No extracted text was stored for this file."}
                            </p>
                          </div>

                          <div className="soft-panel flex flex-col gap-3 bg-muted/20 p-4 shadow-none">
                            <div className="flex flex-col gap-1">
                              <p className="meta-label">Content type</p>
                              <p className="text-sm text-foreground">
                                {file.contentType}
                              </p>
                            </div>

                            <Separator />

                            <KnowledgeFileDeleteButton
                              action={deleteKnowledgeFileAction.bind(null, file.id)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <DashboardEmptyState
                  description="Upload your first internal text file to start building reusable business context for future AI-assisted drafts."
                  icon={BookCopy}
                  title="No knowledge files yet"
                  variant="section"
                />
              )}
          </DashboardSection>
        </div>

        <div className="dashboard-side-stack">
          <DashboardSection
            description="Save a short reusable answer."
            title="Add an FAQ"
          >
            <KnowledgeFaqForm
              action={createKnowledgeFaqAction}
              submitLabel="Add FAQ"
              submitPendingLabel="Adding FAQ..."
              idPrefix="knowledge-faq-create"
            />
          </DashboardSection>

          <DashboardSection
            description="Edit or remove existing answers."
            title="Workspace FAQs"
          >
              {knowledgeData.faqs.length ? (
                <div className="flex flex-col gap-4">
                  {knowledgeData.faqs.map((faq) => (
                    <KnowledgeFaqCard
                      key={faq.id}
                      faq={faq}
                      updateAction={updateKnowledgeFaqAction.bind(null, faq.id)}
                      deleteAction={deleteKnowledgeFaqAction.bind(null, faq.id)}
                    />
                  ))}
                </div>
              ) : (
                <DashboardEmptyState
                  description="Add internal question-and-answer entries for policies, pricing boundaries, or workflow defaults that AI replies should respect later."
                  icon={TextQuote}
                  title="No FAQs yet"
                  variant="section"
                />
              )}
          </DashboardSection>
        </div>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}
