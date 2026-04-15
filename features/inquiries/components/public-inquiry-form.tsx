"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowRight, CircleCheckBig } from "lucide-react";

import {
  FormActions,
  FormNote,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import {
  getInquiryFormFieldInputName,
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
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
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
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const inquiryFormConfig = business.inquiryFormConfig;

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

  const syncCanSubmit = useCallback(() => {
    if (previewMode) {
      setCanSubmit(true);
      return;
    }

    const form = formRef.current;
    setCanSubmit(form ? form.checkValidity() : false);
  }, [previewMode]);

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
        ref={formRef}
        action={formAction}
        className="form-stack"
        onChangeCapture={syncCanSubmit}
        onInputCapture={syncCanSubmit}
        onSubmit={(event) => {
          if (!previewMode) {
            return;
          }

          event.preventDefault();
          setIsPreviewDialogOpen(true);
        }}
      >
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
              {previewMode
                ? "Preview only. Inquiry submission is disabled on this page."
                : `Sent to ${business.name}.`}
            </p>
            <Button
              className="w-full sm:w-auto"
              disabled={!previewMode && (isPending || !canSubmit)}
              onClick={
                previewMode ? () => setIsPreviewDialogOpen(true) : undefined
              }
              type={previewMode ? "button" : "submit"}
              size="lg"
            >
              {previewMode ? (
                "Preview only"
              ) : isPending ? (
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
              This preview lets you review the layout, fields, and copy only.
              Open the live page to send a real inquiry.
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
          hasError: Boolean(error),
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
  hasError,
  field,
  inputId,
  inputName,
  isPending,
}: {
  hasError: boolean;
  field: InquiryFormFieldDefinition;
  inputId: string;
  inputName: string;
  isPending: boolean;
}) {
  if (field.kind === "system") {
    if (field.key === "requestedDeadline") {
      return (
        <ProjectDateInput
          disabled={isPending}
          id={inputId}
          name={inputName}
          required={field.required}
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
        <ProjectSelectInput
          ariaInvalid={hasError}
          disabled={isPending}
          id={inputId}
          name={inputName}
          options={field.options ?? []}
          placeholder={field.placeholder ?? "Select an option"}
          required={field.required}
        />
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
        <ProjectDateInput
          disabled={isPending}
          id={inputId}
          name={inputName}
          required={field.required}
        />
      );
    case "boolean":
      return (
        <ProjectBooleanSelectInput
          ariaInvalid={hasError}
          disabled={isPending}
          id={inputId}
          name={inputName}
          placeholder={field.placeholder ?? "Choose an option"}
          required={field.required}
        />
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

function ProjectDateInput({
  disabled,
  id,
  name,
  required,
}: {
  disabled: boolean;
  id: string;
  name: string;
  required: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <DatePicker
      disabled={disabled}
      id={id}
      name={name}
      onChange={setValue}
      required={required}
      value={value}
    />
  );
}

function ProjectSelectInput({
  ariaInvalid,
  disabled,
  id,
  name,
  options,
  placeholder,
  required,
}: {
  ariaInvalid: boolean;
  disabled: boolean;
  id: string;
  name: string;
  options: Array<{ id: string; label: string; value: string }>;
  placeholder: string;
  required: boolean;
}) {
  const [value, setValue] = useState<string | undefined>(undefined);
  const comboboxOptions = useMemo(
    () => [
      {
        label: placeholder,
        searchText: placeholder,
        value: "",
      },
      ...options.map((option) => ({
        label: option.label,
        searchText: `${option.label} ${option.value}`,
        value: option.value,
      })),
    ],
    [options, placeholder],
  );

  return (
    <>
      <input
        aria-hidden="true"
        name={name}
        required={required}
        tabIndex={-1}
        type="text"
        value={value ?? ""}
        readOnly
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
      />
      <Combobox
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        id={id}
        onValueChange={(nextValue) => setValue(nextValue || undefined)}
        options={comboboxOptions}
        placeholder={placeholder}
        renderValue={(option) =>
          option.value ? (
            <span className="truncate">{option.label}</span>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )
        }
        searchPlaceholder="Search option"
        value={value ?? ""}
      />
    </>
  );
}

function ProjectBooleanSelectInput({
  ariaInvalid,
  disabled,
  id,
  name,
  placeholder,
  required,
}: {
  ariaInvalid: boolean;
  disabled: boolean;
  id: string;
  name: string;
  placeholder: string;
  required: boolean;
}) {
  const [value, setValue] = useState<string | undefined>(undefined);
  const comboboxOptions = useMemo(
    () => [
      {
        label: placeholder,
        searchText: placeholder,
        value: "",
      },
      { label: "Yes", searchText: "Yes true", value: "true" },
      { label: "No", searchText: "No false", value: "false" },
    ],
    [placeholder],
  );

  return (
    <>
      <input
        aria-hidden="true"
        name={name}
        required={required}
        tabIndex={-1}
        type="text"
        value={value ?? ""}
        readOnly
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
      />
      <Combobox
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        id={id}
        onValueChange={(nextValue) => setValue(nextValue || undefined)}
        options={comboboxOptions}
        placeholder={placeholder}
        renderValue={(option) =>
          option.value ? (
            <span className="truncate">{option.label}</span>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )
        }
        searchPlaceholder="Search option"
        value={value ?? ""}
      />
    </>
  );
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
