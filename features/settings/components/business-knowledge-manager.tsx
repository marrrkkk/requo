import { Button } from "@/components/ui/button";
import { KnowledgeFaqCard } from "@/features/knowledge/components/knowledge-faq-card";
import { KnowledgeFaqForm } from "@/features/knowledge/components/knowledge-faq-form";
import { KnowledgeFileDeleteButton } from "@/features/knowledge/components/knowledge-file-delete-button";
import { KnowledgeFileUploadForm } from "@/features/knowledge/components/knowledge-file-upload-form";
import type {
  DashboardKnowledgeData,
  KnowledgeFaqActionState,
  KnowledgeFaqDeleteActionState,
  KnowledgeFileActionState,
  KnowledgeFileDeleteActionState,
} from "@/features/knowledge/types";
import {
  formatKnowledgeDate,
  formatKnowledgeFileSize,
  getKnowledgeTextPreview,
} from "@/features/knowledge/utils";

type BusinessKnowledgeManagerProps = {
  knowledgeData: DashboardKnowledgeData;
  uploadFileAction: (
    state: KnowledgeFileActionState,
    formData: FormData,
  ) => Promise<KnowledgeFileActionState>;
  deleteFileAction: (
    fileId: string,
    state: KnowledgeFileDeleteActionState,
    formData: FormData,
  ) => Promise<KnowledgeFileDeleteActionState>;
  createFaqAction: (
    state: KnowledgeFaqActionState,
    formData: FormData,
  ) => Promise<KnowledgeFaqActionState>;
  updateFaqAction: (
    faqId: string,
    state: KnowledgeFaqActionState,
    formData: FormData,
  ) => Promise<KnowledgeFaqActionState>;
  deleteFaqAction: (
    faqId: string,
    state: KnowledgeFaqDeleteActionState,
    formData: FormData,
  ) => Promise<KnowledgeFaqDeleteActionState>;
};

export function BusinessKnowledgeManager({
  knowledgeData,
  uploadFileAction,
  deleteFileAction,
  createFaqAction,
  updateFaqAction,
  deleteFaqAction,
}: BusinessKnowledgeManagerProps) {
  const readyFileCount = knowledgeData.files.filter((file) =>
    Boolean(file.extractedText?.trim()),
  ).length;
  const contextSourceCount = readyFileCount + knowledgeData.faqs.length;

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-7">
      <div className="self-start xl:sticky xl:top-6">
        <div className="soft-panel flex flex-col gap-5 p-5 shadow-none sm:p-6">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Knowledge base
            </p>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Business knowledge
              </h2>
              <p className="text-sm text-muted-foreground">
                Files and FAQs used in drafts and replies.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-5 py-5">
            <div className="grid gap-4">
              <KnowledgeSummaryRow
                label="Files uploaded"
                value={String(knowledgeData.files.length)}
              />
              <KnowledgeSummaryRow
                label="Ready file sources"
                value={String(readyFileCount)}
              />
              <KnowledgeSummaryRow
                label="Saved FAQs"
                value={String(knowledgeData.faqs.length)}
              />
              <KnowledgeSummaryRow
                label="Total ready sources"
                value={String(contextSourceCount)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-4 py-4">
            <p className="text-sm font-medium text-foreground">Best for reusable answers.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Add service details, policies, scope notes, and common questions so AI
              drafts stay accurate.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <a href="#knowledge-file-upload">Upload file</a>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <a href="#knowledge-faq-create-question">Add FAQ</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="section-panel p-6">
            <div className="flex flex-col gap-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Upload knowledge file
                </h2>
                <p className="text-sm text-muted-foreground">
                  Add one reference file at a time.
                </p>
              </div>

              <KnowledgeFileUploadForm action={uploadFileAction} />
            </div>
          </section>

          <section className="section-panel p-6">
            <div className="flex flex-col gap-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Add business FAQ
                </h2>
                <p className="text-sm text-muted-foreground">
                  Save direct answers for common questions.
                </p>
              </div>

              <KnowledgeFaqForm
                action={createFaqAction}
                idPrefix="knowledge-faq-create"
                showSectionHeader={false}
                submitLabel="Add FAQ"
                submitPendingLabel="Adding FAQ..."
              />
            </div>
          </section>
        </div>

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Knowledge files
              </h2>
              <p className="text-sm text-muted-foreground">
                Uploaded reference files for drafting.
              </p>
            </div>

            {knowledgeData.files.length ? (
              <div className="flex flex-col gap-4">
                {knowledgeData.files.map((file) => {
                  const hasReadyText = Boolean(file.extractedText?.trim());

                  return (
                    <div
                      className="rounded-3xl border border-border/75 bg-card/97 p-5"
                      key={file.id}
                    >
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            <p className="text-base font-semibold tracking-tight text-foreground">
                              {file.title}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {file.fileName}
                            </p>
                          </div>

                          <div className="w-full sm:w-auto sm:min-w-32">
                            <KnowledgeFileDeleteButton
                              action={deleteFileAction.bind(null, file.id)}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
                          <div className="soft-panel bg-muted/20 p-4 shadow-none">
                            <p className="meta-label">Text preview</p>
                            <p className="mt-3 text-sm leading-7 text-foreground">
                              {getKnowledgeTextPreview(file.extractedText) ??
                                "No extracted text was stored for this file."}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
                            <div className="grid gap-4">
                              <KnowledgeMetaRow
                                label="Status"
                                value={hasReadyText ? "Ready for replies" : "No extracted text"}
                              />
                              <KnowledgeMetaRow
                                label="File type"
                                value={file.contentType}
                              />
                              <KnowledgeMetaRow
                                label="Size"
                                value={formatKnowledgeFileSize(file.fileSize)}
                              />
                              <KnowledgeMetaRow
                                label="Added"
                                value={formatKnowledgeDate(file.createdAt)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 px-5 py-10 text-center">
                <p className="text-base font-semibold tracking-tight text-foreground">
                  No knowledge files yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload a file to use it in future drafts and replies.
                </p>
                <Button asChild className="mt-5">
                  <a href="#knowledge-file-upload">Upload first file</a>
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Business FAQs
              </h2>
              <p className="text-sm text-muted-foreground">
                Saved question-and-answer guidance.
              </p>
            </div>

            {knowledgeData.faqs.length ? (
              <div className="flex flex-col gap-4">
                {knowledgeData.faqs.map((faq) => (
                  <KnowledgeFaqCard
                    key={faq.id}
                    deleteAction={deleteFaqAction.bind(null, faq.id)}
                    faq={faq}
                    updateAction={updateFaqAction.bind(null, faq.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 px-5 py-10 text-center">
                <p className="text-base font-semibold tracking-tight text-foreground">
                  No FAQs yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add your common answers so they are ready during drafting.
                </p>
                <Button asChild className="mt-5">
                  <a href="#knowledge-faq-create-question">Add first FAQ</a>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function KnowledgeSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function KnowledgeMetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm text-foreground">{value}</p>
    </div>
  );
}
