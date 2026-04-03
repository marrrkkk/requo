"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, CircleAlert, CircleCheckBig } from "lucide-react";

import { getFieldError } from "@/lib/action-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  publicInquiryAttachmentAccept,
  publicInquiryAttachmentLabel,
} from "@/features/inquiries/schemas";
import type {
  PublicInquiryFormState,
  PublicInquiryWorkspace,
} from "@/features/inquiries/types";

type PublicInquiryFormProps = {
  workspace: PublicInquiryWorkspace;
  action: (
    state: PublicInquiryFormState,
    formData: FormData,
  ) => Promise<PublicInquiryFormState>;
};

const initialState: PublicInquiryFormState = {};

export function PublicInquiryForm({
  workspace,
  action,
}: PublicInquiryFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const customerNameError = getFieldError(state.fieldErrors, "customerName");
  const customerEmailError = getFieldError(state.fieldErrors, "customerEmail");
  const customerPhoneError = getFieldError(state.fieldErrors, "customerPhone");
  const serviceCategoryError = getFieldError(
    state.fieldErrors,
    "serviceCategory",
  );
  const deadlineError = getFieldError(state.fieldErrors, "deadline");
  const budgetError = getFieldError(state.fieldErrors, "budget");
  const detailsError = getFieldError(state.fieldErrors, "details");
  const attachmentError = getFieldError(state.fieldErrors, "attachment");

  if (state.success) {
    return (
      <div className="flex flex-col gap-5">
        <Alert>
          <CircleCheckBig />
          <AlertTitle>Inquiry received.</AlertTitle>
          <AlertDescription>
            {state.success} {workspace.name} can now review it in QuoteFlow.
          </AlertDescription>
        </Alert>

        <div className="rounded-xl border border-border/80 bg-background p-5">
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-7 text-muted-foreground">
              Thanks. The business owner now has your inquiry in QuoteFlow.
            </p>
            {state.inquiryId ? (
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                Reference {state.inquiryId}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/inquire/${workspace.slug}`}>
              Submit another inquiry
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to QuoteFlow</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>We could not submit your inquiry.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(customerNameError) || undefined}>
            <FieldLabel htmlFor="customerName">Your name</FieldLabel>
            <FieldContent>
              <Input
                id="customerName"
                name="customerName"
                autoComplete="name"
                placeholder="Alicia Cruz"
                aria-invalid={Boolean(customerNameError) || undefined}
                disabled={isPending}
              />
              <FieldError
                errors={
                  customerNameError ? [{ message: customerNameError }] : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(customerEmailError) || undefined}>
            <FieldLabel htmlFor="customerEmail">Email address</FieldLabel>
            <FieldContent>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(customerEmailError) || undefined}
                disabled={isPending}
              />
              <FieldError
                errors={
                  customerEmailError
                    ? [{ message: customerEmailError }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(customerPhoneError) || undefined}>
            <FieldLabel htmlFor="customerPhone">Phone number</FieldLabel>
            <FieldContent>
              <Input
                id="customerPhone"
                name="customerPhone"
                autoComplete="tel"
                placeholder="Optional"
                aria-invalid={Boolean(customerPhoneError) || undefined}
                disabled={isPending}
              />
              <FieldDescription>Optional.</FieldDescription>
              <FieldError
                errors={
                  customerPhoneError
                    ? [{ message: customerPhoneError }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(serviceCategoryError) || undefined}>
            <FieldLabel htmlFor="serviceCategory">Service or category</FieldLabel>
            <FieldContent>
              <Input
                id="serviceCategory"
                name="serviceCategory"
                placeholder="Banner printing, laptop repair, tutoring package"
                aria-invalid={Boolean(serviceCategoryError) || undefined}
                disabled={isPending}
              />
              <FieldError
                errors={
                  serviceCategoryError
                    ? [{ message: serviceCategoryError }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(deadlineError) || undefined}>
            <FieldLabel htmlFor="deadline">Deadline</FieldLabel>
            <FieldContent>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                aria-invalid={Boolean(deadlineError) || undefined}
                disabled={isPending}
              />
              <FieldDescription>Optional.</FieldDescription>
              <FieldError
                errors={deadlineError ? [{ message: deadlineError }] : undefined}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(budgetError) || undefined}>
            <FieldLabel htmlFor="budget">Budget</FieldLabel>
            <FieldContent>
              <Input
                id="budget"
                name="budget"
                placeholder="Optional"
                aria-invalid={Boolean(budgetError) || undefined}
                disabled={isPending}
              />
              <FieldDescription>
                Optional.
              </FieldDescription>
              <FieldError
                errors={budgetError ? [{ message: budgetError }] : undefined}
              />
            </FieldContent>
          </Field>
        </div>

        <Field data-invalid={Boolean(detailsError) || undefined}>
          <FieldLabel htmlFor="details">Message and details</FieldLabel>
          <FieldContent>
            <Textarea
              id="details"
              name="details"
              rows={7}
              placeholder="Share the scope, size, quantity, timing, location, or anything else that matters."
              aria-invalid={Boolean(detailsError) || undefined}
              disabled={isPending}
            />
            <FieldDescription>
              The more detail you share, the easier it is to quote well.
            </FieldDescription>
            <FieldError
              errors={detailsError ? [{ message: detailsError }] : undefined}
            />
          </FieldContent>
        </Field>

        <Field data-invalid={Boolean(attachmentError) || undefined}>
          <FieldLabel htmlFor="attachment">Attachment</FieldLabel>
          <FieldContent>
            <Input
              id="attachment"
              name="attachment"
              type="file"
              accept={publicInquiryAttachmentAccept}
              aria-invalid={Boolean(attachmentError) || undefined}
              disabled={isPending}
              onChange={(event) =>
                setSelectedFileName(event.currentTarget.files?.[0]?.name ?? null)
              }
            />
            <FieldDescription>
              Optional. Upload {publicInquiryAttachmentLabel}.
              {selectedFileName ? ` Selected: ${selectedFileName}.` : ""}
            </FieldDescription>
            <FieldError
              errors={
                attachmentError ? [{ message: attachmentError }] : undefined
              }
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <Button disabled={isPending} type="submit" size="lg">
          {isPending ? "Sending your inquiry..." : "Send inquiry"}
        </Button>
        <p className="text-sm leading-6 text-muted-foreground">
          Sent directly to {workspace.name}.
        </p>
      </div>
    </form>
  );
}
