"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ArrowRight, CircleAlert, CircleCheckBig } from "lucide-react";

import {
  FormActions,
  FormNote,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getInquiryFormFieldInputName,
  getNormalizedInquiryFormConfig,
  inquiryContactFieldKeys,
  type InquiryContactFieldKey,
  type InquiryFormFieldDefinition,
  type InquiryFormSystemFieldDefinition,
} from "@/features/inquiries/form-config";
import { publicInquiryAttachmentAccept } from "@/features/inquiries/schemas";
import type {
  PublicInquiryFormState,
  PublicInquiryBusiness,
} from "@/features/inquiries/types";
import { cn } from "@/lib/utils";

type PublicInquiryFormProps = {
  business: PublicInquiryBusiness;
  action: (
    state: PublicInquiryFormState,
    formData: FormData,
  ) => Promise<PublicInquiryFormState>;
  previewMode?: boolean;
};

const initialState: PublicInquiryFormState = {};

function getContactFieldMaxLength(contactKey: InquiryContactFieldKey) {
  switch (contactKey) {
    case "customerName":
      return 120;
    case "customerEmail":
      return 320;
    case "customerPhone":
      return 40;
    case "companyName":
      return 120;
  }
}

function getProjectFieldMaxLength(field: InquiryFormFieldDefinition) {
  if (field.kind === "system") {
    switch (field.key) {
      case "serviceCategory":
        return 120;
      case "budgetText":
        return 120;
      case "details":
        return 4000;
      default:
        return undefined;
    }
  }

  switch (field.fieldType) {
    case "short_text":
      return 160;
    case "long_text":
      return 4000;
    default:
      return undefined;
  }
}

