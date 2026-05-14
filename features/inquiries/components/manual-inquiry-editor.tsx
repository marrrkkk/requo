"use client";

import { useActionState, useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DashboardMetaPill,
  DashboardSection,
  DashboardSidebarStack,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  getInquiryContactHandleUrlPrefix,
  getInquiryFormFieldInputName,
  getInquirySubmittedFieldValueDisplay,
  inquiryContactMethodLabels,
  inquiryContactMethods,
  normalizeInquiryContactHandleEditableValue,
  type InquiryContactMethod,
  type InquiryFormFieldDefinition,
  type InquiryFormSystemFieldDefinition,
} from "@/features/inquiries/form-config";
import {
  createManualQuickInquiryFormConfig,
  publicInquiryAttachmentAccept,
} from "@/features/inquiries/schemas";
import type {
  InquiryEditorForm,
  ManualInquiryActionState,
} from "@/features/inquiries/types";
import { cn } from "@/lib/utils";

type ManualInquiryEditorProps = {
  action: (
    state: ManualInquiryActionState,
    formData: FormData,
  ) => Promise<ManualInquiryActionState>;
  businessName: string;
  forms: InquiryEditorForm[];
  initialFormSlug: string;
  uploadHelpText: string;
};

type ProjectFieldValue = string | string[];
type ProjectValues = Record<string, ProjectFieldValue | undefined>;

const initialState: ManualInquiryActionState = {};

const contactMethodOptions = inquiryContactMethods.map((method) => ({
  label: inquiryContactMethodLabels[method],
  value: method,
}));

