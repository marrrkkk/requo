"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  AlignLeft,
  Calendar,
  ChevronDown,
  Eye,
  GripVertical,
  Hash,
  ListChecks,
  MoreHorizontal,
  Plus,
  PencilLine,
  ToggleLeft,
  Trash2,
  Type,
} from "lucide-react";

import { FloatingFormActions } from "@/components/shared/floating-form-actions";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import type {
  BusinessInquiryFormActionState,
  BusinessInquiryFormPreviewDraft,
  BusinessInquiryFormSettingsView,
} from "@/features/settings/types";
import { cn } from "@/lib/utils";

const MAX_CUSTOM_PROJECT_FIELDS = 12;
const MAX_CUSTOM_FIELD_OPTIONS = 12;
const inquiryProjectFieldsDndContextId = "business-inquiry-project-fields-dnd";
const inquiryProjectFieldsSortableContextId =
  "business-inquiry-project-fields-sortable";
const inquirySortableTransition = {
  duration: 160,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
} as const;

type BusinessInquiryFormFormProps = {
  saveAction: (
    state: BusinessInquiryFormActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormActionState>;
  onDraftChange: (draft: BusinessInquiryFormPreviewDraft) => void;
  onPreview: () => void;
  draft: BusinessInquiryFormPreviewDraft;
  isActive: boolean;
  settings: BusinessInquiryFormSettingsView;
};

const initialState: BusinessInquiryFormActionState = {};

export function BusinessInquiryFormForm({
  saveAction,
  onDraftChange,
  onPreview,
  draft,
  isActive,
  settings,
}: BusinessInquiryFormFormProps) {
  const router = useProgressRouter();
  const normalizedSettingsConfig = useMemo(
    () =>
      getNormalizedInquiryFormConfig(settings.inquiryFormConfig, {
        businessType: settings.businessType,
      }),
    [settings.businessType, settings.inquiryFormConfig],
  );
  const [saveState, saveFormAction, isSavePending] =
    useActionStateWithSonner(saveAction, initialState);
  const [contactFields, setContactFields] = useState(draft.inquiryFormConfig.contactFields);
  const [projectFields, setProjectFields] = useState(draft.inquiryFormConfig.projectFields);
  const [groupLabels, setGroupLabels] = useState(draft.inquiryFormConfig.groupLabels);
  const [isEditingProjectGroupLabel, setIsEditingProjectGroupLabel] = useState(false);
  const [projectGroupLabelDraft, setProjectGroupLabelDraft] = useState(
    draft.inquiryFormConfig.groupLabels.project,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const projectFieldLabelInputRefs = useRef(new Map<string, HTMLInputElement | null>());
  const projectFieldCardRefs = useRef(new Map<string, HTMLDivElement | null>());
  const projectFieldRectsRef = useRef(new Map<string, DOMRect>());
  const projectFieldAnimationsRef = useRef(new Map<string, Animation>());
  const projectFieldTimeoutsRef = useRef<number[]>([]);
  const skipNextProjectFieldLayoutAnimationRef = useRef(false);
  const [enteringProjectFieldIds, setEnteringProjectFieldIds] = useState<string[]>([]);
  const [exitingProjectFieldIds, setExitingProjectFieldIds] = useState<string[]>([]);
  const [pendingProjectFieldFocusId, setPendingProjectFieldFocusId] = useState<
    string | null
  >(null);
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
  const [optionsEditFieldId, setOptionsEditFieldId] = useState<string | null>(null);
  const wasActiveRef = useRef(isActive);

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
    businessType: settings.businessType,
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

  const hasUnsavedChanges = serializedConfig !== initialSerializedConfig;
  const previewDraft = useMemo(
    () => ({
      businessType: settings.businessType,
      formName: settings.formName,
      formSlug: settings.formSlug,
      inquiryFormConfig: {
        version: 1,
        businessType: settings.businessType,
        groupLabels,
        contactFields,
        projectFields: activeProjectFields,
      } satisfies InquiryFormConfig,
      inquiryPageConfig: settings.inquiryPageConfig,
    }),
    [
      activeProjectFields,
      contactFields,
      groupLabels,
      settings.inquiryPageConfig,
      settings.businessType,
      settings.formName,
      settings.formSlug,
    ],
  );
  const [shouldRenderFloatingActions, setShouldRenderFloatingActions] = useState(false);
  const [floatingActionsState, setFloatingActionsState] = useState<"open" | "closed">(
    "closed",
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    onDraftChange(previewDraft);
  }, [isActive, onDraftChange, previewDraft]);

  useEffect(() => {
    if (!isActive || wasActiveRef.current) {
      wasActiveRef.current = isActive;
      return;
    }

    wasActiveRef.current = isActive;

    if (draftMatchesState({ draft, previewDraft })) {
      return;
    }

    queueMicrotask(() => {
      clearProjectFieldTimers(projectFieldTimeoutsRef);
      projectFieldRectsRef.current = new Map();
      for (const animation of projectFieldAnimationsRef.current.values()) {
        animation.cancel();
      }
      projectFieldAnimationsRef.current.clear();
      setContactFields(draft.inquiryFormConfig.contactFields);
      setProjectFields(draft.inquiryFormConfig.projectFields);
      setGroupLabels(draft.inquiryFormConfig.groupLabels);
      setProjectGroupLabelDraft(draft.inquiryFormConfig.groupLabels.project);
      setIsEditingProjectGroupLabel(false);
      setEnteringProjectFieldIds([]);
      setExitingProjectFieldIds([]);
      setPendingProjectFieldFocusId(null);
    });
  }, [draft, isActive, previewDraft]);

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();

    for (const field of projectFields) {
      const fieldId = getFieldId(field);
      const node = projectFieldCardRefs.current.get(fieldId);

      if (!node) {
        continue;
      }

      const nextRect = node.getBoundingClientRect();
      nextRects.set(fieldId, nextRect);

      if (prefersReducedMotion || skipNextProjectFieldLayoutAnimationRef.current) {
        continue;
      }

      const previousRect = projectFieldRectsRef.current.get(fieldId);

      if (!previousRect) {
        continue;
      }

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        continue;
      }

      const currentAnimation = projectFieldAnimationsRef.current.get(fieldId);
      currentAnimation?.cancel();

      const animation = node.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0px, 0px)" },
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );

      projectFieldAnimationsRef.current.set(fieldId, animation);

      void animation.finished
        .catch(() => undefined)
        .then(() => {
          if (projectFieldAnimationsRef.current.get(fieldId) === animation) {
            projectFieldAnimationsRef.current.delete(fieldId);
          }
        });
    }

    if (skipNextProjectFieldLayoutAnimationRef.current) {
      skipNextProjectFieldLayoutAnimationRef.current = false;
    }

    projectFieldRectsRef.current = nextRects;
  }, [prefersReducedMotion, projectFields]);

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

  function addCustomField(fieldType: InquiryCustomFieldType = "short_text") {
    if (hasReachedCustomFieldLimit) {
      return;
    }

    const draft = createCustomFieldDraft({
      label: "New field",
      placeholder: "",
      fieldType,
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

  const optionsEditField = useMemo(() => {
    if (!optionsEditFieldId) return null;
    const field = projectFields.find(
      (f) => getFieldId(f) === optionsEditFieldId,
    );
    return field?.kind === "custom" ? field : null;
  }, [optionsEditFieldId, projectFields]);

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

  function handleCancelChanges() {
    formRef.current?.reset();
    clearProjectFieldTimers(projectFieldTimeoutsRef);
    setGroupLabels(normalizedSettingsConfig.groupLabels);
    setContactFields(normalizedSettingsConfig.contactFields);
    setProjectFields(normalizedSettingsConfig.projectFields);
    setIsEditingProjectGroupLabel(false);
    setEnteringProjectFieldIds([]);
    setExitingProjectFieldIds([]);
    setPendingProjectFieldFocusId(null);
    setOptionsEditFieldId(null);
    setAddFieldDialogOpen(false);
  }

  function startEditingProjectGroupLabel() {
    setProjectGroupLabelDraft(groupLabels.project);
    setIsEditingProjectGroupLabel(true);
  }

  function saveProjectGroupLabel() {
    const trimmed = projectGroupLabelDraft.trim();

    if (!trimmed) {
      cancelProjectGroupLabelEdit();
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
  const projectFieldSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function resetProjectFieldAnimations() {
    for (const animation of projectFieldAnimationsRef.current.values()) {
      animation.cancel();
    }

    projectFieldAnimationsRef.current.clear();
  }

  function handleProjectFieldDragStart() {
    resetProjectFieldAnimations();
  }

  function handleProjectFieldDragCancel() {
    skipNextProjectFieldLayoutAnimationRef.current = false;
  }

  function handleProjectFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    skipNextProjectFieldLayoutAnimationRef.current = true;
    setProjectFields((currentFields) => {
      const activeIndex = currentFields.findIndex(
        (field) => getFieldId(field) === active.id,
      );
      const overIndex = currentFields.findIndex(
        (field) => getFieldId(field) === over.id,
      );

      if (activeIndex < 0 || overIndex < 0) {
        return currentFields;
      }

      return arrayMove(currentFields, activeIndex, overIndex);
    });
  }

  return (
    <>
      <form
        action={saveFormAction}
        className="form-stack pb-28"
        ref={formRef}
      >
        <input name="formId" type="hidden" value={settings.formId} />
        <input name="businessType" type="hidden" value={settings.businessType} />
        <input name="inquiryFormConfig" type="hidden" value={serializedConfig} />

        <div className="flex flex-col gap-8 sm:gap-10">
          <section className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                Fields
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Edit the contact and project fields shown in the public inquiry form.
              </p>
            </div>

            {businessTypeError ? (
              <FieldError errors={[{ message: businessTypeError }]} />
            ) : null}

            {configError ? (
              <FieldError errors={[{ message: configError }]} />
            ) : null}

            <InquiryFieldSection
              countLabel={`${inquiryContactFieldKeys.length} fields`}
              helperText="Name and email stay shown and required."
              title="Contact fields"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {inquiryContactFieldKeys.map((contactKey) => (
                  <ContactFieldCard
                    contactKey={contactKey}
                    field={contactFields[contactKey]}
                    key={contactKey}
                  />
                ))}
              </div>
            </InquiryFieldSection>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-2">
                {isEditingProjectGroupLabel ? (
                  <Input
                    autoFocus
                    className="h-auto w-full border-0 bg-transparent px-0 py-0 font-heading text-2xl leading-tight font-semibold tracking-tight text-foreground shadow-none md:text-2xl sm:w-auto sm:min-w-[16rem] focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0"
                    maxLength={40}
                    onBlur={saveProjectGroupLabel}
                    onChange={(event) =>
                      setProjectGroupLabelDraft(event.currentTarget.value)
                    }
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
                ) : (
                  <h2
                    className="cursor-text font-heading text-2xl font-semibold tracking-tight text-foreground"
                    onClick={startEditingProjectGroupLabel}
                  >
                    {groupLabels.project}
                  </h2>
                )}
                <p className="text-sm leading-6 text-muted-foreground">
                  Manage the fields shown in {groupLabels.project}.
                </p>
              </div>
            </div>

            <InquiryFieldSection
              action={
                <Button
                  className="w-full sm:w-auto"
                  disabled={isFieldInteractionLocked || hasReachedCustomFieldLimit}
                  onClick={() => setAddFieldDialogOpen(true)}
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
              <DndContext
                collisionDetection={closestCenter}
                id={inquiryProjectFieldsDndContextId}
                onDragCancel={handleProjectFieldDragCancel}
                onDragEnd={handleProjectFieldDragEnd}
                onDragStart={handleProjectFieldDragStart}
                sensors={projectFieldSensors}
              >
                <SortableContext
                  id={inquiryProjectFieldsSortableContextId}
                  items={projectFields.map((field) => getFieldId(field))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    {projectFields.map((field, index) => {
                      const fieldId = getFieldId(field);

                      return (
                        <ProjectFieldCard
                          cardRef={(node) => {
                            if (node) {
                              projectFieldCardRefs.current.set(fieldId, node);
                              return;
                            }

                            projectFieldCardRefs.current.delete(fieldId);
                          }}
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
                          onChangeCustomType={changeCustomFieldType}
                          onEditOptions={setOptionsEditFieldId}
                          onMove={moveProjectField}
                          onRemove={removeProjectField}
                          onUpdate={updateProjectField}
                          totalFields={projectFields.length}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>

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
          </section>
        </div>

        <FloatingFormActions
          className="max-w-3xl"
          disableSubmit={exitingProjectFieldIds.length > 0}
          extraAction={
            <Button
              className="w-full sm:w-auto"
              disabled={isSavePending}
              onClick={onPreview}
              type="button"
              variant="outline"
            >
              <Eye data-icon="inline-start" />
              Preview
            </Button>
          }
          isPending={isSavePending}
          onCancel={handleCancelChanges}
          stackActionsOnMobile
          state={floatingActionsState}
          visible={shouldRenderFloatingActions}
        />
      </form>

      <AddFieldDialog
        disabled={isFieldInteractionLocked || hasReachedCustomFieldLimit}
        onOpenChange={setAddFieldDialogOpen}
        onSelectType={(fieldType) => {
          addCustomField(fieldType);
          setAddFieldDialogOpen(false);
        }}
        open={addFieldDialogOpen}
      />

      <OptionsEditDialog
        field={optionsEditField}
        isPending={isFieldInteractionLocked}
        maxOptions={MAX_CUSTOM_FIELD_OPTIONS}
        onAddOption={addCustomFieldOption}
        onOpenChange={(open) => {
          if (!open) setOptionsEditFieldId(null);
        }}
        onRemoveOption={removeCustomFieldOption}
        onUpdateOption={updateCustomFieldOption}
        open={optionsEditFieldId !== null}
      />
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
    <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/15 p-3.5 sm:rounded-[1.75rem] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{countLabel}</p>
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>

      <div className="mt-4 space-y-3">{children}</div>

      {helperText ? (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

function ContactFieldCard({
  contactKey,
  field,
}: {
  contactKey: InquiryContactFieldKey;
  field: InquiryContactFieldConfig;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span className="truncate text-sm font-medium text-foreground">
          {field.label}
        </span>
        <Badge variant={field.required ? "secondary" : "outline"}>
          {field.required ? "Required" : "Optional"}
        </Badge>
      </div>
      <div className="flex h-10 w-full items-center rounded-md border border-input bg-transparent px-3 py-2 text-base text-muted-foreground opacity-50 md:text-sm">
        {field.placeholder}
      </div>
    </div>
  );
}

function ProjectFieldCard({
  cardRef,
  field,
  index,
  inputRef,
  isEntering,
  isExiting,
  isPending,
  onChangeCustomType,
  onEditOptions,
  onMove,
  onRemove,
  onUpdate,
  totalFields,
}: {
  cardRef?: (node: HTMLDivElement | null) => void;
  field: InquiryFormFieldDefinition;
  index: number;
  inputRef: (node: HTMLInputElement | null) => void;
  isEntering: boolean;
  isExiting: boolean;
  isPending: boolean;
  onChangeCustomType: (fieldId: string, fieldType: InquiryCustomFieldType) => void;
  onEditOptions: (fieldId: string) => void;
  onMove: (fieldId: string, direction: "up" | "down") => void;
  onRemove: (fieldId: string) => void;
  onUpdate: (fieldId: string, patch: Partial<InquiryFormFieldDefinition>) => void;
  totalFields: number;
}) {
  const fieldId = getFieldId(field);
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: fieldId,
    disabled: isPending || isExiting,
    transition: inquirySortableTransition,
  });
  const isSystem = field.kind === "system";
  const isLockedRequired =
    isSystem && (field.key === "serviceCategory" || field.key === "details");
  const canToggleEnabled = isSystem && !isLockedRequired;
  const canToggleRequired =
    field.kind === "custom"
      ? true
      : field.key !== "attachment" && !isLockedRequired;
  const hasSelectableOptions =
    field.kind === "custom" &&
    (field.fieldType === "select" || field.fieldType === "multi_select");
  const optionCount =
    field.kind === "custom" ? (field.options?.length ?? 0) : 0;
  const fieldIsWide = isWideField(field);
  const title =
    field.label || (isSystem ? getSystemFieldTitle(field) : "New field");
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(field.label);
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: isDragging ? "transform" : undefined,
  } satisfies CSSProperties;
  const handleCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      cardRef?.(node);
    },
    [cardRef, setNodeRef],
  );

  function startEditingLabel() {
    setLabelDraft(field.label);
    setIsEditingLabel(true);
  }

  function saveLabel() {
    const trimmed = labelDraft.trim();

    if (trimmed) {
      onUpdate(fieldId, { label: trimmed });
    }

    setIsEditingLabel(false);
  }

  function cancelLabel() {
    setLabelDraft(field.label);
    setIsEditingLabel(false);
  }

  return (
    <div
      className={cn(
        "flex gap-2",
        fieldIsWide && "sm:col-span-2",
        isDragging && "relative z-10",
      )}
      ref={handleCardRef}
      style={sortableStyle}
    >
      <button
        aria-label={`Reorder ${title}`}
        className="mt-1 shrink-0 cursor-grab touch-none self-start text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
        disabled={isPending || isExiting}
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg p-2 transition-shadow motion-reduce:animate-none",
          isDragging && "bg-background shadow-lg ring-2 ring-primary/20",
          isEntering &&
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200",
          isExiting &&
            "pointer-events-none motion-safe:animate-out motion-safe:fade-out-0 motion-safe:slide-out-to-bottom-2 motion-safe:duration-150",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {isEditingLabel ? (
            <input
              autoFocus
              className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm font-medium text-foreground outline-none focus:ring-0"
              maxLength={80}
              onBlur={saveLabel}
              onChange={(event) => setLabelDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveLabel();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelLabel();
                }
              }}
              ref={inputRef}
              value={labelDraft}
            />
          ) : (
            <button
              className="group flex min-w-0 items-center gap-1.5 text-left outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
              onClick={startEditingLabel}
              type="button"
            >
              <span className="truncate text-sm font-medium text-foreground">
                {title}
              </span>
              <PencilLine className="size-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <Badge variant={field.required ? "secondary" : "outline"}>
              {field.required ? "Required" : "Optional"}
            </Badge>
            <FieldCardMenu
              deleteDisabled={isSystem || isPending}
              hasSelectableOptions={hasSelectableOptions}
              moveDownDisabled={isPending || index === totalFields - 1}
              moveUpDisabled={isPending || index === 0}
              optionCount={optionCount}
              requiredChecked={field.required}
              requiredDisabled={
                !canToggleRequired ||
                (isSystem && !field.enabled) ||
                isPending
              }
              showChecked={field.kind === "system" ? field.enabled : true}
              showDisabled={
                field.kind === "custom" || !canToggleEnabled || isPending
              }
              title={title}
              typeDisabled={field.kind !== "custom" || isPending}
              typeLabel={getFieldTypeLabel(field)}
              typeValue={
                field.kind === "custom" ? field.fieldType : undefined
              }
              onDelete={() => onRemove(fieldId)}
              onEditOptions={() => onEditOptions(fieldId)}
              onMoveDown={() => onMove(fieldId, "down")}
              onMoveUp={() => onMove(fieldId, "up")}
              onRequiredChange={(required) =>
                onUpdate(fieldId, { required })
              }
              onShowChange={(enabled) => {
                if (field.kind !== "system") {
                  return;
                }

                onUpdate(fieldId, {
                  enabled,
                  required:
                    field.key === "attachment"
                      ? false
                      : enabled
                        ? field.required
                        : false,
                });
              }}
              onTypeChange={(fieldType) =>
                onChangeCustomType(fieldId, fieldType)
              }
            />
          </span>
        </div>
        {isTextareaPlaceholder(field) ? (
          <Textarea
            disabled={
              isPending || (field.kind === "system" && !field.enabled)
            }
            maxLength={160}
            onChange={(event) =>
              onUpdate(fieldId, { placeholder: event.currentTarget.value })
            }
            placeholder={title}
            rows={3}
            value={field.placeholder ?? ""}
          />
        ) : (
          <Input
            disabled={
              isPending || (field.kind === "system" && !field.enabled)
            }
            maxLength={160}
            onChange={(event) =>
              onUpdate(fieldId, { placeholder: event.currentTarget.value })
            }
            placeholder={title}
            value={field.placeholder ?? ""}
          />
        )}
        {hasSelectableOptions ? (
          <button
            className="flex items-center gap-1.5 self-start rounded-md px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onEditOptions(fieldId)}
            type="button"
          >
            <ListChecks className="size-3" />
            {optionCount} {optionCount === 1 ? "option" : "options"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FieldCardMenu({
  deleteDisabled = false,
  hasSelectableOptions = false,
  moveDownDisabled = false,
  moveUpDisabled = false,
  onDelete,
  onEditOptions,
  onMoveDown,
  onMoveUp,
  onRequiredChange,
  onShowChange,
  onTypeChange,
  optionCount = 0,
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
  hasSelectableOptions?: boolean;
  moveDownDisabled?: boolean;
  moveUpDisabled?: boolean;
  onDelete?: () => void;
  onEditOptions?: () => void;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRequiredChange?: (checked: boolean) => void;
  onShowChange?: (checked: boolean) => void;
  onTypeChange?: (fieldType: InquiryCustomFieldType) => void;
  optionCount?: number;
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
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button className="size-7 rounded-full" size="icon" type="button" variant="ghost">
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
        {hasSelectableOptions ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onEditOptions}>
              Edit options
              <span className="ml-auto text-xs text-muted-foreground">
                {optionCount}
              </span>
            </DropdownMenuItem>
          </>
        ) : null}
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

const addFieldTypeOptions: Array<{
  type: InquiryCustomFieldType;
  label: string;
  description: string;
  icon: typeof Type;
}> = [
  { type: "short_text", label: "Short text", description: "Single-line text input", icon: Type },
  { type: "long_text", label: "Long text", description: "Multi-line text area", icon: AlignLeft },
  { type: "select", label: "Select", description: "Dropdown with options", icon: ChevronDown },
  { type: "multi_select", label: "Multi-select", description: "Checkboxes with options", icon: ListChecks },
  { type: "number", label: "Number", description: "Numeric input", icon: Hash },
  { type: "date", label: "Date", description: "Date picker", icon: Calendar },
  { type: "boolean", label: "Yes / No", description: "Binary choice", icon: ToggleLeft },
];

function AddFieldDialog({
  disabled,
  onOpenChange,
  onSelectType,
  open,
}: {
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (fieldType: InquiryCustomFieldType) => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a field</DialogTitle>
          <DialogDescription>
            Choose a field type to add to your inquiry form.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          {addFieldTypeOptions.map(({ type, label, description, icon: Icon }) => (
            <button
              className="soft-panel flex items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/60"
              disabled={disabled}
              key={type}
              onClick={() => onSelectType(type)}
              type="button"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function OptionsEditDialog({
  field,
  isPending,
  maxOptions,
  onAddOption,
  onOpenChange,
  onRemoveOption,
  onUpdateOption,
  open,
}: {
  field: InquiryFormCustomFieldDefinition | null;
  isPending: boolean;
  maxOptions: number;
  onAddOption: (fieldId: string) => void;
  onOpenChange: (open: boolean) => void;
  onRemoveOption: (fieldId: string, optionId: string) => void;
  onUpdateOption: (
    fieldId: string,
    optionId: string,
    patch: Partial<InquiryFieldOption>,
  ) => void;
  open: boolean;
}) {
  if (!field) {
    return null;
  }

  const fieldId = field.id;
  const optionCount = field.options?.length ?? 0;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit options</DialogTitle>
          <DialogDescription>
            Manage the choices for &ldquo;{field.label || "this field"}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3 overflow-y-auto">
          {(field.options ?? []).map((option) => (
            <div className="flex items-center gap-2" key={option.id}>
              <Input
                disabled={isPending}
                maxLength={80}
                onChange={(event) =>
                  onUpdateOption(fieldId, option.id, {
                    label: event.currentTarget.value,
                    value: normalizeOptionValue(event.currentTarget.value),
                  })
                }
                placeholder="Option label"
                value={option.label}
              />
              <Button
                disabled={isPending || optionCount === 1}
                onClick={() => onRemoveOption(fieldId, option.id)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {optionCount}/{maxOptions} options
            </p>
            <Button
              disabled={isPending || optionCount >= maxOptions}
              onClick={() => onAddOption(fieldId)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus data-icon="inline-start" />
              Add option
            </Button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isWideField(field: InquiryFormFieldDefinition) {
  return (
    (field.kind === "system" && field.key === "details") ||
    (field.kind === "custom" &&
      (field.fieldType === "long_text" || field.fieldType === "multi_select"))
  );
}

function isTextareaPlaceholder(field: InquiryFormFieldDefinition) {
  return (
    (field.kind === "system" && field.key === "details") ||
    (field.kind === "custom" && field.fieldType === "long_text")
  );
}

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

function draftMatchesState({
  draft,
  previewDraft,
}: {
  draft: BusinessInquiryFormPreviewDraft;
  previewDraft: BusinessInquiryFormPreviewDraft;
}) {
  return JSON.stringify(draft) === JSON.stringify(previewDraft);
}
