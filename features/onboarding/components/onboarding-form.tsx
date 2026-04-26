"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

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
import { CheckCircle2, GripVertical, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/shared/brand-mark";
import { CountryCombobox } from "@/components/shared/country-combobox";
import { FormActions } from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StarterTemplateChoiceGrid } from "@/features/businesses/components/starter-template-choice-grid";
import {
  businessCurrencyOptions,
  getBusinessCountryOption,
  getBusinessCurrencyOption,
} from "@/features/businesses/locale";
import {
  getStarterTemplateDefinition,
  starterTemplateSelectionDescription,
} from "@/features/businesses/starter-templates";
import {
  businessTypeMeta,
  businessTypeOptions,
  type BusinessType,
} from "@/features/inquiries/business-types";
import {
  inquiryContactFieldKeys,
  type InquiryContactFieldKey,
  type InquiryFormConfig,
  type InquiryFormFieldDefinition,
} from "@/features/inquiries/form-config";
import { cn } from "@/lib/utils";
import { OnboardingPreviewDialog } from "@/features/onboarding/components/onboarding-preview-dialog";
import {
  createEmptyOnboardingDraft,
  createOnboardingPreviewBusiness,
  getRecommendedStarterTemplateForBusinessType,
  onboardingSessionStorageKey,
  resolveOnboardingCurrencyChange,
  type OnboardingDraft,
} from "@/features/onboarding/helpers";
import {
  onboardingBusinessContextSchema,
  onboardingTemplateSchema,
  onboardingWorkspaceSchema,
} from "@/features/onboarding/schemas";
import { OnboardingStepper } from "@/features/onboarding/components/onboarding-stepper";
import type {
  OnboardingActionState,
  OnboardingFieldName,
} from "@/features/onboarding/types";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";

type OnboardingFormProps = {
  action: (
    state: OnboardingActionState,
    formData: FormData,
  ) => Promise<OnboardingActionState>;
};

type OnboardingStepId = "workspace" | "business" | "template" | "review";

const onboardingSteps = [
  {
    id: "workspace" as const,
    label: "Workspace",
    description: "Name the workspace you'll use for your businesses.",
    title: "Create your workspace",
    body:
      "Keep this simple. You can add more businesses inside the workspace later.",
    fields: ["workspaceName"] as const satisfies readonly OnboardingFieldName[],
  },
  {
    id: "business" as const,
    label: "Business",
    description: "Add the core details for your first business.",
    title: "Add your first business",
    body:
      "This sets the business context and helps Requo suggest the best starting workflow.",
    fields: [
      "businessName",
      "businessType",
      "countryCode",
      "defaultCurrency",
    ] as const satisfies readonly OnboardingFieldName[],
  },
  {
    id: "template" as const,
    label: "Template",
    description: "Choose the fastest path to a usable inquiry form.",
    title: "Start with a template",
    body:
      "Pick the structure that gets you closest to a live inquiry workflow. You can customize it later.",
    fields: [
      "starterTemplateBusinessType",
    ] as const satisfies readonly OnboardingFieldName[],
  },
  {
    id: "review" as const,
    label: "Review",
    description: "Preview the first version. You can customize it after setup.",
    title: "Preview your inquiry page",
    body:
      "Check the generated intake flow, then finish setup and move straight into the dashboard. Edit labels, required fields, and form order later in Forms.",
    fields: [] as const satisfies readonly OnboardingFieldName[],
  },
] satisfies ReadonlyArray<{
  id: OnboardingStepId;
  label: string;
  description: string;
  title: string;
  body: string;
  fields: readonly OnboardingFieldName[];
}>;

const initialState: OnboardingActionState = {};
const lastOnboardingStepIndex = onboardingSteps.length - 1;
const onboardingInputClassName =
  "h-12 text-base aria-invalid:border-input/95 aria-invalid:ring-0 aria-invalid:ring-transparent";
const onboardingComboboxButtonClassName =
  "h-12 text-base aria-invalid:border-border/85 aria-invalid:ring-0 aria-invalid:ring-transparent";

