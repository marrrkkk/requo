import { BookCopy, TextQuote } from "lucide-react";

import {
  DashboardDetailLayout,
  DashboardEmptyState,
  DashboardMetaPill,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BusinessKnowledgePage() {
  const { businessContext } = await getBusinessOwnerPageContext();
  const knowledgeData = await getKnowledgeDashboardData(businessContext.business.id);
  const readyFileCount = knowledgeData.files.filter((file) =>
    Boolean(file.extractedText?.trim()),
  ).length;
  const contextSourceCount = readyFileCount + knowledgeData.faqs.length;

  return (
    <>
      <PageHeader
        eyebrow="Responses"
        title="Knowledge base"
        description="Upload files and FAQs used in replies and AI context."
        actions={
          <>
            <DashboardMetaPill>{knowledgeData.files.length} files</DashboardMetaPill>
            <DashboardMetaPill>{knowledgeData.faqs.length} FAQs</DashboardMetaPill>
            <DashboardMetaPill>{contextSourceCount} ready sources</DashboardMetaPill>
          </>
        }
      />

      <DashboardDetailLayout className="xl:grid-cols-[1.1fr_0.9fr]">
        <div className="dashboard-side-stack">
          <DashboardSection title="Upload a knowledge file">
            <KnowledgeFileUploadForm action={uploadKnowledgeFileAction} />
          </DashboardSection>

          <DashboardSection title="Uploaded files">
            {knowledgeData.files.length ? (
              <div className="flex flex-col gap-4">
                {knowledgeData.files.map((file) => (
                  <div
                    className="soft-panel p-5"
                    key={file.id}
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
                          <span className="dashboard-meta-pill min-h-0 px-3 py-1">
                            {formatKnowledgeFileSize(file.fileSize)}
                          </span>
                          <span className="dashboard-meta-pill min-h-0 px-3 py-1">
                            {formatKnowledgeDate(file.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                        <div className="info-tile bg-muted/20 p-4 shadow-none">
                          <p className="meta-label">Text preview</p>
                          <p className="mt-3 text-sm leading-7 text-foreground">
                            {getKnowledgeTextPreview(file.extractedText) ??
                              "No extracted text was stored for this file."}
                          </p>
                        </div>

                        <div className="info-tile flex flex-col gap-3 bg-muted/20 p-4 shadow-none">
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
                action={
                  <Button asChild variant="outline">
                    <a href="#knowledge-file-upload">Upload a file</a>
                  </Button>
                }
                description="No files yet."
                icon={BookCopy}
                title="No knowledge files yet"
                variant="section"
              />
            )}
          </DashboardSection>
        </div>

        <div className="dashboard-side-stack">
          <DashboardSection title="Add an FAQ">
            <KnowledgeFaqForm
              action={createKnowledgeFaqAction}
              submitLabel="Add FAQ"
              submitPendingLabel="Adding FAQ..."
              idPrefix="knowledge-faq-create"
            />
          </DashboardSection>

          <DashboardSection title="Business FAQs">
            {knowledgeData.faqs.length ? (
              <div className="flex flex-col gap-4">
                {knowledgeData.faqs.map((faq) => (
                  <KnowledgeFaqCard
                    key={faq.id}
                    deleteAction={deleteKnowledgeFaqAction.bind(null, faq.id)}
                    faq={faq}
                    updateAction={updateKnowledgeFaqAction.bind(null, faq.id)}
                  />
                ))}
              </div>
            ) : (
              <DashboardEmptyState
                action={
                  <Button asChild variant="outline">
                    <a href="#knowledge-faq-create-question">Add an FAQ</a>
                  </Button>
                }
                description="No FAQs yet."
                icon={TextQuote}
                title="No FAQs yet"
                variant="section"
              />
            )}
          </DashboardSection>
        </div>
      </DashboardDetailLayout>
    </>
  );
}
