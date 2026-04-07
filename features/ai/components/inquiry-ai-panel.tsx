"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  ListChecks,
  Mail,
  ReceiptText,
  SendHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type {
  AiAssistantActionState,
  AiAssistantIntent,
} from "@/features/ai/types";
import type { DashboardReplySnippet } from "@/features/inquiries/reply-snippet-types";
import { cn } from "@/lib/utils";

type InquiryAiPanelProps = {
  action: (
    state: AiAssistantActionState,
    formData: FormData,
  ) => Promise<AiAssistantActionState>;
  replySnippets: DashboardReplySnippet[];
};

type CopyState = "idle" | "copied" | "error";

const initialState: AiAssistantActionState = {};

const presetActions: Array<{
  intent: AiAssistantIntent;
  label: string;
  description: string;
  icon: typeof Mail;
}> = [
  {
    intent: "draft-first-reply",
    label: "Draft first reply",
    description: "Customer-ready first response with clear next questions.",
    icon: Mail,
  },
  {
    intent: "summarize-inquiry",
    label: "Summarize inquiry",
    description: "Short owner-facing brief with missing info and next step.",
    icon: FileText,
  },
  {
    intent: "suggest-follow-up-questions",
    label: "Suggest questions",
    description: "Clarifying questions that unblock scope, timing, and quote prep.",
    icon: ListChecks,
  },
  {
    intent: "suggest-quote-line-items",
    label: "Suggest line items",
    description: "Quote structure ideas without inventing prices.",
    icon: ReceiptText,
  },
  {
    intent: "rewrite-draft",
    label: "Rewrite draft",
    description: "Professional rewrite of a rough message you paste below.",
    icon: Wand2,
  },
  {
    intent: "generate-follow-up-message",
    label: "Generate follow-up",
    description: "Concise check-in for an inquiry that still needs a reply.",
    icon: SendHorizontal,
  },
];

function useTimedCopyState() {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setState("idle");
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [state]);

  return [state, setState] as const;
}

async function copyText(value: string, setState: (state: CopyState) => void) {
  try {
    await navigator.clipboard.writeText(value);
    setState("copied");
  } catch {
    setState("error");
  }
}

