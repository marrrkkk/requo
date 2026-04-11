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
  ChevronDown,
  Eye,
  GripVertical,
  MoreHorizontal,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";

import { FloatingFormActions } from "@/components/shared/floating-form-actions";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                      {groupLabels.project}
                    </h2>
                    <Button
                      aria-label={`Edit ${groupLabels.project}`}
                      className="shrink-0"
                      onClick={startEditingProjectGroupLabel}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <PencilLine />
                    </Button>
                  </div>
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
                  <div className="flex flex-col gap-3">
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
                          maxOptions={MAX_CUSTOM_FIELD_OPTIONS}
                          prefersReducedMotion={prefersReducedMotion}
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

function InquiryFieldCardShell({
  cardRef,
  className,
  children,
  description,
  index,
  isEntering = false,
  isExiting = false,
  menu,
  meta,
  style,
  title,
}: {
  cardRef?: (node: HTMLDivElement | null) => void;
  className?: string;
  children: ReactNode;
  description: string;
  index: number;
  isEntering?: boolean;
  isExiting?: boolean;
  menu: ReactNode;
  meta: string;
  style?: CSSProperties;
  title: string;
}) {
  return (
    <div
      ref={cardRef}
      className={cn(
        "soft-panel rounded-[1.2rem] border border-border/75 bg-background/95 px-3.5 py-3.5 shadow-none motion-reduce:animate-none sm:rounded-[1.35rem] sm:px-5 sm:py-4",
        isEntering &&
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200",
        isExiting &&
          "pointer-events-none motion-safe:animate-out motion-safe:fade-out-0 motion-safe:slide-out-to-bottom-2 motion-safe:duration-150",
        className,
      )}
      style={style}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex flex-1 items-start gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[0.7rem] font-semibold text-muted-foreground sm:size-8 sm:text-xs">
              {index + 1}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-[0.97rem] font-semibold text-foreground sm:text-base">
                {title}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">{description}</p>
              <p className="text-xs font-medium text-muted-foreground sm:hidden">{meta}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden truncate text-xs font-medium text-muted-foreground sm:inline">
              {meta}
            </span>
            {menu}
          </div>
        </div>

        {children}
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
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
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
  cardRef,
  field,
  index,
  inputRef,
  isEntering,
  isExiting,
  isPending,
  maxOptions,
  prefersReducedMotion,
  onAddOption,
  onChangeCustomType,
  onMove,
  onRemove,
  onRemoveOption,
  onUpdate,
  onUpdateOption,
  totalFields,
}: {
  cardRef?: (node: HTMLDivElement | null) => void;
  field: InquiryFormFieldDefinition;
  index: number;
  inputRef: (node: HTMLInputElement | null) => void;
  isEntering: boolean;
  isExiting: boolean;
  isPending: boolean;
  maxOptions: number;
  prefersReducedMotion: boolean;
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
    transition: prefersReducedMotion ? null : inquirySortableTransition,
  });
  const isSystem = field.kind === "system";
  const hasSelectableOptions =
    field.kind === "custom" &&
    (field.fieldType === "select" || field.fieldType === "multi_select");
  const isLockedRequired =
    isSystem && (field.key === "serviceCategory" || field.key === "details");
  const canToggleEnabled = isSystem && !isLockedRequired;
  const canToggleRequired =
    field.kind === "custom" ? true : field.key !== "attachment" && !isLockedRequired;
  const optionCount = field.kind === "custom" ? (field.options?.length ?? 0) : 0;
  const [optionsOpenOverride, setOptionsOpenOverride] = useState<boolean | null>(null);
  const isOptionsOpen = hasSelectableOptions && (optionsOpenOverride ?? true);
  const title = field.label || (isSystem ? getSystemFieldTitle(field) : "New field");
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

  return (
    <InquiryFieldCardShell
      cardRef={handleCardRef}
      className={cn(
        isDragging && "relative z-10 ring-2 ring-primary/20 shadow-lg",
      )}
      description={getProjectFieldStateLabel(field)}
      index={index}
      isEntering={isEntering}
      isExiting={isExiting}
      menu={
        <div className="flex items-center gap-1">
          <Button
            aria-label={`Reorder ${title}`}
            className="size-8 cursor-grab rounded-full touch-none active:cursor-grabbing"
            disabled={isPending || isExiting}
            ref={setActivatorNodeRef}
            size="icon"
            type="button"
            variant="ghost"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </Button>
          <FieldCardMenu
            deleteDisabled={isSystem || isPending}
            moveDownDisabled={isPending || index === totalFields - 1}
            moveUpDisabled={isPending || index === 0}
            requiredChecked={field.required}
            requiredDisabled={!canToggleRequired || (isSystem && !field.enabled) || isPending}
            showChecked={field.kind === "system" ? field.enabled : true}
            showDisabled={field.kind === "custom" || !canToggleEnabled || isPending}
            title={title}
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
        </div>
      }
      meta={getFieldTypeLabel(field)}
      style={sortableStyle}
      title={title}
    >
      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
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

      {hasSelectableOptions ? (
        <div className="space-y-3 border-t border-border/70 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              aria-controls={`${fieldId}-options-panel`}
              aria-expanded={isOptionsOpen}
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
              onClick={() => setOptionsOpenOverride((current) => !(current ?? true))}
              type="button"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Options</p>
                <p className="text-xs text-muted-foreground">
                  {optionCount}/{maxOptions} options
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "ml-auto size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
                  isOptionsOpen && "rotate-180",
                )}
              />
            </button>
            <Button
              className="w-full sm:w-auto"
              disabled={isPending || optionCount >= maxOptions}
              onClick={() => {
                setOptionsOpenOverride(true);
                onAddOption(fieldId);
              }}
              type="button"
              variant="outline"
            >
              <Plus data-icon="inline-start" />
              Add option
            </Button>
          </div>

          <div
            className={cn(
              "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-(--motion-ease-standard) motion-reduce:transition-none",
              isOptionsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
            id={`${fieldId}-options-panel`}
          >
            <div className="min-h-0 space-y-2 overflow-hidden">
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
                    className="w-full sm:w-9"
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
    <DropdownMenu modal={false}>
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
          {isSystem ? "System field" : "Custom field"} Ã¢â‚¬â€ edits affect the public form.
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

function draftMatchesState({
  draft,
  previewDraft,
}: {
  draft: BusinessInquiryFormPreviewDraft;
  previewDraft: BusinessInquiryFormPreviewDraft;
}) {
  return JSON.stringify(draft) === JSON.stringify(previewDraft);
}