export function PublicInquiryForm({
  business,
  action,
  previewMode = false,
}: PublicInquiryFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const inquiryFormConfig = useMemo(
    () =>
      getNormalizedInquiryFormConfig(business.inquiryFormConfig, {
        businessType: business.businessType,
      }),
    [business.businessType, business.inquiryFormConfig],
  );

  const contactFields = useMemo(
    () =>
      inquiryContactFieldKeys.filter(
        (key) => inquiryFormConfig.contactFields[key].enabled,
      ),
    [inquiryFormConfig.contactFields],
  );
  const attachmentField = useMemo<InquiryFormSystemFieldDefinition | null>(
    () =>
      inquiryFormConfig.projectFields.find(
        (field): field is InquiryFormSystemFieldDefinition =>
          field.kind === "system" &&
          field.key === "attachment" &&
          field.enabled,
      ) ?? null,
    [inquiryFormConfig.projectFields],
  );
  const projectFields = useMemo(
    () =>
      inquiryFormConfig.projectFields.filter(
        (field) =>
          field.kind === "custom" ||
          (field.kind === "system" &&
            field.enabled &&
            field.key !== "attachment"),
      ),
    [inquiryFormConfig.projectFields],
  );
  const groupLabels = inquiryFormConfig.groupLabels;

  function getFieldMessage(fieldName: string) {
    return state.fieldErrors?.[fieldName]?.[0];
  }

  if (state.success) {
    return (
      <div className="flex flex-col gap-5">
        <Alert>
          <CircleCheckBig />
          <AlertTitle>Inquiry received.</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>

        <FormNote className="p-5">
          <div className="flex flex-col gap-3">
            {state.inquiryId ? (
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
                Reference {state.inquiryId}
              </p>
            ) : null}
          </div>
        </FormNote>

        <div className="flex flex-col gap-3 [&>*]:w-full sm:flex-row sm:flex-wrap sm:[&>*]:w-auto">
          <Button asChild>
            <Link href={`/inquire/${business.slug}`}>
              Submit another inquiry
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        action={formAction}
        className="form-stack"
        onSubmit={(event) => {
          if (!previewMode) {
            return;
          }

          event.preventDefault();
          setIsPreviewDialogOpen(true);
        }}
      >
        {state.error ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>We could not submit your inquiry.</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <FormSection title={groupLabels.contact}>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              {contactFields.map((contactKey) => (
                <ContactField
                  key={contactKey}
                  contactKey={contactKey}
                  error={getFieldMessage(contactKey)}
                  fieldConfig={inquiryFormConfig.contactFields[contactKey]}
                  isPending={isPending}
                />
              ))}
            </div>
          </FieldGroup>
        </FormSection>

        {projectFields.length ? (
          <FormSection title={groupLabels.project}>
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-2">
                {projectFields.map((field) => {
                  const inputName = getInquiryFormFieldInputName(field);

                  return (
                    <ProjectField
                      key={inputName}
                      error={getFieldMessage(inputName)}
                      field={field}
                      isPending={isPending}
                    />
                  );
                })}
              </div>
            </FieldGroup>
          </FormSection>
        ) : null}

        {attachmentField ? (
          <FormSection title={attachmentField.label}>
            <FieldGroup>
              <AttachmentField
                error={getFieldMessage("attachment")}
                field={attachmentField}
                isPending={isPending}
                onSelectFileName={setSelectedFileName}
                selectedFileName={selectedFileName}
              />
            </FieldGroup>
          </FormSection>
        ) : null}

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

        <div className="toolbar-panel">
          <FormActions align="between" className="pt-0">
            <p className="text-sm leading-6 text-muted-foreground">
              Sent to {business.name}.
            </p>
            <Button
              className="w-full sm:w-auto"
              disabled={isPending}
              type="submit"
              size="lg"
            >
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Sending inquiry...
                </>
              ) : (
                "Send inquiry"
              )}
            </Button>
          </FormActions>
        </div>
      </form>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>This is a preview</DialogTitle>
            <DialogDescription>
              Submission is disabled here. Open the live page to send a real inquiry.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsPreviewDialogOpen(false)} type="button">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ContactField({
  contactKey,
  error,
  fieldConfig,
  isPending,
}: {
  contactKey: InquiryContactFieldKey;
  error?: string;
  fieldConfig: PublicInquiryBusiness["inquiryFormConfig"]["contactFields"][InquiryContactFieldKey];
  isPending: boolean;
}) {
  const inputId = `inquiry-${contactKey}`;
  const inputType = contactKey === "customerEmail" ? "email" : "text";
  const autoComplete =
    contactKey === "customerName"
      ? "name"
      : contactKey === "customerEmail"
        ? "email"
        : contactKey === "customerPhone"
          ? "tel"
          : "organization";

  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={inputId}>
        <FieldLabelText
          label={fieldConfig.label}
          required={fieldConfig.required}
        />
      </FieldLabel>
      <FieldContent>
        <Input
          autoComplete={autoComplete}
          disabled={isPending}
          id={inputId}
          inputMode={contactKey === "customerPhone" ? "tel" : undefined}
          maxLength={getContactFieldMaxLength(contactKey)}
          name={contactKey}
          placeholder={fieldConfig.placeholder}
          required={fieldConfig.required}
          type={inputType}
        />
        <FieldError errors={error ? [{ message: error }] : undefined} />
      </FieldContent>
    </Field>
  );
}

function ProjectField({
  field,
  error,
  isPending,
}: {
  field: InquiryFormFieldDefinition;
  error?: string;
  isPending: boolean;
}) {
  const inputName = getInquiryFormFieldInputName(field);
  const inputId = `inquiry-${inputName}`;
  const isWide =
    (field.kind === "system" && field.key === "details") ||
    (field.kind === "custom" &&
      (field.fieldType === "long_text" || field.fieldType === "multi_select"));

  return (
    <Field
      className={cn(isWide && "sm:col-span-2")}
      data-invalid={Boolean(error) || undefined}
    >
      <FieldLabel htmlFor={inputId}>
        <FieldLabelText label={field.label} required={field.required} />
      </FieldLabel>
      <FieldContent>
        {renderProjectInput({
          field,
          inputId,
          inputName,
          isPending,
        })}
        <FieldError errors={error ? [{ message: error }] : undefined} />
      </FieldContent>
    </Field>
  );
}