export function OnboardingForm({ action }: OnboardingFormProps) {
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    createEmptyOnboardingDraft(),
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<OnboardingFieldName, string>>
  >({});
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [reviewFormConfig, setReviewFormConfig] = useState<InquiryFormConfig | null>(null);
  const [editingReviewFieldId, setEditingReviewFieldId] = useState<string | null>(null);
  const [editingReviewFieldValue, setEditingReviewFieldValue] = useState("");
  const currentStepMeta = onboardingSteps[currentStep];
  const recommendedTemplate = useMemo(
    () => getRecommendedStarterTemplateForBusinessType(draft.businessType),
    [draft.businessType],
  );
  const selectedTemplate =
    draft.starterTemplateBusinessType || recommendedTemplate;
  const selectedTemplateMeta = getStarterTemplateDefinition(selectedTemplate);
  const selectedBusinessTypeMeta = draft.businessType
    ? businessTypeMeta[draft.businessType]
    : null;
  const selectedCountry = getBusinessCountryOption(draft.countryCode);
  const selectedCurrency = getBusinessCurrencyOption(draft.defaultCurrency);
  const previewBusiness = useMemo(
    () => createOnboardingPreviewBusiness(draft),
    [draft],
  );
  const effectivePreviewBusiness = useMemo(() => {
    if (!reviewFormConfig) return previewBusiness;
    return {
      ...previewBusiness,
      inquiryFormConfig: reviewFormConfig,
    };
  }, [previewBusiness, reviewFormConfig]);
  const hasReviewChanges = reviewFormConfig !== null;
  const previewFieldItems = useMemo(
    () => getPreviewFieldItems(previewBusiness.inquiryFormConfig),
    [previewBusiness.inquiryFormConfig],
  );
  const effectiveReviewConfig = useMemo(
    () =>
      currentStep === 3
        ? (reviewFormConfig ?? previewBusiness.inquiryFormConfig)
        : null,
    [currentStep, reviewFormConfig, previewBusiness.inquiryFormConfig],
  );
  const reviewContactFieldItems = useMemo(() => {
    if (!effectiveReviewConfig) return [];
    return (
      Object.entries(effectiveReviewConfig.contactFields) as Array<
        [
          InquiryContactFieldKey,
          (typeof effectiveReviewConfig.contactFields)[InquiryContactFieldKey],
        ]
      >
    )
      .filter(([, field]) => field.enabled)
      .map(([key, field]) => ({
        id: key,
        label: field.label,
        required: field.required,
        isRequiredLocked: key === "customerName" || key === "preferredContact",
        isWide: false,
        placeholder: field.placeholder || "",
      }));
  }, [effectiveReviewConfig]);
  const reviewProjectFieldItems = useMemo(() => {
    if (!effectiveReviewConfig) return [];
    return effectiveReviewConfig.projectFields
      .filter((field) => field.kind === "custom" || field.enabled)
      .map((field) => {
        const isWide =
          (field.kind === "system" && field.key === "details") ||
          (field.kind === "custom" &&
            (field.fieldType === "long_text" ||
              field.fieldType === "multi_select"));
        return {
          id: field.kind === "system" ? field.key : field.id,
          label: field.label,
          required: field.required,
          isRequiredLocked:
            field.kind === "system" &&
            (field.key === "serviceCategory" ||
              field.key === "details" ||
              field.key === "attachment"),
          isWide,
          placeholder: field.placeholder || "",
        };
      });
  }, [effectiveReviewConfig]);
  const reviewFieldSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const serializedReviewConfig = useMemo(
    () => (effectiveReviewConfig ? JSON.stringify(effectiveReviewConfig) : ""),
    [effectiveReviewConfig],
  );

  useEffect(() => {
    try {
      const storedValue = window.sessionStorage.getItem(
        onboardingSessionStorageKey,
      );

      if (storedValue) {
        const parsedValue = JSON.parse(storedValue) as {
          currentStep?: number;
          draft?: Partial<OnboardingDraft>;
        };

        setDraft((currentDraft) => ({
          ...currentDraft,
          ...sanitizeDraft(parsedValue.draft),
        }));
        setCurrentStep(
          clampStepIndex(parsedValue.currentStep ?? 0, lastOnboardingStepIndex),
        );
      }
    } catch (error) {
      console.error("Failed to restore onboarding draft.", error);
    } finally {
      setIsDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isDraftHydrated) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        onboardingSessionStorageKey,
        JSON.stringify({
          currentStep,
          draft,
        }),
      );
    } catch (error) {
      console.error("Failed to save onboarding draft.", error);
    }
  }, [currentStep, draft, isDraftHydrated]);

  useEffect(() => {
    if (!state.fieldErrors) {
      return;
    }

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      ...mapServerFieldErrors(state.fieldErrors),
    }));
  }, [state.fieldErrors]);

  function updateField<FieldName extends OnboardingFieldName>(
    field: FieldName,
    value: OnboardingDraft[FieldName],
  ) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));

    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function handleBusinessTypeChange(value: string) {
    const nextBusinessType = value as BusinessType;
    const previousRecommendation = getRecommendedStarterTemplateForBusinessType(
      draft.businessType,
    );
    const nextRecommendation =
      getRecommendedStarterTemplateForBusinessType(nextBusinessType);

    setDraft((currentDraft) => ({
      ...currentDraft,
      businessType: nextBusinessType,
      starterTemplateBusinessType:
        !currentDraft.starterTemplateBusinessType ||
        currentDraft.starterTemplateBusinessType === previousRecommendation
          ? nextRecommendation
          : currentDraft.starterTemplateBusinessType,
    }));

    clearFieldErrors("businessType", "starterTemplateBusinessType");
  }

  function handleCountryChange(countryCode: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      countryCode,
      defaultCurrency: resolveOnboardingCurrencyChange({
        currentCurrency: currentDraft.defaultCurrency,
        previousCountryCode: currentDraft.countryCode,
        nextCountryCode: countryCode,
      }),
    }));

    clearFieldErrors("countryCode", "defaultCurrency");
  }

  function clearFieldErrors(...fields: OnboardingFieldName[]) {
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      for (const field of fields) {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  }

  function validateFields(fields: readonly OnboardingFieldName[]) {
    const nextErrors: Partial<Record<OnboardingFieldName, string>> = {};

    for (const field of fields) {
      const error = getFieldValidationError(field, draft);

      if (error) {
        nextErrors[field] = error;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        ...nextErrors,
      }));

      const firstError = Object.values(nextErrors)[0];

      if (firstError) {
        toast.error(firstError);
      }

      return false;
    }

    return true;
  }

  function getFirstInvalidStepIndex() {
    for (const [index, step] of onboardingSteps.entries()) {
      if (step.fields.length === 0) {
        continue;
      }

      if (!validateFields(step.fields)) {
        return index;
      }
    }

    return -1;
  }

  function handleContinue() {
    if (!validateFields(currentStepMeta.fields)) {
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, lastOnboardingStepIndex));
  }

  function handleBack() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function handleStepSelect(nextStep: number) {
    if (nextStep >= currentStep) {
      return;
    }

    setCurrentStep(nextStep);
  }

  // Reset review customizations when template changes
  useEffect(() => {
    setReviewFormConfig(null);
    setEditingReviewFieldId(null);
  }, [selectedTemplate]);

  function handleStartReviewFieldEdit(fieldId: string, currentLabel: string) {
    setEditingReviewFieldId(fieldId);
    setEditingReviewFieldValue(currentLabel);
  }

  function handleCancelReviewFieldEdit() {
    setEditingReviewFieldId(null);
    setEditingReviewFieldValue("");
  }

  function handleSaveReviewFieldEdit(
    fieldId: string,
    group: "contact" | "project",
  ) {
    const trimmed = editingReviewFieldValue.trim();

    if (!trimmed) {
      handleCancelReviewFieldEdit();
      return;
    }

    setReviewFormConfig((prev) => {
      const config = prev ?? previewBusiness.inquiryFormConfig;

      if (group === "contact") {
        const contactKey = fieldId as InquiryContactFieldKey;

        return {
          ...config,
          contactFields: {
            ...config.contactFields,
            [contactKey]: {
              ...config.contactFields[contactKey],
              label: trimmed,
            },
          },
        };
      }

      return {
        ...config,
        projectFields: config.projectFields.map((f) => {
          const id = f.kind === "system" ? f.key : f.id;
          return id === fieldId ? { ...f, label: trimmed } : f;
        }),
      };
    });

    setEditingReviewFieldId(null);
    setEditingReviewFieldValue("");
  }

  function handleToggleReviewFieldRequired(
    fieldId: string,
    group: "contact" | "project",
  ) {
    setReviewFormConfig((prev) => {
      const config = prev ?? previewBusiness.inquiryFormConfig;

      if (group === "contact") {
        const contactKey = fieldId as InquiryContactFieldKey;
        const current = config.contactFields[contactKey];

        return {
          ...config,
          contactFields: {
            ...config.contactFields,
            [contactKey]: { ...current, required: !current.required },
          },
        };
      }

      return {
        ...config,
        projectFields: config.projectFields.map((f) => {
          const id = f.kind === "system" ? f.key : f.id;
          return id === fieldId
            ? ({ ...f, required: !f.required } as typeof f)
            : f;
        }),
      };
    });
  }

  function handleReviewProjectFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setReviewFormConfig((prev) => {
      const config = prev ?? previewBusiness.inquiryFormConfig;
      const activeIndex = config.projectFields.findIndex(
        (f) => (f.kind === "system" ? f.key : f.id) === String(active.id),
      );
      const overIndex = config.projectFields.findIndex(
        (f) => (f.kind === "system" ? f.key : f.id) === String(over.id),
      );

      if (activeIndex < 0 || overIndex < 0) {
        return config;
      }

      return {
        ...config,
        projectFields: arrayMove(
          config.projectFields,
          activeIndex,
          overIndex,
        ),
      };
    });
  }

  return (
    <>
      <form
        action={formAction}
        className="mx-auto w-full max-w-6xl"
        onSubmit={(event) => {
          if (currentStep < lastOnboardingStepIndex) {
            event.preventDefault();
            handleContinue();
            return;
          }

          const firstInvalidStepIndex = getFirstInvalidStepIndex();

          if (firstInvalidStepIndex >= 0) {
            event.preventDefault();
            setCurrentStep(firstInvalidStepIndex);
          }
        }}
      >
        <input name="workspaceName" type="hidden" value={draft.workspaceName} />
        <input name="businessName" type="hidden" value={draft.businessName} />
        <input name="businessType" type="hidden" value={draft.businessType} />
        <input name="countryCode" type="hidden" value={draft.countryCode} />
        <input
          name="defaultCurrency"
          type="hidden"
          value={draft.defaultCurrency}
        />
        <input
          name="starterTemplateBusinessType"
          type="hidden"
          value={draft.starterTemplateBusinessType}
        />
        <input
          name="inquiryFormConfigOverride"
          type="hidden"
          value={serializedReviewConfig}
        />

        <div className="section-panel flex flex-col gap-8 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3">
            <p className="meta-label">Onboarding</p>
            <div className="min-w-0">
              <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
                {currentStepMeta.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[0.96rem]">
                {currentStepMeta.body}
              </p>
            </div>
          </div>

          <OnboardingStepper
            currentStep={currentStep}
            items={onboardingSteps}
            onStepSelect={handleStepSelect}
          />

          {state.error ? (
            <Alert>
              <AlertTitle>Setup hit a problem</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="min-w-0">
            {currentStep === 0 ? (
              <Card className="border-border/75 bg-card/97">
                <CardHeader>
                  <CardTitle>Workspace details</CardTitle>
                  <CardDescription>
                    Use a simple name you&apos;ll recognize in the workspace hub.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field
                      data-invalid={Boolean(fieldErrors.workspaceName) || undefined}
                    >
                      <FieldLabel htmlFor="onboarding-workspace-name">
                        Workspace name
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          aria-invalid={
                            Boolean(fieldErrors.workspaceName) || undefined
                          }
                          autoFocus={isDraftHydrated}
                          className={onboardingInputClassName}
                          disabled={isPending}
                          id="onboarding-workspace-name"
                          maxLength={80}
                          minLength={2}
                          onChange={(event) =>
                            updateField(
                              "workspaceName",
                              event.currentTarget.value,
                            )
                          }
                          placeholder="Acme Studio"
                          required
                          value={draft.workspaceName}
                        />
                        <FieldDescription>
                          This is the top-level workspace for your first business.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            ) : null}

            {currentStep === 1 ? (
              <Card className="border-border/75 bg-card/97">
                <CardHeader>
                  <CardTitle>Business context</CardTitle>
                  <CardDescription>
                    Set the basics customers will see, then we&apos;ll suggest a
                    template that fits.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field
                      data-invalid={Boolean(fieldErrors.businessName) || undefined}
                    >
                      <FieldLabel htmlFor="onboarding-business-name">
                        Business name
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          aria-invalid={
                            Boolean(fieldErrors.businessName) || undefined
                          }
                          autoFocus={isDraftHydrated}
                          className={onboardingInputClassName}
                          disabled={isPending}
                          id="onboarding-business-name"
                          maxLength={80}
                          minLength={2}
                          onChange={(event) =>
                            updateField(
                              "businessName",
                              event.currentTarget.value,
                            )
                          }
                          placeholder="Northline Print Studio"
                          required
                          value={draft.businessName}
                        />
                      </FieldContent>
                    </Field>

                    <Field
                      data-invalid={Boolean(fieldErrors.businessType) || undefined}
                    >
                      <FieldLabel htmlFor="onboarding-business-type">
                        Business category
                      </FieldLabel>
                      <FieldContent>
                        <Combobox
                          aria-invalid={
                            Boolean(fieldErrors.businessType) || undefined
                          }
                          autoFocus={false}
                          buttonClassName={onboardingComboboxButtonClassName}
                          disabled={isPending}
                          id="onboarding-business-type"
                          onValueChange={handleBusinessTypeChange}
                          options={businessTypeOptions}
                          placeholder="Choose a category"
                          renderOption={(option) => (
                            <div className="flex min-w-0 flex-col gap-0.5 py-0.5">
                              <p className="truncate font-medium">
                                {option.label}
                              </p>
                              <p className="text-xs leading-5 text-muted-foreground">
                                {option.description}
                              </p>
                            </div>
                          )}
                          searchPlaceholder="Search categories"
                          searchable
                          value={draft.businessType}
                        />
                        <FieldDescription>
                          We&apos;ll use this to recommend the best starting template
                          next.
                        </FieldDescription>
                      </FieldContent>
                    </Field>

                    <div className="grid gap-6 md:grid-cols-2">
                      <Field
                        data-invalid={Boolean(fieldErrors.countryCode) || undefined}
                      >
                        <FieldLabel htmlFor="onboarding-country-code">
                          Country
                        </FieldLabel>
                        <FieldContent>
                          <CountryCombobox
                            aria-invalid={
                              Boolean(fieldErrors.countryCode) || undefined
                            }
                            buttonClassName={onboardingComboboxButtonClassName}
                            disabled={isPending}
                            id="onboarding-country-code"
                            onValueChange={handleCountryChange}
                            placeholder="Choose your country"
                            searchPlaceholder="Search country"
                            showFlags={false}
                            value={draft.countryCode}
                          />
                          <FieldDescription>
                            {selectedCountry
                              ? `Quotes and public inquiry details will start from ${selectedCountry.label}.`
                              : "Use the country your business mainly operates from."}
                          </FieldDescription>
                        </FieldContent>
                      </Field>

                      <Field
                        data-invalid={
                          Boolean(fieldErrors.defaultCurrency) || undefined
                        }
                      >
                        <FieldLabel htmlFor="onboarding-default-currency">
                          Currency
                        </FieldLabel>
                        <FieldContent>
                          <Combobox
                            aria-invalid={
                              Boolean(fieldErrors.defaultCurrency) || undefined
                            }
                            buttonClassName={onboardingComboboxButtonClassName}
                            disabled={isPending}
                            id="onboarding-default-currency"
                            onValueChange={(value) =>
                              updateField("defaultCurrency", value)
                            }
                            options={businessCurrencyOptions.map((option) => ({
                              value: option.code,
                              label: option.label,
                              searchText: `${option.code} ${option.name}`,
                            }))}
                            placeholder="Choose a currency"
                            searchPlaceholder="Search currency"
                            searchable
                            value={draft.defaultCurrency}
                          />
                          <FieldDescription>
                            {selectedCurrency
                              ? `New quotes will start in ${selectedCurrency.code}.`
                              : "You can change this later in business settings."}
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
            ) : null}

            {currentStep === 2 ? (
              <div className="flex flex-col gap-5">
                <Alert>
                  <Sparkles data-icon="inline-start" />
                  <AlertTitle>
                    {selectedBusinessTypeMeta
                      ? `Recommended for ${selectedBusinessTypeMeta.label}`
                      : "Pick the best starting point"}
                  </AlertTitle>
                  <AlertDescription>
                    {starterTemplateSelectionDescription}
                  </AlertDescription>
                </Alert>

                <Card className="border-border/75 bg-card/97">
                  <CardHeader>
                    <CardTitle>Starter templates</CardTitle>
                    <CardDescription>
                      Choose the structure that gets your inquiry form close to
                      usable from day one.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StarterTemplateChoiceGrid
                      ariaLabel="Starter template"
                      disabled={isPending}
                      inputName="onboarding-starter-template"
                      onChange={(value) =>
                        updateField(
                          "starterTemplateBusinessType",
                          value as OnboardingDraft["starterTemplateBusinessType"],
                        )
                      }
                      recommendedValue={recommendedTemplate}
                      showHelperText
                      value={draft.starterTemplateBusinessType}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="flex flex-col gap-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <SummaryCard
                    description="Top-level workspace"
                    title="Workspace"
                    value={draft.workspaceName || "Untitled workspace"}
                  />
                  <SummaryCard
                    description={
                      selectedBusinessTypeMeta?.label ?? "Business category"
                    }
                    title="Business"
                    value={draft.businessName || "Untitled business"}
                  />
                  <SummaryCard
                    description="Starter template"
                    title="Template"
                    value={selectedTemplateMeta.label}
                  />
                </div>

                <Card className="border-border/75 bg-card/97">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle>What customers will see</CardTitle>
                      <CardDescription>
                        This starter version is ready to use. Fine-tune fields
                        after setup from Forms.
                      </CardDescription>
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => setIsPreviewOpen(true)}
                      type="button"
                      variant="outline"
                    >
                      Open full preview
                    </Button>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4">
                      <p className="meta-label">Inquiry page</p>
                      <p className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground">
                        {previewBusiness.inquiryPageConfig.headline}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {previewBusiness.inquiryPageConfig.description}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          Contact fields
                        </p>
                        <Badge variant="secondary">
                          {reviewContactFieldItems.length} fields
                        </Badge>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {reviewContactFieldItems.map((field) => (
                          <ReviewFieldCard
                            editingFieldId={editingReviewFieldId}
                            editingFieldValue={editingReviewFieldValue}
                            field={field}
                            key={field.id}
                            onCancelEdit={handleCancelReviewFieldEdit}
                            onEditChange={setEditingReviewFieldValue}
                            onSaveEdit={(id) =>
                              handleSaveReviewFieldEdit(id, "contact")
                            }
                            onStartEdit={handleStartReviewFieldEdit}
                            onToggleRequired={(id) =>
                              handleToggleReviewFieldRequired(id, "contact")
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          Inquiry fields
                        </p>
                        <Badge variant="secondary">
                          {reviewProjectFieldItems.length} fields
                        </Badge>
                      </div>
                      <DndContext
                        collisionDetection={closestCenter}
                        id="onboarding-review-project-fields-dnd"
                        onDragEnd={handleReviewProjectFieldDragEnd}
                        sensors={reviewFieldSensors}
                      >
                        <SortableContext
                          items={reviewProjectFieldItems.map((f) => f.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="grid gap-4 sm:grid-cols-2">
                            {reviewProjectFieldItems.map((field) => (
                              <SortableReviewFieldCard
                                editingFieldId={editingReviewFieldId}
                                editingFieldValue={editingReviewFieldValue}
                                field={field}
                                key={field.id}
                                onCancelEdit={handleCancelReviewFieldEdit}
                                onEditChange={setEditingReviewFieldValue}
                                onSaveEdit={(id) =>
                                  handleSaveReviewFieldEdit(id, "project")
                                }
                                onStartEdit={handleStartReviewFieldEdit}
                                onToggleRequired={(id) =>
                                  handleToggleReviewFieldRequired(id, "project")
                                }
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>

          {currentStep === 3 && hasReviewChanges ? (
            <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
              <div
                className="soft-panel flex w-full max-w-2xl items-center justify-between gap-3 border-border/80 bg-background/95 px-4 py-3 shadow-xl backdrop-blur motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:zoom-in-95 motion-safe:duration-200"
              >
                <p className="text-sm text-muted-foreground">
                  You&apos;ve customized the inquiry form.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setReviewFormConfig(null);
                      setEditingReviewFieldId(null);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={() => setIsPreviewOpen(true)}
                    size="sm"
                    type="button"
                  >
                    Open preview
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <FormActions
            align={currentStep === 0 ? "end" : "between"}
            className="pt-0"
          >
            {currentStep > 0 ? (
              <Button
                disabled={isPending}
                onClick={handleBack}
                size="lg"
                type="button"
                variant="outline"
              >
                Back
              </Button>
            ) : null}

            {currentStep < lastOnboardingStepIndex ? (
              <Button
                key="continue"
                disabled={isPending}
                onClick={handleContinue}
                size="lg"
                type="button"
              >
                Continue
              </Button>
            ) : (
              <Button key="finish" disabled={isPending} size="lg" type="submit">
                {isPending ? (
                  <>
                    <Spinner data-icon="inline-start" aria-hidden="true" />
                    Finishing setup...
                  </>
                ) : (
                  "Finish setup"
                )}
              </Button>
            )}
          </FormActions>
        </div>
      </form>

      {isPending && currentStep === lastOnboardingStepIndex ? (
        <SetupLoadingOverlay />
      ) : null}

      <OnboardingPreviewDialog
        business={effectivePreviewBusiness}
        onOpenChange={setIsPreviewOpen}
        open={isPreviewOpen}
      />
    </>
  );
}

function SummaryCard({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string;
}) {
  return (
    <Card className="border-border/75 bg-card/97">
      <CardHeader className="gap-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-base">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function getFieldValidationError(
  field: OnboardingFieldName,
  draft: OnboardingDraft,
) {
  switch (field) {
    case "workspaceName": {
      const result = onboardingWorkspaceSchema.shape.workspaceName.safeParse(
        draft.workspaceName,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "businessName": {
      const result = onboardingBusinessContextSchema.shape.businessName.safeParse(
        draft.businessName,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "businessType": {
      const result = onboardingBusinessContextSchema.shape.businessType.safeParse(
        draft.businessType,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "countryCode": {
      const result = onboardingBusinessContextSchema.shape.countryCode.safeParse(
        draft.countryCode,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "defaultCurrency": {
      const result =
        onboardingBusinessContextSchema.shape.defaultCurrency.safeParse(
          draft.defaultCurrency,
        );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "starterTemplateBusinessType": {
      const result =
        onboardingTemplateSchema.shape.starterTemplateBusinessType.safeParse(
          draft.starterTemplateBusinessType,
        );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
  }
}

function getPreviewFieldItems(inquiryFormConfig: InquiryFormConfig) {
  const contactFields = (
    Object.entries(inquiryFormConfig.contactFields) as Array<
      [
        InquiryContactFieldKey,
        (typeof inquiryFormConfig.contactFields)[InquiryContactFieldKey],
      ]
    >
  )
    .filter(([, field]) => field.enabled)
    .map(([key, field]) => ({
      id: key,
      label: field.label,
      required: field.required,
    }));

  const projectFields = inquiryFormConfig.projectFields
    .filter((field) => isPreviewFieldVisible(field))
    .map((field) => ({
      id: field.kind === "system" ? field.key : field.id,
      label: field.label,
      required: field.required,
    }));

  return [...contactFields, ...projectFields];
}

function isPreviewFieldVisible(field: InquiryFormFieldDefinition) {
  return field.kind === "custom" || field.enabled;
}

function sanitizeDraft(
  value: Partial<OnboardingDraft> | undefined,
): Partial<OnboardingDraft> {
  if (!value) {
    return {};
  }

  return {
    workspaceName:
      typeof value.workspaceName === "string" ? value.workspaceName : "",
    businessName:
      typeof value.businessName === "string" ? value.businessName : "",
    businessType:
      typeof value.businessType === "string"
        ? (value.businessType as OnboardingDraft["businessType"])
        : "",
    starterTemplateBusinessType:
      typeof value.starterTemplateBusinessType === "string"
        ? (value.starterTemplateBusinessType as OnboardingDraft["starterTemplateBusinessType"])
        : "",
    countryCode: typeof value.countryCode === "string" ? value.countryCode : "",
    defaultCurrency:
      typeof value.defaultCurrency === "string" ? value.defaultCurrency : "",
  };
}

function mapServerFieldErrors(
  fieldErrors: OnboardingActionState["fieldErrors"],
): Partial<Record<OnboardingFieldName, string>> {
  return Object.fromEntries(
    Object.entries(fieldErrors ?? {}).flatMap(([field, errors]) => {
      const message = errors?.[0];

      return message ? [[field, message]] : [];
    }),
  ) as Partial<Record<OnboardingFieldName, string>>;
}

function clampStepIndex(value: number, maxStepIndex: number) {
  return Math.min(Math.max(value, 0), maxStepIndex);
}

type ReviewFieldItemData = {
  id: string;
  label: string;
  required: boolean;
  isRequiredLocked: boolean;
  isWide: boolean;
  placeholder: string;
};

type ReviewFieldCardProps = {
  field: ReviewFieldItemData;
  editingFieldId: string | null;
  editingFieldValue: string;
  onStartEdit: (id: string, label: string) => void;
  onEditChange: (value: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onToggleRequired: (id: string) => void;
};

function ReviewFieldCard({
  field,
}: ReviewFieldCardProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", field.isWide && "sm:col-span-2")}>
      <ReviewFieldLabel field={field} />
      <div className="pointer-events-none rounded-lg border border-input/60 bg-muted/30 px-3 py-2">
        <span className="text-sm text-muted-foreground/50">
          {field.placeholder || field.label}
        </span>
      </div>
    </div>
  );
}

function SortableReviewFieldCard({
  field,
}: ReviewFieldCardProps) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: isDragging ? "transform" : undefined,
  };

  return (
    <div
      className={cn(
        "flex gap-2",
        field.isWide && "sm:col-span-2",
        isDragging && "relative z-10",
      )}
      ref={setNodeRef}
      style={style}
    >
      <span
        aria-hidden="true"
        className="mt-1 shrink-0 self-start text-muted-foreground/35"
      >
        <GripVertical className="size-4" />
      </span>
      <div className={cn(
        "flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg p-2 transition-shadow",
        isDragging && "bg-background shadow-lg ring-2 ring-primary/20",
      )}>
        <ReviewFieldLabel field={field} />
        <div className="pointer-events-none rounded-lg border border-input/60 bg-muted/30 px-3 py-2">
          <span className="text-sm text-muted-foreground/50">
            {field.placeholder || field.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReviewFieldLabel({
  field,
}: Pick<ReviewFieldCardProps, "field">) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-sm font-medium text-foreground">
        {field.label}
      </span>
      <span className="ml-auto shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          {field.required ? "Required" : "Optional"}
        </span>
      </span>
    </div>
  );
}

const setupLoadingSteps = [
  "Creating your workspace…",
  "Setting up your business…",
  "Building your inquiry form…",
];

function SetupLoadingOverlay() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep >= setupLoadingSteps.length - 1) {
      return;
    }

    const timeout = window.setTimeout(
      () => setActiveStep((step) => Math.min(step + 1, setupLoadingSteps.length - 1)),
      1200,
    );

    return () => window.clearTimeout(timeout);
  }, [activeStep]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-10 px-6">
        <BrandMark subtitle={null} />
        <div className="flex flex-col gap-4">
          {setupLoadingSteps.map((step, index) => (
            <div
              className={cn(
                "flex items-center gap-3 transition-all duration-500",
                index > activeStep && "translate-y-2 opacity-0",
                index <= activeStep && "translate-y-0 opacity-100",
              )}
              key={step}
            >
              {index < activeStep ? (
                <CheckCircle2 className="size-5 shrink-0 text-primary" />
              ) : index === activeStep ? (
                <Spinner className="size-5 shrink-0" />
              ) : (
                <div className="size-5 shrink-0" />
              )}
              <p
                className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  index <= activeStep
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