export function ManualInquiryEditor({
  action,
  businessName,
  forms,
  initialFormSlug,
  uploadHelpText,
}: ManualInquiryEditorProps) {
  const [selectedFormSlug, setSelectedFormSlug] = useState(initialFormSlug);
  const [customerName, setCustomerName] = useState("");
  const [customerContactMethod, setCustomerContactMethod] =
    useState<InquiryContactMethod>("email");
  const [customerContactHandle, setCustomerContactHandle] = useState("");
  const [projectValues, setProjectValues] = useState<ProjectValues>({});
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const deferredCustomerName = useDeferredValue(customerName);
  const deferredCustomerContactMethod = useDeferredValue(customerContactMethod);
  const deferredCustomerContactHandle = useDeferredValue(customerContactHandle);
  const deferredProjectValues = useDeferredValue(projectValues);
  const deferredSelectedFileName = useDeferredValue(selectedFileName);

  const [state, formAction, isPending] = useActionState(
    async (prevState: ManualInquiryActionState, formData: FormData) => {
      const nextState = await action(prevState, formData);
      const firstFieldError = nextState.fieldErrors
        ? Object.values(nextState.fieldErrors).find((errors) => errors?.[0])?.[0]
        : undefined;

      if (firstFieldError || nextState.error) {
        toast.error(firstFieldError ?? nextState.error ?? "Check the form and try again.");
      }

      return nextState;
    },
    initialState,
  );

  const selectedForm = useMemo(
    () => forms.find((form) => form.slug === selectedFormSlug) ?? forms[0],
    [forms, selectedFormSlug],
  );
  const quickInquiryFormConfig = useMemo(
    () => createManualQuickInquiryFormConfig(selectedForm.inquiryFormConfig),
    [selectedForm],
  );
  const formOptions = useMemo(
    () =>
      forms.map((form) => ({
        label: form.isDefault ? `${form.name} (Default)` : form.name,
        searchText: `${form.name} ${form.slug}`,
        value: form.slug,
      })),
    [forms],
  );
  const projectFields = useMemo(
    () =>
      quickInquiryFormConfig.projectFields.filter(
        (field) =>
          field.kind === "custom" ||
          (field.kind === "system" &&
            field.enabled &&
            field.key !== "attachment"),
      ),
    [quickInquiryFormConfig],
  );
  const attachmentField = useMemo(
    () =>
      quickInquiryFormConfig.projectFields.find(
        (field): field is InquiryFormSystemFieldDefinition =>
          field.kind === "system" &&
          field.key === "attachment" &&
          field.enabled,
      ) ?? null,
    [quickInquiryFormConfig],
  );
  function getFieldMessage(fieldName: string) {
    return state.fieldErrors?.[fieldName]?.[0];
  }

  function getProjectMultiValue(fieldName: string) {
    const value = projectValues[fieldName];
    return Array.isArray(value) ? value : [];
  }

  function setProjectValue(fieldName: string, value: ProjectFieldValue | undefined) {
    setProjectValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }));
  }

  function handleFormChange(nextFormSlug: string) {
    setSelectedFormSlug(nextFormSlug);
    setSelectedFileName(null);
    setFileInputResetKey((currentValue) => currentValue + 1);
  }

  return (
    <form
      action={formAction}
      className="dashboard-detail-layout items-start xl:grid-cols-[minmax(0,1.08fr)_0.92fr]"
    >
      <input name="formSlug" type="hidden" value={selectedForm.slug} />

      <DashboardSidebarStack className="min-w-0">
        <DashboardSection
          action={<DashboardMetaPill>{selectedForm.slug}</DashboardMetaPill>}
          contentClassName="flex flex-col gap-5"
          description="Choose the intake form this manual inquiry should follow."
          title="Intake setup"
        >
          <Field data-invalid={Boolean(getFieldMessage("formSlug")) || undefined}>
            <FieldLabel htmlFor="manual-inquiry-form">Inquiry form</FieldLabel>
            <FieldContent>
              <Combobox
                aria-invalid={Boolean(getFieldMessage("formSlug"))}
                disabled={isPending}
                id="manual-inquiry-form"
                onValueChange={(value) => handleFormChange(value)}
                options={formOptions}
                placeholder="Choose an inquiry form"
                searchable
                searchPlaceholder="Search forms"
                value={selectedForm.slug}
              />
              <FieldDescription>
                Switch forms if this inquiry belongs to a different intake flow.
              </FieldDescription>
              <FieldError
                errors={
                  getFieldMessage("formSlug")
                    ? [{ message: getFieldMessage("formSlug")! }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
        </DashboardSection>

        <DashboardSection
          contentClassName="flex flex-col gap-5"
          description="Add the customer's name and best way to reply."
          title={selectedForm.inquiryFormConfig.groupLabels.contact}
        >
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(getFieldMessage("customerName")) || undefined}>
                <FieldLabel htmlFor="manual-inquiry-customer-name">
                  <FieldLabelText label="Customer name" required />
                </FieldLabel>
                <FieldContent>
                  <Input
                    disabled={isPending}
                    id="manual-inquiry-customer-name"
                    maxLength={120}
                    minLength={2}
                    name="customerName"
                    onChange={(event) => setCustomerName(event.currentTarget.value)}
                    placeholder="Jordan Rivera"
                    required
                    value={customerName}
                  />
                  <FieldError
                    errors={
                      getFieldMessage("customerName")
                        ? [{ message: getFieldMessage("customerName")! }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field
                data-invalid={
                  Boolean(getFieldMessage("customerContactMethod")) || undefined
                }
              >
                <FieldLabel htmlFor="manual-inquiry-contact-method">
                  <FieldLabelText label="Preferred contact method" required />
                </FieldLabel>
                <FieldContent>
                  <input
                    name="customerContactMethod"
                    type="hidden"
                    value={customerContactMethod}
                  />
                  <Combobox
                    aria-invalid={Boolean(getFieldMessage("customerContactMethod"))}
                    disabled={isPending}
                    id="manual-inquiry-contact-method"
                    onValueChange={(value) =>
                      setCustomerContactMethod(value as InquiryContactMethod)
                    }
                    options={contactMethodOptions}
                    placeholder="Choose how to reach them"
                    value={customerContactMethod}
                  />
                  <FieldError
                    errors={
                      getFieldMessage("customerContactMethod")
                        ? [{ message: getFieldMessage("customerContactMethod")! }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field
                className="sm:col-span-2"
                data-invalid={
                  Boolean(getFieldMessage("customerContactHandle")) || undefined
                }
              >
                <FieldLabel htmlFor="manual-inquiry-contact-handle">
                  <FieldLabelText
                    label={inquiryContactMethodLabels[customerContactMethod]}
                    required
                  />
                </FieldLabel>
                <FieldContent>
                  <ContactHandleInput
                    contactMethod={customerContactMethod}
                    disabled={isPending}
                    onChange={setCustomerContactHandle}
                    value={customerContactHandle}
                  />
                  <FieldError
                    errors={
                      getFieldMessage("customerContactHandle")
                        ? [{ message: getFieldMessage("customerContactHandle")! }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
            </div>
          </FieldGroup>
        </DashboardSection>

        <DashboardSection
          contentClassName="flex flex-col gap-5"
          description="Capture the request clearly enough to reply, quote, or follow up."
          title="Request details"
        >
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              {projectFields.map((field) => {
                const inputName = getInquiryFormFieldInputName(field);

                return (
                  <ManualProjectField
                    key={`${selectedForm.slug}:${inputName}`}
                    error={getFieldMessage(inputName)}
                    field={field}
                    isPending={isPending}
                    onMultiValueChange={(optionValue, checked) => {
                      const nextValue = new Set(getProjectMultiValue(inputName));

                      if (checked) {
                        nextValue.add(optionValue);
                      } else {
                        nextValue.delete(optionValue);
                      }

                      setProjectValue(
                        inputName,
                        nextValue.size ? Array.from(nextValue) : undefined,
                      );
                    }}
                    onValueChange={(value) => setProjectValue(inputName, value)}
                    value={projectValues[inputName]}
                  />
                );
              })}
            </div>
          </FieldGroup>
        </DashboardSection>

        {attachmentField ? (
          <DashboardSection
            contentClassName="flex flex-col gap-5"
            description="Optional files or references that belong with this inquiry."
            title={attachmentField.label}
          >
            <Field data-invalid={Boolean(getFieldMessage("attachment")) || undefined}>
              <FieldLabel htmlFor="manual-inquiry-attachment">
                <FieldLabelText label={attachmentField.label} />
              </FieldLabel>
              <FieldContent>
                <Input
                  accept={publicInquiryAttachmentAccept}
                  disabled={isPending}
                  id="manual-inquiry-attachment"
                  key={`${selectedForm.slug}:${fileInputResetKey}`}
                  name="attachment"
                  onChange={(event) =>
                    setSelectedFileName(
                      event.currentTarget.files?.[0]?.name ?? null,
                    )
                  }
                  type="file"
                />
                {selectedFileName ? (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFileName}
                  </p>
                ) : (
                  <FieldDescription>{uploadHelpText}</FieldDescription>
                )}
                <FieldError
                  errors={
                    getFieldMessage("attachment")
                      ? [{ message: getFieldMessage("attachment")! }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </DashboardSection>
        ) : null}

        <DashboardSection
          contentClassName="flex flex-col gap-4"
          footer={
            <Button disabled={isPending} size="lg" type="submit">
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Creating inquiry...
                </>
              ) : (
                "Create inquiry"
              )}
            </Button>
          }
          footerClassName="w-full sm:justify-between"
          title="Save inquiry"
        >
          <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
            <p className="text-sm font-medium text-foreground">
              This will be saved as a new inquiry in {businessName}.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Use this when an inquiry arrives through phone, chat, walk-ins, or
              any channel outside your public inquiry page.
            </p>
          </div>
        </DashboardSection>
      </DashboardSidebarStack>

      <ManualInquiryPreview
        customerContactHandle={deferredCustomerContactHandle}
        customerContactMethod={deferredCustomerContactMethod}
        customerName={deferredCustomerName}
        projectFields={projectFields}
        projectValues={deferredProjectValues}
        selectedFileName={deferredSelectedFileName}
        selectedForm={selectedForm}
      />
    </form>
  );
}

function ManualProjectField({
  field,
  value,
  error,
  isPending,
  onValueChange,
  onMultiValueChange,
}: {
  field: InquiryFormFieldDefinition;
  value: ProjectFieldValue | undefined;
  error?: string;
  isPending: boolean;
  onValueChange: (value: string | undefined) => void;
  onMultiValueChange: (optionValue: string, checked: boolean) => void;
}) {
  const inputName = getInquiryFormFieldInputName(field);
  const inputId = `manual-inquiry-${inputName}`;
  const isWide =
    (field.kind === "system" && field.key === "details") ||
    (field.kind === "custom" &&
      (field.fieldType === "long_text" || field.fieldType === "multi_select"));
  const stringValue = typeof value === "string" ? value : "";
  const multiValue = Array.isArray(value) ? value : [];

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
          onMultiValueChange,
          onValueChange,
          stringValue,
          multiValue,
          hasError: Boolean(error),
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
  onValueChange,
  onMultiValueChange,
  stringValue,
  multiValue,
  hasError,
}: {
  field: InquiryFormFieldDefinition;
  inputId: string;
  inputName: string;
  isPending: boolean;
  onValueChange: (value: string | undefined) => void;
  onMultiValueChange: (optionValue: string, checked: boolean) => void;
  stringValue: string;
  multiValue: string[];
  hasError: boolean;
}) {
  if (field.kind === "system") {
    if (field.key === "requestedDeadline") {
      return (
        <DatePicker
          disabled={isPending}
          id={inputId}
          name={inputName}
          onChange={(value) => onValueChange(value || undefined)}
          required={field.required}
          value={stringValue}
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
          onChange={(event) => onValueChange(event.currentTarget.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={7}
          value={stringValue}
        />
      );
    }

    if (field.key === "budgetText") {
      return (
        <BudgetRangeInput
          disabled={isPending}
          inputName={inputName}
          onChange={onValueChange}
          value={stringValue}
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
        onChange={(event) => onValueChange(event.currentTarget.value)}
        placeholder={field.placeholder}
        required={field.required}
        type="text"
        value={stringValue}
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
          onChange={(event) => onValueChange(event.currentTarget.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={5}
          value={stringValue}
        />
      );
    case "select":
      return (
        <ProjectSelectInput
          ariaInvalid={hasError}
          disabled={isPending}
          id={inputId}
          name={inputName}
          onValueChange={onValueChange}
          options={field.options ?? []}
          placeholder={field.placeholder ?? "Select an option"}
          required={field.required}
          value={stringValue}
        />
      );
    case "multi_select":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {(field.options ?? []).map((option) => {
            const optionId = `${inputId}-${option.id}`;
            const isChecked = multiValue.includes(option.value);

            return (
              <label
                key={option.id}
                className="soft-panel flex cursor-pointer items-center gap-3 px-3 py-3 shadow-none"
                htmlFor={optionId}
              >
                <Checkbox
                  checked={isChecked}
                  disabled={isPending}
                  id={optionId}
                  onCheckedChange={(state) =>
                    onMultiValueChange(option.value, state === true)
                  }
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
          onChange={(event) => onValueChange(event.currentTarget.value)}
          placeholder={field.placeholder}
          required={field.required}
          step="any"
          type="number"
          value={stringValue}
        />
      );
    case "date":
      return (
        <DatePicker
          disabled={isPending}
          id={inputId}
          name={inputName}
          onChange={(value) => onValueChange(value || undefined)}
          required={field.required}
          value={stringValue}
        />
      );
    case "boolean":
      return (
        <ProjectBooleanSelectInput
          ariaInvalid={hasError}
          disabled={isPending}
          id={inputId}
          name={inputName}
          onValueChange={onValueChange}
          placeholder={field.placeholder ?? "Choose an option"}
          required={field.required}
          value={stringValue}
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
          onChange={(event) => onValueChange(event.currentTarget.value)}
          placeholder={field.placeholder}
          required={field.required}
          value={stringValue}
        />
      );
  }
}

function ProjectSelectInput({
  ariaInvalid,
  disabled,
  id,
  name,
  onValueChange,
  options,
  placeholder,
  required,
  value,
}: {
  ariaInvalid: boolean;
  disabled: boolean;
  id: string;
  name: string;
  onValueChange: (value: string | undefined) => void;
  options: Array<{ id: string; label: string; value: string }>;
  placeholder: string;
  required: boolean;
  value: string;
}) {
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
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
        name={name}
        readOnly
        required={required}
        tabIndex={-1}
        type="text"
        value={value}
      />
      <Combobox
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        id={id}
        onValueChange={(nextValue) => onValueChange(nextValue || undefined)}
        options={comboboxOptions}
        placeholder={placeholder}
        renderValue={(option) =>
          option.value ? (
            <span className="truncate">{option.label}</span>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )
        }
        searchable
        searchPlaceholder="Search option"
        value={value}
      />
    </>
  );
}

function ProjectBooleanSelectInput({
  ariaInvalid,
  disabled,
  id,
  name,
  onValueChange,
  placeholder,
  required,
  value,
}: {
  ariaInvalid: boolean;
  disabled: boolean;
  id: string;
  name: string;
  onValueChange: (value: string | undefined) => void;
  placeholder: string;
  required: boolean;
  value: string;
}) {
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
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
        name={name}
        readOnly
        required={required}
        tabIndex={-1}
        type="text"
        value={value}
      />
      <Combobox
        aria-invalid={ariaInvalid || undefined}
        disabled={disabled}
        id={id}
        onValueChange={(nextValue) => onValueChange(nextValue || undefined)}
        options={comboboxOptions}
        placeholder={placeholder}
        renderValue={(option) =>
          option.value ? (
            <span className="truncate">{option.label}</span>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )
        }
        value={value}
      />
    </>
  );
}

function ManualInquiryPreview({
  customerName,
  customerContactMethod,
  customerContactHandle,
  projectFields,
  projectValues,
  selectedFileName,
  selectedForm,
}: {
  customerName: string;
  customerContactMethod: InquiryContactMethod;
  customerContactHandle: string;
  projectFields: InquiryFormFieldDefinition[];
  projectValues: ProjectValues;
  selectedFileName: string | null;
  selectedForm: InquiryEditorForm;
}) {
  const serviceCategoryField = projectFields.find(
    (field): field is InquiryFormSystemFieldDefinition =>
      field.kind === "system" && field.key === "serviceCategory",
  );
  const detailsField = projectFields.find(
    (field): field is InquiryFormSystemFieldDefinition =>
      field.kind === "system" && field.key === "details",
  );
  const requestedDeadlineField = projectFields.find(
    (field): field is InquiryFormSystemFieldDefinition =>
      field.kind === "system" && field.key === "requestedDeadline",
  );
  const budgetField = projectFields.find(
    (field): field is InquiryFormSystemFieldDefinition =>
      field.kind === "system" && field.key === "budgetText",
  );
  const additionalFields = projectFields.filter((field) => {
    if (field.kind === "system") {
      return !["serviceCategory", "requestedDeadline", "budgetText", "details"].includes(
        field.key,
      );
    }

    return true;
  });
  const serviceCategory = serviceCategoryField
    ? getPreviewValueDisplay(serviceCategoryField, projectValues)
    : "Not provided";
  const details = detailsField
    ? getPreviewValueDisplay(detailsField, projectValues)
    : "Not provided";
  const requestedDeadline = requestedDeadlineField
    ? getPreviewValueDisplay(requestedDeadlineField, projectValues)
    : "Not provided";
  const budget = budgetField
    ? getPreviewValueDisplay(budgetField, projectValues)
    : "Not provided";

  return (
    <article className="section-panel overflow-hidden p-5 sm:p-6 xl:sticky xl:top-[5.5rem] xl:self-start">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-border/80 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="meta-label">Inquiry preview</p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                {serviceCategory !== "Not provided" ? serviceCategory : "New inquiry"}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Saved with the {selectedForm.name} form.
              </p>
            </div>
            <div className="soft-panel flex min-w-[12rem] flex-col gap-2 px-4 py-4 shadow-none">
              <p className="meta-label">Workflow</p>
              <p className="text-sm font-medium text-foreground">New inquiry</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Created manually from the dashboard.
              </p>
            </div>
          </div>

          <div className="dashboard-detail-header-meta">
            <DashboardMetaPill>{selectedForm.name}</DashboardMetaPill>
            <DashboardMetaPill>Manual entry</DashboardMetaPill>
          </div>
        </div>

        <DashboardStatsGrid className="xl:!grid-cols-2">
          <InfoTile
            label="Customer"
            value={customerName.trim() || "Customer name"}
          />
          <InfoTile
            label="Preferred contact"
            value={
              customerContactHandle.trim() ||
              inquiryContactMethodLabels[customerContactMethod]
            }
          />
          <InfoTile
            label={requestedDeadlineField?.label ?? "Requested deadline"}
            value={requestedDeadline}
          />
          <InfoTile
            label={budgetField?.label ?? "Budget"}
            value={budget}
          />
        </DashboardStatsGrid>

        <div className="soft-panel px-4 py-4 shadow-none">
          <p className="meta-label">
            {detailsField?.label ?? "Inquiry details"}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-normal sm:leading-7 text-foreground">
            {details !== "Not provided"
              ? details
              : "Add the main scope, context, and anything needed before quoting or following up."}
          </p>
        </div>

        {additionalFields.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {additionalFields.map((field) => (
              <InfoTile
                key={getInquiryFormFieldInputName(field)}
                label={field.label}
                value={getPreviewValueDisplay(field, projectValues)}
                valueClassName="text-sm font-medium"
              />
            ))}
          </div>
        ) : null}

        {selectedFileName ? (
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Attachment</p>
            <p className="mt-3 text-sm font-medium text-foreground">
              {selectedFileName}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function getPreviewValueDisplay(
  field: InquiryFormFieldDefinition,
  values: ProjectValues,
) {
  const inputName = getInquiryFormFieldInputName(field);
  const rawValue = values[inputName];

  if (Array.isArray(rawValue)) {
    return getInquirySubmittedFieldValueDisplay(rawValue.length ? rawValue : null);
  }

  if (field.kind === "custom" && field.fieldType === "boolean") {
    if (rawValue === "true") {
      return getInquirySubmittedFieldValueDisplay(true);
    }

    if (rawValue === "false") {
      return getInquirySubmittedFieldValueDisplay(false);
    }

    return getInquirySubmittedFieldValueDisplay(null);
  }

  if (typeof rawValue === "string") {
    return getInquirySubmittedFieldValueDisplay(rawValue.trim() || null);
  }

  return getInquirySubmittedFieldValueDisplay(null);
}

function getContactHandlePlaceholder(method: InquiryContactMethod) {
  switch (method) {
    case "email":
      return "customer@example.com";
    case "phone":
      return "+63 912 345 6789";
    case "facebook":
      return "username";
    case "instagram":
      return "username";
    case "whatsapp":
      return "+63 912 345 6789";
    case "other":
      return "Best contact details";
  }
}

function getContactHandleInputType(method: InquiryContactMethod) {
  switch (method) {
    case "email":
      return "email";
    case "phone":
    case "whatsapp":
      return "tel";
    default:
      return "text";
  }
}

function getContactHandleInputMode(method: InquiryContactMethod) {
  switch (method) {
    case "email":
      return "email" as const;
    case "phone":
    case "whatsapp":
      return "tel" as const;
    default:
      return "text" as const;
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

function FieldLabelText({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
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

function ContactHandleInput({
  contactMethod,
  disabled,
  onChange,
  value,
}: {
  contactMethod: InquiryContactMethod;
  disabled: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const contactHandlePrefix = getInquiryContactHandleUrlPrefix(contactMethod);

  if (contactHandlePrefix) {
    return (
      <div className="flex items-stretch">
        <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
          {contactHandlePrefix}
        </span>
        <Input
          className="rounded-l-none"
          disabled={disabled}
          id="manual-inquiry-contact-handle"
          maxLength={320}
          name="customerContactHandle"
          onBlur={() => {
            onChange(
              normalizeInquiryContactHandleEditableValue(contactMethod, value),
            );
          }}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={getContactHandlePlaceholder(contactMethod)}
          required
          type="text"
          value={value}
        />
      </div>
    );
  }

  return (
    <Input
      autoComplete={contactMethod === "email" ? "email" : "off"}
      disabled={disabled}
      id="manual-inquiry-contact-handle"
      inputMode={getContactHandleInputMode(contactMethod)}
      key={contactMethod}
      maxLength={320}
      name="customerContactHandle"
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={getContactHandlePlaceholder(contactMethod)}
      required
      type={getContactHandleInputType(contactMethod)}
      value={value}
    />
  );
}

function BudgetRangeInput({
  disabled,
  inputName,
  onChange,
  value,
}: {
  disabled: boolean;
  inputName: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const parts = value.split("-").map((p) => p.trim());
  const minValue = parts[0] ?? "";
  const maxValue = parts[1] ?? "";

  function combine(min: string, max: string) {
    if (min && max) return `${min} - ${max}`;
    if (min) return min;
    if (max) return `0 - ${max}`;
    return "";
  }

  return (
    <>
      <input type="hidden" name={inputName} value={value} />
      <div className="grid grid-cols-2 gap-3">
        <Input
          disabled={disabled}
          inputMode="numeric"
          min={0}
          onChange={(event) => onChange(combine(event.currentTarget.value, maxValue))}
          placeholder="Min"
          type="number"
          value={minValue}
        />
        <Input
          disabled={disabled}
          inputMode="numeric"
          min={0}
          onChange={(event) => onChange(combine(minValue, event.currentTarget.value))}
          placeholder="Max"
          type="number"
          value={maxValue}
        />
      </div>
    </>
  );
}