function renderProjectInput({
  field,
  inputId,
  inputName,
  isPending,
}: {
  field: InquiryFormFieldDefinition;
  inputId: string;
  inputName: string;
  isPending: boolean;
}) {
  if (field.kind === "system") {
    if (field.key === "requestedDeadline") {
      return (
        <Input
          disabled={isPending}
          id={inputId}
          name={inputName}
          required={field.required}
          type="date"
        />
      );
    }

    if (field.key === "details") {
      return (
        <Textarea
          disabled={isPending}
          id={inputId}
          maxLength={4000}
          minLength={10}
          name={inputName}
          placeholder={field.placeholder}
          required={field.required}
          rows={7}
        />
      );
    }

    return (
      <Input
        disabled={isPending}
        id={inputId}
        maxLength={getProjectFieldMaxLength(field)}
        minLength={field.key === "serviceCategory" ? 2 : undefined}
        name={inputName}
        placeholder={field.placeholder}
        required={field.required}
      />
    );
  }

  switch (field.fieldType) {
    case "long_text":
      return (
        <Textarea
          disabled={isPending}
          id={inputId}
          maxLength={4000}
          name={inputName}
          placeholder={field.placeholder}
          required={field.required}
          rows={5}
        />
      );
    case "select":
      return (
        <select
          className="h-10 w-full rounded-lg border border-input/95 bg-background/92 px-3 text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
          defaultValue=""
          disabled={isPending}
          id={inputId}
          name={inputName}
          required={field.required}
        >
          <option value="">
            {field.placeholder ?? "Select an option"}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "multi_select":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {(field.options ?? []).map((option) => {
            const optionId = `${inputId}-${option.id}`;

            return (
              <label
                key={option.id}
                className="soft-panel flex items-center gap-3 px-3 py-3 shadow-none"
                htmlFor={optionId}
              >
                <input
                  className="size-4 rounded border border-input/95"
                  disabled={isPending}
                  id={optionId}
                  name={inputName}
                  type="checkbox"
                  value={option.value}
                />
                <span className="text-sm text-foreground">{option.label}</span>
              </label>
            );
          })}
        </div>
      );
    case "number":
      return (
        <Input
          disabled={isPending}
          id={inputId}
          inputMode="decimal"
          name={inputName}
          placeholder={field.placeholder}
          required={field.required}
          step="any"
          type="number"
        />
      );
    case "date":
      return (
        <Input
          disabled={isPending}
          id={inputId}
          name={inputName}
          required={field.required}
          type="date"
        />
      );
    case "boolean":
      return (
        <select
          className="h-10 w-full rounded-lg border border-input/95 bg-background/92 px-3 text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
          defaultValue=""
          disabled={isPending}
          id={inputId}
          name={inputName}
          required={field.required}
        >
          <option value="">
            {field.placeholder ?? "Choose an option"}
          </option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    case "short_text":
    default:
      return (
        <Input
          disabled={isPending}
          id={inputId}
          maxLength={160}
          name={inputName}
          placeholder={field.placeholder}
          required={field.required}
        />
      );
  }
}

function AttachmentField({
  error,
  field,
  isPending,
  selectedFileName,
  onSelectFileName,
}: {
  error?: string;
  field: InquiryFormSystemFieldDefinition;
  isPending: boolean;
  selectedFileName: string | null;
  onSelectFileName: (fileName: string | null) => void;
}) {
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor="inquiry-attachment">
        <FieldLabelText label={field.label} required={false} />
      </FieldLabel>
      <FieldContent>
        <Input
          accept={publicInquiryAttachmentAccept}
          disabled={isPending}
          id="inquiry-attachment"
          name="attachment"
          onChange={(event) =>
            onSelectFileName(event.currentTarget.files?.[0]?.name ?? null)
          }
          type="file"
        />
        {selectedFileName ? (
          <p className="text-sm text-muted-foreground">Selected: {selectedFileName}</p>
        ) : null}
        <FieldError errors={error ? [{ message: error }] : undefined} />
      </FieldContent>
    </Field>
  );
}

function FieldLabelText({
  label,
  required,
}: {
  label: string;
  required: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      {!required ? (
        <span className="text-xs font-medium text-muted-foreground">Optional</span>
      ) : null}
    </span>
  );
}
