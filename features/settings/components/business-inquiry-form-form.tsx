"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";

import {
  FormSection,
} from "@/components/shared/form-layout";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inquiryCustomFieldTypeMeta,
  inquiryContactFieldKeys,
  type InquiryContactFieldConfig,
  type InquiryContactFieldKey,
  type InquiryFormCustomFieldDefinition,
  type InquiryCustomFieldType,
  type InquiryFieldOption,
  type InquiryFormConfig,
  type InquiryFormFieldDefinition,
  type InquiryFormSystemFieldDefinition,
  getNormalizedInquiryFormConfig,
} from "@/features/inquiries/form-config";
import {
  businessTypeMeta,
  type BusinessType,
} from "@/features/inquiries/business-types";
import type {
  BusinessInquiryFormActionState,
  BusinessInquiryFormSettingsView,
} from "@/features/settings/types";
import { publicSlugMaxLength, publicSlugPattern } from "@/lib/slugs";
import { cn } from "@/lib/utils";

const MAX_CUSTOM_PROJECT_FIELDS = 12;
const MAX_CUSTOM_FIELD_OPTIONS = 12;

type BusinessInquiryFormFormProps = {
  applyPresetAction: (
    state: BusinessInquiryFormActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormActionState>;
  saveAction: (
    state: BusinessInquiryFormActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormActionState>;
  settings: BusinessInquiryFormSettingsView;
};

const initialState: BusinessInquiryFormActionState = {};

export function BusinessInquiryFormForm({
  applyPresetAction,
  saveAction,
  settings,
}: BusinessInquiryFormFormProps) {
  const normalizedSettingsConfig = useMemo(
    () =>
      getNormalizedInquiryFormConfig(settings.inquiryFormConfig, {
        businessType: settings.businessType,
      }),
    [settings.businessType, settings.inquiryFormConfig],
  );
  const router = useProgressRouter();
  const [saveState, saveFormAction, isSavePending] = useActionState(
    saveAction,
    initialState,
  );
  const [presetState, presetFormAction, isPresetPending] = useActionState(
    applyPresetAction,
    initialState,
  );
  const [businessType, setBusinessType] = useState(settings.businessType);
  const [contactFields, setContactFields] = useState(
    normalizedSettingsConfig.contactFields,
  );
  const [projectFields, setProjectFields] = useState(
    normalizedSettingsConfig.projectFields,
  );
  const [groupLabels, setGroupLabels] = useState(normalizedSettingsConfig.groupLabels);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [isEditingProjectGroupLabel, setIsEditingProjectGroupLabel] = useState(false);
  const [projectGroupLabelDraft, setProjectGroupLabelDraft] = useState(() => {
    return normalizedSettingsConfig.groupLabels.project;
  });
  const formRef = useRef<HTMLFormElement>(null);
  const projectFieldLabelInputRefs = useRef(new Map<string, HTMLInputElement | null>());
  const projectFieldTimeoutsRef = useRef<number[]>([]);
  const [nameDraft, setNameDraft] = useState(settings.formName);
  const [slugDraft, setSlugDraft] = useState(settings.formSlug);
  const [enteringProjectFieldIds, setEnteringProjectFieldIds] = useState<string[]>([]);
  const [exitingProjectFieldIds, setExitingProjectFieldIds] = useState<string[]>([]);
  const [pendingProjectFieldFocusId, setPendingProjectFieldFocusId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!presetState.success) {
      return;
    }

    router.refresh();
  }, [presetState.success, router]);

  useEffect(() => {
    if (!saveState.success) {
      return;
    }

    // Refresh to pull normalized config from the server, so
    // "unsaved changes" clears and public form previews update.
    router.refresh();
  }, [router, saveState.success]);

  const activeProjectFields = useMemo(
    () =>
      exitingProjectFieldIds.length === 0
        ? projectFields
        : projectFields.filter(
            (field) => !exitingProjectFieldIds.includes(getFieldId(field)),
          ),
    [exitingProjectFieldIds, projectFields],
  );
  const serializedConfig = JSON.stringify({
    version: 1,
    businessType,
    groupLabels,
    contactFields,
    projectFields: activeProjectFields,
  } satisfies InquiryFormConfig);
  const initialSerializedConfig = useMemo(
    () =>
      JSON.stringify({
        version: 1,
        businessType: settings.businessType,
        groupLabels: normalizedSettingsConfig.groupLabels,
        contactFields: normalizedSettingsConfig.contactFields,
        projectFields: normalizedSettingsConfig.projectFields,
      } satisfies InquiryFormConfig),
    [
      settings.businessType,
      normalizedSettingsConfig.contactFields,
      normalizedSettingsConfig.groupLabels,
      normalizedSettingsConfig.projectFields,
    ],
  );

  const hasConfigChanges = serializedConfig !== initialSerializedConfig;
  const hasTextInputChanges =
    nameDraft !== settings.formName || slugDraft !== settings.formSlug;
  const hasUnsavedChanges = hasConfigChanges || hasTextInputChanges;
  const [shouldRenderFloatingActions, setShouldRenderFloatingActions] = useState(false);
  const [floatingActionsState, setFloatingActionsState] = useState<"open" | "closed">(
    "closed",
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      clearProjectFieldTimers(projectFieldTimeoutsRef);
      setBusinessType(settings.businessType);
      setContactFields(normalizedSettingsConfig.contactFields);
      setProjectFields(normalizedSettingsConfig.projectFields);
      setGroupLabels(normalizedSettingsConfig.groupLabels);
      setProjectGroupLabelDraft(normalizedSettingsConfig.groupLabels.project);
      setIsEditingProjectGroupLabel(false);
      setNameDraft(settings.formName);
      setSlugDraft(settings.formSlug);
      setEnteringProjectFieldIds([]);
      setExitingProjectFieldIds([]);
      setPendingProjectFieldFocusId(null);
    });
  }, [
    normalizedSettingsConfig.contactFields,
    normalizedSettingsConfig.groupLabels,
    normalizedSettingsConfig.projectFields,
    settings.businessType,
    settings.formId,
    settings.formName,
    settings.formSlug,
  ]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    return () => clearProjectFieldTimers(projectFieldTimeoutsRef);
  }, []);

  useEffect(() => {
    if (hasUnsavedChanges) {
      queueMicrotask(() => {
        setShouldRenderFloatingActions(true);
        setFloatingActionsState("open");
      });
      return;
    }

    queueMicrotask(() => {
      setFloatingActionsState("closed");
    });
    const timeout = window.setTimeout(
      () => setShouldRenderFloatingActions(false),
      prefersReducedMotion ? 0 : 180,
    );
    return () => window.clearTimeout(timeout);
  }, [hasUnsavedChanges, prefersReducedMotion]);

  useEffect(() => {
    if (!pendingProjectFieldFocusId) {
      return;
    }

    const input = projectFieldLabelInputRefs.current.get(pendingProjectFieldFocusId);

    if (!input) {
      return;
    }

    queueMicrotask(() => {
      input.focus();
      input.select();
      setPendingProjectFieldFocusId(null);
    });
  }, [pendingProjectFieldFocusId, projectFields]);

  function updateContactField(
    key: InquiryContactFieldKey,
    patch: Partial<InquiryContactFieldConfig>,
  ) {
    setContactFields((currentFields) => ({
      ...currentFields,
      [key]: {
        ...currentFields[key],
        ...patch,
      },
    }));
  }

  function updateProjectField(
    fieldId: string,
    patch: Partial<InquiryFormFieldDefinition>,
  ) {
    setProjectFields((currentFields) =>
      currentFields.map((field) =>
        getFieldId(field) === fieldId ? ({ ...field, ...patch } as InquiryFormFieldDefinition) : field,
      ),
    );
  }

  function moveProjectField(fieldId: string, direction: "up" | "down") {
    setProjectFields((currentFields) => {
      const index = currentFields.findIndex((field) => getFieldId(field) === fieldId);

      if (index < 0) {
        return currentFields;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= currentFields.length) {
        return currentFields;
      }

      const nextFields = [...currentFields];
      const [movedField] = nextFields.splice(index, 1);
      nextFields.splice(nextIndex, 0, movedField);

      return nextFields;
    });
  }

  function removeProjectField(fieldId: string) {
    if (exitingProjectFieldIds.includes(fieldId)) {
      return;
    }

    setExitingProjectFieldIds((currentIds) =>
      currentIds.includes(fieldId) ? currentIds : [...currentIds, fieldId],
    );
    scheduleProjectFieldTimeout(
      projectFieldTimeoutsRef,
      () => {
        setProjectFields((currentFields) =>
          currentFields.filter((field) => getFieldId(field) !== fieldId),
        );
        setExitingProjectFieldIds((currentIds) =>
          currentIds.filter((currentId) => currentId !== fieldId),
        );
      },
      prefersReducedMotion ? 0 : 180,
    );
  }

  function addCustomField() {
    if (hasReachedCustomFieldLimit) {
      return;
    }

    const draft = createCustomFieldDraft({
      label: "New field",
      placeholder: "",
    });
    const fieldId = getFieldId(draft);

    setProjectFields((currentFields) => [...currentFields, draft]);
    setEnteringProjectFieldIds((currentIds) =>
      currentIds.includes(fieldId) ? currentIds : [...currentIds, fieldId],
    );
    setPendingProjectFieldFocusId(fieldId);
    scheduleProjectFieldTimeout(
      projectFieldTimeoutsRef,
      () =>
        setEnteringProjectFieldIds((currentIds) =>
          currentIds.filter((currentId) => currentId !== fieldId),
        ),
      prefersReducedMotion ? 0 : 220,
    );
  }

  function changeCustomFieldType(
    fieldId: string,
    fieldType: InquiryCustomFieldType,
  ) {
    setProjectFields((currentFields) =>
      currentFields.map((field) => {
        if (getFieldId(field) !== fieldId || field.kind !== "custom") {
          return field;
        }

        if (fieldType === "select" || fieldType === "multi_select") {
          return {
            ...field,
            fieldType,
            options:
              field.options?.length ? field.options : [createFieldOptionDraft()],
          };
        }

        return {
          ...field,
          fieldType,
          options: undefined,
        };
      }),
    );
  }

  function updateCustomFieldOption(
    fieldId: string,
    optionId: string,
    patch: Partial<InquiryFieldOption>,
  ) {
    setProjectFields((currentFields) =>
      currentFields.map((field) => {
        if (
          getFieldId(field) !== fieldId ||
          field.kind !== "custom" ||
          !field.options
        ) {
          return field;
        }

        return {
          ...field,
          options: field.options.map((option) =>
            option.id === optionId ? { ...option, ...patch } : option,
          ),
        };
      }),
    );
  }

  function addCustomFieldOption(fieldId: string) {
    setProjectFields((currentFields) =>
      currentFields.map((field) => {
        if (
          getFieldId(field) !== fieldId ||
          field.kind !== "custom" ||
          (field.fieldType !== "select" && field.fieldType !== "multi_select")
        ) {
          return field;
        }

        return {
          ...field,
          options: [...(field.options ?? []), createFieldOptionDraft()],
        };
      }),
    );
  }

  function removeCustomFieldOption(fieldId: string, optionId: string) {
    setProjectFields((currentFields) =>
      currentFields.map((field) => {
        if (
          getFieldId(field) !== fieldId ||
          field.kind !== "custom" ||
          !field.options
        ) {
          return field;
        }

        return {
          ...field,
          options:
            field.options.length === 1
              ? field.options
              : field.options.filter((option) => option.id !== optionId),
        };
      }),
    );
  }

  const configError = saveState.fieldErrors?.inquiryFormConfig?.[0];
  const businessTypeError = saveState.fieldErrors?.businessType?.[0];
  const nameError = saveState.fieldErrors?.name?.[0];
  const slugError = saveState.fieldErrors?.slug?.[0];

  function handleCancelChanges() {
    formRef.current?.reset();
    clearProjectFieldTimers(projectFieldTimeoutsRef);
    setBusinessType(settings.businessType);
    setGroupLabels(normalizedSettingsConfig.groupLabels);
    setContactFields(normalizedSettingsConfig.contactFields);
    setProjectFields(normalizedSettingsConfig.projectFields);
    setIsEditingProjectGroupLabel(false);
    setNameDraft(settings.formName);
    setSlugDraft(settings.formSlug);
    setEnteringProjectFieldIds([]);
    setExitingProjectFieldIds([]);
    setPendingProjectFieldFocusId(null);
  }

  function startEditingProjectGroupLabel() {
    setProjectGroupLabelDraft(groupLabels.project);
    setIsEditingProjectGroupLabel(true);
  }

  function saveProjectGroupLabel() {
    const trimmed = projectGroupLabelDraft.trim();

    if (!trimmed) {
      return;
    }

    setGroupLabels((current) => ({ ...current, project: trimmed }));
    setProjectGroupLabelDraft(trimmed);
    setIsEditingProjectGroupLabel(false);
  }

  function cancelProjectGroupLabelEdit() {
    setProjectGroupLabelDraft(groupLabels.project);
    setIsEditingProjectGroupLabel(false);
  }

  const customProjectFieldCount = useMemo(
    () => activeProjectFields.filter((field) => field.kind === "custom").length,
    [activeProjectFields],
  );
  const hasReachedCustomFieldLimit = customProjectFieldCount >= MAX_CUSTOM_PROJECT_FIELDS;
  const isFieldInteractionLocked = isSavePending || exitingProjectFieldIds.length > 0;

  return (
    <>
      <form
        action={saveFormAction}
        className="form-stack pb-28"
        ref={formRef}
      >
        {saveState.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not save the inquiry form.</AlertTitle>
            <AlertDescription>{saveState.error}</AlertDescription>
          </Alert>
        ) : null}

        {saveState.success ? (
          <Alert>
            <CheckCircle2 data-icon="inline-start" />
            <AlertTitle>Inquiry form saved</AlertTitle>
            <AlertDescription>{saveState.success}</AlertDescription>
          </Alert>
        ) : null}

        {presetState.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not apply the preset.</AlertTitle>
            <AlertDescription>{presetState.error}</AlertDescription>
          </Alert>
        ) : null}

        {presetState.success ? (
          <Alert>
            <CheckCircle2 data-icon="inline-start" />
            <AlertTitle>Preset applied</AlertTitle>
            <AlertDescription>{presetState.success}</AlertDescription>
          </Alert>
        ) : null}

        <input name="formId" type="hidden" value={settings.formId} />
        <input name="businessType" type="hidden" value={businessType} />
        <input name="inquiryFormConfig" type="hidden" value={serializedConfig} />

        <Card className="gap-0 border-border/75 bg-card/97">
          <CardHeader className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Preset</CardTitle>
            <Button
              onClick={() => setIsPresetDialogOpen(true)}
              type="button"
              variant="outline"
            >
              <RefreshCcw data-icon="inline-start" />
              Apply defaults
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-0">
            <FormSection
              title="Business type"
            >
              <div className="grid gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <Field>
                  <FieldLabel htmlFor="business-inquiry-form-name">
                    Form name
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      aria-invalid={Boolean(nameError) || undefined}
                      defaultValue={settings.formName}
                      disabled={isSavePending}
                      id="business-inquiry-form-name"
                      maxLength={80}
                      minLength={2}
                      name="name"
                      onChange={(event) => {
                        setNameDraft(event.currentTarget.value);
                      }}
                      required
                    />
                    <FieldError
                      errors={nameError ? [{ message: nameError }] : undefined}
                    />
                  </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(slugError) || undefined}>
                  <FieldLabel htmlFor="business-inquiry-form-slug">
                    Form slug
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      aria-invalid={Boolean(slugError) || undefined}
                      defaultValue={settings.formSlug}
                      disabled={isSavePending}
                      id="business-inquiry-form-slug"
                      maxLength={publicSlugMaxLength}
                      minLength={2}
                      name="slug"
                      onChange={(event) => {
                        setSlugDraft(event.currentTarget.value);
                      }}
                      pattern={publicSlugPattern}
                      required
                      spellCheck={false}
                    />
                    <FieldError
                      errors={slugError ? [{ message: slugError }] : undefined}
                    />
                  </FieldContent>
                  </Field>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <Field data-invalid={Boolean(businessTypeError) || undefined}>
                    <FieldLabel htmlFor="business-inquiry-business-type">
                      Type
                    </FieldLabel>
                    <FieldContent>
                      <Select
                        onValueChange={(value) =>
                          setBusinessType(value as BusinessType)
                        }
                        value={businessType}
                      >
                        <SelectTrigger
                          className="w-full"
                          id="business-inquiry-business-type"
                        >
                          <SelectValue placeholder="Choose a business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Object.entries(businessTypeMeta).map(
                              ([value, meta]) => (
                                <SelectItem key={value} value={value}>
                                  {meta.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError
                        errors={
                          businessTypeError
                            ? [{ message: businessTypeError }]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>

                  <div className="soft-panel flex items-center px-4 py-4 shadow-none">
                    <p className="text-sm font-medium text-foreground">
                      {businessTypeMeta[businessType].label}
                    </p>
                  </div>
                </div>
              </div>
            </FormSection>

            {configError ? (
              <FieldError errors={[{ message: configError }]} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="gap-0 border-border/75 bg-card/97">
          <CardHeader className="gap-2 pb-5">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-xl">{groupLabels.contact}</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Edit the fields shown in Contact.
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <InquiryFieldSection
              countLabel={`${inquiryContactFieldKeys.length} fields`}
              helperText="Name and email stay shown and required."
              title="Contact fields"
            >
              {inquiryContactFieldKeys.map((contactKey, index) => (
                <ContactFieldCard
                  contactKey={contactKey}
                  field={contactFields[contactKey]}
                  index={index}
                  isPending={isFieldInteractionLocked}
                  key={contactKey}
                  onChange={updateContactField}
                />
              ))}
            </InquiryFieldSection>
          </CardContent>
        </Card>

        <Card className="gap-0 border-border/75 bg-card/97">
          <CardHeader className="gap-2 pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-2">
                {isEditingProjectGroupLabel ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      autoFocus
                      className="h-9 w-full sm:w-64"
                      maxLength={40}
                      onChange={(event) => setProjectGroupLabelDraft(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          saveProjectGroupLabel();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelProjectGroupLabelEdit();
                        }
                      }}
                      value={projectGroupLabelDraft}
                    />
                    <Button onClick={saveProjectGroupLabel} type="button" variant="outline">
                      Save
                    </Button>
                    <Button onClick={cancelProjectGroupLabelEdit} type="button" variant="ghost">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{groupLabels.project}</CardTitle>
                    <Button
                      onClick={startEditingProjectGroupLabel}
                      type="button"
                      variant="outline"
                    >
                      Edit
                    </Button>
                  </div>
                )}
                <p className="text-sm leading-6 text-muted-foreground">
                  Manage the fields shown in {groupLabels.project}.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <InquiryFieldSection
              action={
                <Button
                  disabled={isFieldInteractionLocked || hasReachedCustomFieldLimit}
                  onClick={addCustomField}
                  type="button"
                  variant="outline"
                >
                  <Plus data-icon="inline-start" />
                  Add field
                </Button>
              }
              countLabel={`${customProjectFieldCount}/${MAX_CUSTOM_PROJECT_FIELDS} custom`}
              helperText="Service/category and details stay shown and required."
              title="Field library"
            >
              {projectFields.map((field, index) => {
                const fieldId = getFieldId(field);

                return (
                  <ProjectFieldCard
                    field={field}
                    index={index}
                    inputRef={(node) => {
                      if (node) {
                        projectFieldLabelInputRefs.current.set(fieldId, node);
                        return;
                      }

                      projectFieldLabelInputRefs.current.delete(fieldId);
                    }}
                    isEntering={enteringProjectFieldIds.includes(fieldId)}
                    isExiting={exitingProjectFieldIds.includes(fieldId)}
                    isPending={isFieldInteractionLocked}
                    key={fieldId}
                    maxOptions={MAX_CUSTOM_FIELD_OPTIONS}
                    onAddOption={addCustomFieldOption}
                    onChangeCustomType={changeCustomFieldType}
                    onMove={moveProjectField}
                    onRemove={removeProjectField}
                    onRemoveOption={removeCustomFieldOption}
                    onUpdate={updateProjectField}
                    onUpdateOption={updateCustomFieldOption}
                    totalFields={projectFields.length}
                  />
                );
              })}

              {hasReachedCustomFieldLimit ? (
                <Alert>
                  <AlertTitle>Custom field limit reached</AlertTitle>
                  <AlertDescription>
                    You can add up to {MAX_CUSTOM_PROJECT_FIELDS} custom fields.
                  </AlertDescription>
                </Alert>
              ) : activeProjectFields.length <= 2 ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  Add fields for location, quantity, or preferences.
                </p>
              ) : null}
            </InquiryFieldSection>
          </CardContent>
        </Card>

        {shouldRenderFloatingActions ? (
          <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
            <div
              className="soft-panel motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-bottom-2 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=open]:duration-200 motion-safe:data-[state=open]:ease-(--motion-ease-emphasized) motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:slide-out-to-bottom-2 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=closed]:duration-150 motion-safe:data-[state=closed]:ease-(--motion-ease-standard) motion-reduce:animate-none flex w-full max-w-2xl items-center justify-between gap-3 border-border/80 bg-background/95 px-4 py-3 shadow-xl backdrop-blur"
              data-state={floatingActionsState}
            >
              <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
              <div className="flex items-center gap-2">
                <Button
                  disabled={isSavePending || !hasUnsavedChanges}
                  onClick={handleCancelChanges}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={isSavePending || exitingProjectFieldIds.length > 0} type="submit">
                  {isSavePending ? (
                    <>
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </form>

      <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply preset defaults?</DialogTitle>
            <DialogDescription>
              This will replace the current inquiry form and inquiry page with the{" "}
              {businessTypeMeta[businessType].label} preset.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsPresetDialogOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <form action={presetFormAction}>
              <input name="formId" type="hidden" value={settings.formId} />
              <input name="businessType" type="hidden" value={businessType} />
              <Button
                disabled={isPresetPending}
                onClick={() => setIsPresetDialogOpen(false)}
                type="submit"
              >
                {isPresetPending ? "Applying..." : "Apply preset"}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InquiryFieldSection({
  action,
  children,
  countLabel,
  helperText,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  countLabel: string;
  helperText?: string;
  title: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-border/70 bg-muted/15 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{countLabel}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-4 space-y-3">{children}</div>

      {helperText ? (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

function InquiryFieldCardShell({
  children,
  description,
  index,
  isEntering = false,
  isExiting = false,
  menu,
  meta,
  title,
}: {
  children: ReactNode;
  description: string;
  index: number;
  isEntering?: boolean;
  isExiting?: boolean;
  menu: ReactNode;
  meta: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "soft-panel rounded-[1.35rem] border border-border/75 bg-background/95 px-4 py-4 shadow-none motion-reduce:animate-none sm:px-5",
        isEntering &&
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200",
        isExiting &&
          "pointer-events-none motion-safe:animate-out motion-safe:fade-out-0 motion-safe:slide-out-to-bottom-2 motion-safe:duration-150",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-base font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{meta}</span>
              {menu}
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

function ContactFieldCard({
  contactKey,
  field,
  index,
  isPending,
  onChange,
}: {
  contactKey: InquiryContactFieldKey;
  field: InquiryContactFieldConfig;
  index: number;
  isPending: boolean;
  onChange: (key: InquiryContactFieldKey, patch: Partial<InquiryContactFieldConfig>) => void;
}) {
  const locked = isLockedContactField(contactKey);

  return (
    <InquiryFieldCardShell
      description={getContactFieldStateLabel(field)}
      index={index}
      menu={
        <FieldCardMenu
          deleteDisabled
          moveDownDisabled
          moveUpDisabled
          requiredChecked={field.required}
          requiredDisabled={locked || !field.enabled || isPending}
          showChecked={field.enabled}
          showDisabled={locked || isPending}
          title={field.label || getContactFieldKindLabel(contactKey)}
          typeDisabled
          typeLabel={getContactFieldKindLabel(contactKey)}
          onRequiredChange={(required) => onChange(contactKey, { required })}
          onShowChange={(enabled) =>
            onChange(contactKey, {
              enabled,
              required: enabled ? field.required : false,
            })
          }
        />
      }
      meta={getContactFieldKindLabel(contactKey)}
      title={field.label || getContactFieldKindLabel(contactKey)}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`contact-${contactKey}-label`}>Label</FieldLabel>
          <FieldContent>
            <Input
              disabled={isPending}
              id={`contact-${contactKey}-label`}
              maxLength={80}
              minLength={1}
              onChange={(event) =>
                onChange(contactKey, { label: event.currentTarget.value })
              }
              required
              value={field.label}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor={`contact-${contactKey}-placeholder`}>Placeholder</FieldLabel>
          <FieldContent>
            <Input
              disabled={isPending}
              id={`contact-${contactKey}-placeholder`}
              maxLength={160}
              onChange={(event) =>
                onChange(contactKey, { placeholder: event.currentTarget.value })
              }
              value={field.placeholder ?? ""}
            />
          </FieldContent>
        </Field>
      </div>
    </InquiryFieldCardShell>
  );
}

function ProjectFieldCard({
  field,
  index,
  inputRef,
  isEntering,
  isExiting,
  isPending,
  maxOptions,
  onAddOption,
  onChangeCustomType,
  onMove,
  onRemove,
  onRemoveOption,
  onUpdate,
  onUpdateOption,
  totalFields,
}: {
  field: InquiryFormFieldDefinition;
  index: number;
  inputRef: (node: HTMLInputElement | null) => void;
  isEntering: boolean;
  isExiting: boolean;
  isPending: boolean;
  maxOptions: number;
  onAddOption: (fieldId: string) => void;
  onChangeCustomType: (fieldId: string, fieldType: InquiryCustomFieldType) => void;
  onMove: (fieldId: string, direction: "up" | "down") => void;
  onRemove: (fieldId: string) => void;
  onRemoveOption: (fieldId: string, optionId: string) => void;
  onUpdate: (fieldId: string, patch: Partial<InquiryFormFieldDefinition>) => void;
  onUpdateOption: (fieldId: string, optionId: string, patch: Partial<InquiryFieldOption>) => void;
  totalFields: number;
}) {
  const fieldId = getFieldId(field);
  const isSystem = field.kind === "system";
  const isLockedRequired =
    isSystem && (field.key === "serviceCategory" || field.key === "details");
  const canToggleEnabled = isSystem && !isLockedRequired;
  const canToggleRequired =
    field.kind === "custom" ? true : field.key !== "attachment" && !isLockedRequired;
  const optionCount = field.kind === "custom" ? (field.options?.length ?? 0) : 0;

  return (
    <InquiryFieldCardShell
      description={getProjectFieldStateLabel(field)}
      index={index}
      isEntering={isEntering}
      isExiting={isExiting}
      menu={
        <FieldCardMenu
          deleteDisabled={isSystem || isPending}
          moveDownDisabled={isPending || index === totalFields - 1}
          moveUpDisabled={isPending || index === 0}
          requiredChecked={field.required}
          requiredDisabled={!canToggleRequired || (isSystem && !field.enabled) || isPending}
          showChecked={field.kind === "system" ? field.enabled : true}
          showDisabled={field.kind === "custom" || !canToggleEnabled || isPending}
          title={field.label || (isSystem ? getSystemFieldTitle(field) : "New field")}
          typeDisabled={field.kind !== "custom" || isPending}
          typeLabel={getFieldTypeLabel(field)}
          typeValue={field.kind === "custom" ? field.fieldType : undefined}
          onDelete={() => onRemove(fieldId)}
          onMoveDown={() => onMove(fieldId, "down")}
          onMoveUp={() => onMove(fieldId, "up")}
          onRequiredChange={(required) => onUpdate(fieldId, { required })}
          onShowChange={(enabled) => {
            if (field.kind !== "system") {
              return;
            }

            onUpdate(fieldId, {
              enabled,
              required: field.key === "attachment" ? false : enabled ? field.required : false,
            });
          }}
          onTypeChange={(fieldType) => onChangeCustomType(fieldId, fieldType)}
        />
      }
      meta={getFieldTypeLabel(field)}
      title={field.label || (isSystem ? getSystemFieldTitle(field) : "New field")}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-label`}>Label</FieldLabel>
          <FieldContent>
            <Input
              disabled={isPending}
              id={`${fieldId}-label`}
              maxLength={80}
              minLength={1}
              onChange={(event) =>
                onUpdate(fieldId, { label: event.currentTarget.value })
              }
              ref={inputRef}
              required
              value={field.label}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${fieldId}-placeholder`}>Placeholder</FieldLabel>
          <FieldContent>
            <Input
              disabled={isPending}
              id={`${fieldId}-placeholder`}
              maxLength={160}
              onChange={(event) =>
                onUpdate(fieldId, { placeholder: event.currentTarget.value })
              }
              value={field.placeholder ?? ""}
            />
          </FieldContent>
        </Field>
      </div>

      {field.kind === "custom" &&
      (field.fieldType === "select" || field.fieldType === "multi_select") ? (
        <div className="space-y-3 border-t border-border/70 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Options</p>
              <p className="text-xs text-muted-foreground">
                {optionCount}/{maxOptions} options
              </p>
            </div>
            <Button
              disabled={isPending || optionCount >= maxOptions}
              onClick={() => onAddOption(fieldId)}
              type="button"
              variant="outline"
            >
              <Plus data-icon="inline-start" />
              Add option
            </Button>
          </div>

          <div className="space-y-2">
            {(field.options ?? []).map((option) => (
              <div
                className="grid gap-3 rounded-xl border border-border/70 bg-background/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                key={option.id}
              >
                <Input
                  disabled={isPending}
                  maxLength={80}
                  onChange={(event) =>
                    onUpdateOption(fieldId, option.id, {
                      label: event.currentTarget.value,
                      value: normalizeOptionValue(event.currentTarget.value),
                    })
                  }
                  placeholder="Label"
                  value={option.label}
                />
                <Button
                  disabled={isPending || (field.options?.length ?? 0) === 1}
                  onClick={() => onRemoveOption(fieldId, option.id)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </InquiryFieldCardShell>
  );
}

function FieldCardMenu({
  deleteDisabled = false,
  moveDownDisabled = false,
  moveUpDisabled = false,
  onDelete,
  onMoveDown,
  onMoveUp,
  onRequiredChange,
  onShowChange,
  onTypeChange,
  requiredChecked,
  requiredDisabled,
  showChecked,
  showDisabled,
  title,
  typeDisabled,
  typeLabel,
  typeValue,
}: {
  deleteDisabled?: boolean;
  moveDownDisabled?: boolean;
  moveUpDisabled?: boolean;
  onDelete?: () => void;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRequiredChange?: (checked: boolean) => void;
  onShowChange?: (checked: boolean) => void;
  onTypeChange?: (fieldType: InquiryCustomFieldType) => void;
  requiredChecked: boolean;
  requiredDisabled: boolean;
  showChecked: boolean;
  showDisabled: boolean;
  title: string;
  typeDisabled: boolean;
  typeLabel: string;
  typeValue?: InquiryCustomFieldType;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-8 rounded-full" size="icon" type="button" variant="ghost">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <p className="px-2 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showChecked}
          disabled={showDisabled}
          onCheckedChange={(checked) => {
            if (typeof checked !== "boolean") {
              return;
            }

            onShowChange?.(checked);
          }}
        >
          Show
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={requiredChecked}
          disabled={requiredDisabled}
          onCheckedChange={(checked) => {
            if (typeof checked !== "boolean") {
              return;
            }

            onRequiredChange?.(checked);
          }}
        >
          Required
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={typeDisabled}>
            <span>Type</span>
            <span className="ml-auto text-xs text-muted-foreground">{typeLabel}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44 rounded-xl">
            <DropdownMenuRadioGroup
              onValueChange={(value) =>
                onTypeChange?.(value as InquiryCustomFieldType)
              }
              value={typeValue ?? ""}
            >
              {Object.entries(inquiryCustomFieldTypeMeta).map(([value, meta]) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {meta.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={moveUpDisabled} onSelect={onMoveUp}>
          Move up
        </DropdownMenuItem>
        <DropdownMenuItem disabled={moveDownDisabled} onSelect={onMoveDown}>
          Move down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={deleteDisabled} onSelect={onDelete} variant="destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectFieldDetails() {
  /*
  if (!field) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-tight text-foreground">Project field</p>
        <p className="text-sm text-muted-foreground">Select a field to edit.</p>
      </div>
    );
  }

  const fieldId = getFieldId(field);
  const isSystem = field.kind === "system";
  const isLockedRequired =
    isSystem && (field.key === "serviceCategory" || field.key === "details");
  const canToggleEnabled = isSystem && !isLockedRequired;
  const canToggleRequired =
    field.kind === "custom" ? true : field.key !== "attachment" && !isLockedRequired;
  const optionCount = field.kind === "custom" ? (field.options?.length ?? 0) : 0;

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold tracking-tight text-foreground">Project field</p>
        <p className="text-sm text-muted-foreground">
          {isSystem ? "System field" : "Custom field"} — edits affect the public form.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label
          className={cn(
            "flex items-center gap-3 px-1 py-1",
            (field.kind === "system" ? !canToggleEnabled : false) && "opacity-70",
          )}
        >
          <Switch
            checked={field.kind === "system" ? field.enabled : true}
            disabled={field.kind === "system" ? !canToggleEnabled || isPending : true}
            onCheckedChange={(checked) => {
              if (field.kind !== "system") {
                return;
              }

              onUpdate(fieldId, {
                enabled: checked,
                required:
                  field.key === "attachment" ? false : checked ? field.required : false,
              });
            }}
          />
          <span className="text-sm font-medium text-foreground">Show</span>
        </label>

        <label
          className={cn(
            "flex items-center gap-3 px-1 py-1",
            !canToggleRequired && "opacity-70",
          )}
        >
          <Switch
            checked={field.required}
            disabled={!canToggleRequired || (isSystem && !field.enabled) || isPending}
            onCheckedChange={(checked) => onUpdate(fieldId, { required: checked })}
          />
          <span className="text-sm font-medium text-foreground">Required</span>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-label`}>Label</FieldLabel>
          <FieldContent>
            <Input
              disabled={isPending}
              id={`${fieldId}-label`}
              maxLength={80}
              minLength={1}
              onChange={(event) =>
                onUpdate(fieldId, { label: event.currentTarget.value })
              }
              required
              value={field.label}
            />
          </FieldContent>
        </Field>

        {field.kind === "custom" ? (
          <Field>
            <FieldLabel htmlFor={`${fieldId}-type`}>Field type</FieldLabel>
            <FieldContent>
              <Select
                onValueChange={(value) =>
                  onChangeCustomType(fieldId, value as InquiryCustomFieldType)
                }
                value={field.fieldType}
              >
                <SelectTrigger className="w-full" id={`${fieldId}-type`}>
                  <SelectValue placeholder="Choose a field type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(inquiryCustomFieldTypeMeta).map(([value, meta]) => (
                      <SelectItem key={value} value={value}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        ) : (
          <Field>
            <FieldLabel>Field type</FieldLabel>
            <FieldContent>
              <Input disabled value={getSystemFieldInputKindLabel(field)} />
            </FieldContent>
          </Field>
        )}
      </div>

      <div className="grid gap-4">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-placeholder`}>Placeholder</FieldLabel>
          <FieldContent>
            {isTextareaField(field) ? (
              <Textarea
                disabled={isPending}
                id={`${fieldId}-placeholder`}
                maxLength={160}
                onChange={(event) =>
                  onUpdate(fieldId, { placeholder: event.currentTarget.value })
                }
                rows={3}
                value={field.placeholder ?? ""}
              />
            ) : (
              <Input
                disabled={isPending}
                id={`${fieldId}-placeholder`}
                maxLength={160}
                onChange={(event) =>
                  onUpdate(fieldId, { placeholder: event.currentTarget.value })
                }
                value={field.placeholder ?? ""}
              />
            )}
          </FieldContent>
        </Field>
      </div>

      {field.kind === "custom" &&
      (field.fieldType === "select" || field.fieldType === "multi_select") ? (
        <>
          <Separator />
          <FormSection
            action={
              <Button
                disabled={isPending || optionCount >= maxOptions}
                onClick={() => onAddOption(fieldId)}
                type="button"
                variant="outline"
              >
                <Plus data-icon="inline-start" />
                Add option
              </Button>
            }
            title="Options"
          >
            <div className="grid gap-3">
              {(field.options ?? []).map((option) => (
                <div
                  className="grid gap-3 rounded-xl border border-border/70 bg-background/70 p-3 md:grid-cols-[minmax(0,1fr)_auto]"
                  key={option.id}
                >
                  <Input
                    disabled={isPending}
                    maxLength={80}
                    onChange={(event) =>
                      onUpdateOption(fieldId, option.id, {
                        label: event.currentTarget.value,
                        value: normalizeOptionValue(event.currentTarget.value),
                      })
                    }
                    placeholder="Label"
                    value={option.label}
                  />
                  <Button
                    disabled={isPending || (field.options?.length ?? 0) === 1}
                    onClick={() => onRemoveOption(fieldId, option.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {optionCount}/{maxOptions} options
              </p>
            </div>
          </FormSection>
        </>
      ) : null}
    </>
  );
  */
  return null;
}

void ProjectFieldDetails;

function getFieldId(field: InquiryFormFieldDefinition) {
  return field.kind === "system" ? field.key : field.id;
}

function clearProjectFieldTimers(timeoutRef: MutableRefObject<number[]>) {
  for (const timeoutId of timeoutRef.current) {
    window.clearTimeout(timeoutId);
  }

  timeoutRef.current = [];
}

function scheduleProjectFieldTimeout(
  timeoutRef: MutableRefObject<number[]>,
  callback: () => void,
  delay: number,
) {
  const timeoutId = window.setTimeout(() => {
    timeoutRef.current = timeoutRef.current.filter((currentId) => currentId !== timeoutId);
    callback();
  }, delay);

  timeoutRef.current = [...timeoutRef.current, timeoutId];
}

function isLockedContactField(contactKey: InquiryContactFieldKey) {
  return contactKey === "customerName" || contactKey === "customerEmail";
}

function getContactFieldKindLabel(contactKey: InquiryContactFieldKey) {
  switch (contactKey) {
    case "customerName":
      return "Name";
    case "customerEmail":
      return "Email";
    case "customerPhone":
      return "Phone";
    case "companyName":
      return "Company";
  }
}

function getContactFieldStateLabel(field: InquiryContactFieldConfig) {
  if (!field.enabled) {
    return "Hidden from the form.";
  }

  return field.required ? "Required in the form." : "Optional in the form.";
}

function getProjectFieldStateLabel(field: InquiryFormFieldDefinition) {
  if (field.kind === "system" && !field.enabled) {
    return "Hidden from the form.";
  }

  return field.required ? "Required in the form." : "Shown in the form.";
}

function getFieldTypeLabel(field: InquiryFormFieldDefinition) {
  return field.kind === "system"
    ? getSystemFieldInputKindLabel(field)
    : inquiryCustomFieldTypeMeta[field.fieldType].label;
}

function getSystemFieldTitle(field: InquiryFormSystemFieldDefinition) {
  switch (field.key) {
    case "serviceCategory":
      return "Service/category";
    case "requestedDeadline":
      return "Requested deadline";
    case "budgetText":
      return "Budget";
    case "details":
      return "Details";
    case "attachment":
      return "Attachment";
  }
}

function getSystemFieldInputKindLabel(field: InquiryFormSystemFieldDefinition) {
  switch (field.key) {
    case "requestedDeadline":
      return "Date";
    case "details":
      return "Long text";
    case "attachment":
      return "File upload";
    default:
      return "Text";
  }
}

function normalizeOptionValue(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

function createCustomFieldDraft(
  overrides: Partial<
    Pick<InquiryFormCustomFieldDefinition, "label" | "placeholder" | "fieldType">
  > = {},
): InquiryFormCustomFieldDefinition {
  const fieldType = overrides.fieldType ?? "short_text";

  return {
    kind: "custom",
    id: `custom_${crypto.randomUUID().replace(/-/g, "")}`,
    fieldType,
    label: overrides.label ?? "",
    placeholder: overrides.placeholder ?? "",
    required: false,
    options:
      fieldType === "select" || fieldType === "multi_select"
        ? [createFieldOptionDraft()]
        : undefined,
  };
}

function createFieldOptionDraft(): InquiryFieldOption {
  const id = `option_${crypto.randomUUID().replace(/-/g, "")}`;

  return {
    id,
    label: "",
    value: "",
  };
}
