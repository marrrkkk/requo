"use client";

import { useActionState, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { generateQuoteDraftAction } from "@/features/ai/actions";
import type {
  AiQuoteDraft,
  AiQuoteDraftActionState,
} from "@/features/ai/types";
import type { QuoteLinkedInquirySummary } from "@/features/quotes/types";

type AiQuoteGeneratorDialogProps = {
  businessSlug: string;
  linkedInquiry: QuoteLinkedInquirySummary | null;
  onApply: (draft: AiQuoteDraft) => void;
  disabled?: boolean;
};

const initialState: AiQuoteDraftActionState = {};

export function AiQuoteGeneratorDialog({
  businessSlug,
  linkedInquiry,
  onApply,
  disabled = false,
}: AiQuoteGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const boundAction = useMemo(
    () => generateQuoteDraftAction.bind(null, businessSlug),
    [businessSlug],
  );
  const [, formAction, isPending] = useActionState(
    async (
      prevState: AiQuoteDraftActionState,
      formData: FormData,
    ): Promise<AiQuoteDraftActionState> => {
      const nextState = await boundAction(prevState, formData);

      if (nextState.error) {
        toast.error(nextState.error);
        return nextState;
      }

      if (nextState.draft) {
        onApply(nextState.draft);
        toast.success("Quote draft generated.");
        setOpen(false);
        setBrief("");
      }

      return nextState;
    },
    initialState,
  );

  const briefOptional = Boolean(linkedInquiry);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setBrief("");
    }
  }

  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <Sparkles data-icon="inline-start" />
        Generate with AI
      </Button>

      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent className="sm:max-w-lg">
          <form action={formAction}>
            <DialogHeader>
              <DialogTitle>Generate this quote with AI</DialogTitle>
              <DialogDescription>
                Requo AI will draft a quote title, notes, and line items using
                this business&apos;s saved knowledge and pricing library
                {linkedInquiry ? " plus the linked inquiry details." : "."}
                Review and edit before saving.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-4">
              {linkedInquiry ? (
                <input
                  name="inquiryId"
                  type="hidden"
                  value={linkedInquiry.id}
                />
              ) : null}

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="ai-quote-brief">
                    {briefOptional
                      ? "Extra context (optional)"
                      : "What is this quote for?"}
                  </FieldLabel>
                  <FieldContent>
                    <Textarea
                      disabled={isPending}
                      id="ai-quote-brief"
                      maxLength={2000}
                      name="brief"
                      onChange={(event) => setBrief(event.currentTarget.value)}
                      placeholder={
                        briefOptional
                          ? "Optional. Add extra details the assistant should emphasise (deadline, constraints, special pricing)."
                          : "Describe the scope of work, deliverables, and any constraints. Example: Two-day commercial banner print run, 5 banners at 4x6 ft, rush turnaround."
                      }
                      rows={5}
                      value={brief}
                    />
                    <FieldDescription>
                      The assistant only uses saved business knowledge,
                      pricing library entries, and the linked inquiry context.
                      It will not invent prices that aren&apos;t configured.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </DialogBody>

            <DialogFooter>
              <Button
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={isPending || (!briefOptional && !brief.trim())}
                type="submit"
              >
                {isPending ? (
                  <>
                    <Spinner aria-hidden="true" data-icon="inline-start" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles data-icon="inline-start" />
                    Generate draft
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