export function InquiryAiPanel({
  action,
  replySnippets,
}: InquiryAiPanelProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [replyDraft, setReplyDraft] = useState("");
  const [outputCopyState, setOutputCopyState] = useTimedCopyState();
  const [replyCopyState, setReplyCopyState] = useTimedCopyState();
  const activeIntent = state.result?.intent;

  function insertReplySnippet(snippet: DashboardReplySnippet) {
    setReplyDraft((currentDraft) => {
      const trimmedDraft = currentDraft.trim();

      if (!trimmedDraft) {
        return snippet.body;
      }

      return `${currentDraft.trimEnd()}\n\n${snippet.body}`;
    });
  }

  return (
    <Card className="gap-0 overflow-visible">
      <CardHeader className="gap-4 border-b border-border/70 pb-6">
        <div className="flex items-start gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Sparkles />
          </div>
          <div className="flex flex-col gap-2">
            <CardTitle>AI reply assistant</CardTitle>
            <CardDescription className="max-w-xl leading-6">
              Generate drafts and guidance from inquiry context, notes, FAQs, and knowledge files.
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {[
            "Inquiry context",
            "Internal notes",
            "Business FAQs",
            "Knowledge snippets",
          ].map((label) => (
            <span
              className="soft-panel rounded-full px-3 py-1 shadow-none"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 pt-6">
        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not generate the AI output.</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="flex flex-col gap-6">
          <div className="grid gap-2 sm:grid-cols-2">
            {presetActions.map((preset) => {
              const Icon = preset.icon;
              const isActive = activeIntent === preset.intent;

              return (
                <Button
                  className={cn(
                    "h-auto min-h-22 items-start justify-start rounded-xl px-4 py-3 text-left",
                    !isActive &&
                      "bg-background hover:border-primary/20 hover:bg-background",
                  )}
                  disabled={isPending}
                  key={preset.intent}
                  name="intent"
                  type="submit"
                  value={preset.intent}
                  variant={isActive ? "default" : "outline"}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon data-icon="inline-start" />
                      <span>{preset.label}</span>
                    </div>
                    <span
                      className={cn(
                        "text-left text-xs leading-5",
                        isActive
                          ? "text-primary-foreground/85"
                          : "text-muted-foreground",
                      )}
                    >
                      {preset.description}
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>

          <FieldGroup>
            <Field
              data-invalid={Boolean(state.fieldErrors?.customPrompt) || undefined}
            >
              <FieldLabel htmlFor="inquiry-ai-custom-prompt">
                Custom instruction
              </FieldLabel>
              <FieldContent>
                <FieldDescription>Optional for presets. Required for custom.</FieldDescription>
                <Textarea
                  defaultValue=""
                  disabled={isPending}
                  id="inquiry-ai-custom-prompt"
                  maxLength={1200}
                  name="customPrompt"
                  placeholder="Example: keep this tighter, focus on turnaround expectations, or make the tone more direct."
                  rows={4}
                />
                <FieldError
                  errors={
                    state.fieldErrors?.customPrompt?.[0]
                      ? [{ message: state.fieldErrors.customPrompt[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <Field
              data-invalid={Boolean(state.fieldErrors?.sourceDraft) || undefined}
            >
              <FieldLabel htmlFor="inquiry-ai-source-draft">
                Draft or working text
              </FieldLabel>
              <FieldContent>
                <FieldDescription>Paste text to rewrite or refine.</FieldDescription>
                <Textarea
                  defaultValue=""
                  disabled={isPending}
                  id="inquiry-ai-source-draft"
                  maxLength={6000}
                  name="sourceDraft"
                  placeholder="Paste your draft reply here when you want the assistant to rewrite it professionally."
                  rows={6}
                />
                <FieldError
                  errors={
                    state.fieldErrors?.sourceDraft?.[0]
                      ? [{ message: state.fieldErrors.sourceDraft[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          <div className="soft-panel flex flex-col gap-3 border-dashed px-4 py-4 shadow-none sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              Need something more specific? Run a custom request.
            </p>
            <Button
              disabled={isPending}
              name="intent"
              type="submit"
              value="custom"
              variant="secondary"
            >
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Running request...
                </>
              ) : (
                "Run custom prompt"
              )}
            </Button>
          </div>
        </form>

        {state.result ? (
          <div className="section-panel p-5 shadow-none">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="meta-label">Latest output</p>
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    {state.result.title}
                  </h3>
                </div>
                <span className="rounded-md border border-border/80 bg-secondary px-3 py-1 text-xs text-muted-foreground">
                  {state.result.model}
                </span>
              </div>

              <div className="soft-panel px-4 py-4 shadow-none">
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {state.result.output}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {state.result.canInsertIntoReply ? (
                  <Button
                    onClick={() => setReplyDraft(state.result?.output ?? "")}
                    type="button"
                    variant="outline"
                  >
                    Insert into reply draft
                  </Button>
                ) : null}
                <Button
                  onClick={() =>
                    copyText(state.result?.output ?? "", setOutputCopyState)
                  }
                  type="button"
                  variant="outline"
                >
                  {outputCopyState === "copied" ? (
                    <Check data-icon="inline-start" />
                  ) : (
                    <Copy data-icon="inline-start" />
                  )}
                  {outputCopyState === "copied"
                    ? "Copied"
                    : outputCopyState === "error"
                      ? "Copy failed"
                      : "Copy output"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Empty className="border bg-background">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles />
              </EmptyMedia>
              <EmptyTitle>No AI output yet</EmptyTitle>
              <EmptyDescription>
                Run a preset or custom request to generate a draft.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {replySnippets.length ? (
          <div className="soft-panel border-dashed px-5 py-5 shadow-none">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p className="meta-label">Saved snippets</p>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  Insert a reusable reply
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Keep common follow-ups close to the draft area.
                </p>
              </div>

              <div className="grid gap-3">
                {replySnippets.map((snippet) => (
                  <div
                      className="rounded-xl border border-border/70 bg-background/80 p-4"
                      data-testid="inquiry-reply-snippet-option"
                      key={snippet.id}
                    >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {snippet.title}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {snippet.body}
                        </p>
                      </div>
                      <Button
                        onClick={() => insertReplySnippet(snippet)}
                        type="button"
                        variant="outline"
                      >
                        Insert snippet
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="soft-panel border-dashed px-5 py-5 shadow-none">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="meta-label">Reply staging</p>
              <h3 className="font-heading text-lg font-semibold text-foreground">
                Reply draft
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Insert AI output here before you copy or trim it.
              </p>
            </div>

            <Textarea
              disabled={isPending}
              onChange={(event) => setReplyDraft(event.currentTarget.value)}
              placeholder="Reply-style outputs can be inserted here, then edited before you send them."
              rows={7}
              value={replyDraft}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                disabled={!replyDraft}
                onClick={() => copyText(replyDraft, setReplyCopyState)}
                type="button"
                variant="outline"
              >
                {replyCopyState === "copied" ? (
                  <Check data-icon="inline-start" />
                ) : (
                  <Copy data-icon="inline-start" />
                )}
                {replyCopyState === "copied"
                  ? "Copied"
                  : replyCopyState === "error"
                    ? "Copy failed"
                    : "Copy reply draft"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-4 text-xs text-muted-foreground">
        <span>Internal assistant only</span>
        <span>No customer-facing chat or automatic sending</span>
      </CardFooter>
    </Card>
  );
}
