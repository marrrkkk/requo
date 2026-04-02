import { BookCopy, FileStack, Sparkles, TextQuote } from "lucide-react";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
    <div className="flex flex-col gap-6">
      <div className="max-w-3xl flex flex-col gap-2">
        <span className="eyebrow">Knowledge</span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Keep the business context your AI replies should actually use.
        </h1>
        <p className="text-sm leading-7 text-muted-foreground sm:text-base">
          Upload text-based internal files, maintain FAQs, and keep workspace
          knowledge ready for later AI-assisted drafting without overbuilding the
          retrieval layer.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          description="Stored files"
          icon={FileStack}
          title={`${knowledgeData.files.length}`}
        />
        <StatCard
          description="Manual FAQs"
          icon={TextQuote}
          title={`${knowledgeData.faqs.length}`}
        />
        <StatCard
          description="AI-ready sources"
          icon={Sparkles}
          title={`${contextSourceCount}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-6">
          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Upload a knowledge file</CardTitle>
              <CardDescription>
                Keep internal reference documents close to the dashboard and
                ready for later text-based AI context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeFileUploadForm action={uploadKnowledgeFileAction} />
            </CardContent>
          </Card>

          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Uploaded files</CardTitle>
              <CardDescription>
                Newest files appear first. Extracted text is stored for accepted
                text-based files so later AI drafts can reference it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {knowledgeData.files.length ? (
                <div className="flex flex-col gap-4">
                  {knowledgeData.files.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-3xl border bg-background/80 p-4"
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
                            <span className="rounded-full border bg-muted/35 px-3 py-1 text-xs text-muted-foreground">
                              {formatKnowledgeFileSize(file.fileSize)}
                            </span>
                            <span className="rounded-full border bg-muted/35 px-3 py-1 text-xs text-muted-foreground">
                              {formatKnowledgeDate(file.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                          <div className="rounded-3xl border bg-muted/20 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Extracted text preview
                            </p>
                            <p className="mt-3 text-sm leading-7 text-foreground">
                              {getKnowledgeTextPreview(file.extractedText) ??
                                "No extracted text was stored for this file."}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 rounded-3xl border bg-muted/20 p-4">
                            <div className="flex flex-col gap-1">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Content type
                              </p>
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
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BookCopy />
                    </EmptyMedia>
                    <EmptyTitle>No knowledge files yet</EmptyTitle>
                    <EmptyDescription>
                      Upload your first internal text file to start building
                      reusable business context for future AI-assisted drafts.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Add an FAQ</CardTitle>
              <CardDescription>
                Capture the answers your workspace uses repeatedly so internal
                drafting can stay practical and consistent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeFaqForm
                action={createKnowledgeFaqAction}
                submitLabel="Add FAQ"
                submitPendingLabel="Adding FAQ..."
                idPrefix="knowledge-faq-create"
              />
            </CardContent>
          </Card>

          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Workspace FAQs</CardTitle>
              <CardDescription>
                Keep short, reusable internal answers in one place. Existing FAQs
                can be edited or removed inline.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <TextQuote />
                    </EmptyMedia>
                    <EmptyTitle>No FAQs yet</EmptyTitle>
                    <EmptyDescription>
                      Add internal question-and-answer entries for policies,
                      pricing boundaries, or workflow defaults that AI replies
                      should respect later.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof BookCopy;
}) {
  return (
    <Card className="bg-background/75">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-12 items-center justify-center rounded-2xl border bg-muted/25">
          <Icon />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
