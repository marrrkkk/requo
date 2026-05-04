"use client";

import { useEffect, useMemo, useState } from "react";

import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/shared/brand-mark";
import { CountryCombobox } from "@/components/shared/country-combobox";
import { FormActions } from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  starterTemplateSelectionDescription,
} from "@/features/businesses/starter-templates";
import {
  businessTypeMeta,
  businessTypeOptions,
  type BusinessType,
} from "@/features/inquiries/business-types";
import { cn } from "@/lib/utils";
import {
  createEmptyOnboardingDraft,
  getRecommendedStarterTemplateForBusinessType,
  onboardingSessionStorageKey,
  resolveOnboardingCurrencyChange,
  type OnboardingDraft,
} from "@/features/onboarding/helpers";
import { OnboardingStepper } from "@/features/onboarding/components/onboarding-stepper";
import {
  companySizeOptions,
  jobTitleOptions,
  onboardingBusinessContextSchema,
  onboardingOwnerProfileSchema,
  onboardingTemplateSchema,
  onboardingWorkspaceSchema,
  referralSourceOptions,
} from "@/features/onboarding/schemas";
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

type OnboardingStepId = "profile" | "workspace" | "business" | "template";

const onboardingSteps = [
  {
    id: "profile" as const,
    label: "Profile",
    description: "Your role, company size, and source.",
    title: "A few details first",
    body: "Tell us your role, company size, and how you found Requo.",
    fields: [
      "jobTitle",
      "companySize",
      "referralSource",
    ] as const satisfies readonly OnboardingFieldName[],
  },
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
  const currentStepMeta = onboardingSteps[currentStep];
  const currentStepId = currentStepMeta.id;
  const recommendedTemplate = useMemo(
    () => getRecommendedStarterTemplateForBusinessType(draft.businessType),
    [draft.businessType],
  );
  const selectedBusinessTypeMeta = draft.businessType
    ? businessTypeMeta[draft.businessType]
    : null;
  const selectedCountry = getBusinessCountryOption(draft.countryCode);
  const selectedCurrency = getBusinessCurrencyOption(draft.defaultCurrency);

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
        <input name="jobTitle" type="hidden" value={draft.jobTitle} />
        <input name="companySize" type="hidden" value={draft.companySize} />
        <input
          name="referralSource"
          type="hidden"
          value={draft.referralSource}
        />

        <div className="section-panel flex w-full flex-col gap-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="meta-label">Onboarding</p>
            <div className="min-w-0 max-w-2xl">
              <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
                {currentStepMeta.title}
              </h1>
              <p className="mt-2 text-sm leading-normal sm:leading-7 text-muted-foreground sm:text-[0.96rem]">
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
            <Alert className="mx-auto w-full max-w-3xl">
              <AlertTitle>Setup hit a problem</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="min-w-0">
            {currentStepId === "profile" ? (
              <div className="mx-auto w-full max-w-2xl">
                <Card className="border-border/75 bg-card/97">
                  <CardHeader>
                    <CardTitle>Business profile</CardTitle>
                    <CardDescription>
                      A few details so we can tailor your starting setup.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field
                        data-invalid={Boolean(fieldErrors.jobTitle) || undefined}
                      >
                        <FieldLabel htmlFor="onboarding-job-title">
                          Role
                        </FieldLabel>
                        <FieldContent>
                          <Combobox
                            aria-invalid={
                              Boolean(fieldErrors.jobTitle) || undefined
                            }
                            autoFocus={isDraftHydrated}
                            buttonClassName={onboardingComboboxButtonClassName}
                            disabled={isPending}
                            id="onboarding-job-title"
                            onValueChange={(value) => updateField("jobTitle", value)}
                            options={jobTitleOptions}
                            placeholder="Choose your role"
                            searchPlaceholder="Search roles"
                            searchable
                            value={draft.jobTitle}
                          />
                        </FieldContent>
                      </Field>

                      <Field
                        data-invalid={Boolean(fieldErrors.companySize) || undefined}
                      >
                        <FieldLabel htmlFor="onboarding-company-size">
                          Company size
                        </FieldLabel>
                        <FieldContent>
                          <Combobox
                            aria-invalid={
                              Boolean(fieldErrors.companySize) || undefined
                            }
                            buttonClassName={onboardingComboboxButtonClassName}
                            disabled={isPending}
                            id="onboarding-company-size"
                            onValueChange={(value) =>
                              updateField("companySize", value)
                            }
                            options={companySizeOptions}
                            placeholder="Choose your company size"
                            value={draft.companySize}
                          />
                        </FieldContent>
                      </Field>

                      <Field
                        data-invalid={Boolean(fieldErrors.referralSource) || undefined}
                      >
                        <FieldLabel htmlFor="onboarding-referral-source">
                          Where did you find us?
                        </FieldLabel>
                        <FieldContent>
                          <Combobox
                            aria-invalid={
                              Boolean(fieldErrors.referralSource) || undefined
                            }
                            buttonClassName={onboardingComboboxButtonClassName}
                            disabled={isPending}
                            id="onboarding-referral-source"
                            onValueChange={(value) =>
                              updateField("referralSource", value)
                            }
                            options={referralSourceOptions}
                            placeholder="Choose a source"
                            searchPlaceholder="Search sources"
                            searchable
                            value={draft.referralSource}
                          />
                        </FieldContent>
                      </Field>
                    </FieldGroup>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {currentStepId === "workspace" ? (
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

            {currentStepId === "business" ? (
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

            {currentStepId === "template" ? (
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
          </div>

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
    </>
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
    case "jobTitle": {
      const result = onboardingOwnerProfileSchema.shape.jobTitle.safeParse(
        draft.jobTitle,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "companySize": {
      const result = onboardingOwnerProfileSchema.shape.companySize.safeParse(
        draft.companySize,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "referralSource": {
      const result =
        onboardingOwnerProfileSchema.shape.referralSource.safeParse(
          draft.referralSource,
        );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
  }
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
    jobTitle: typeof value.jobTitle === "string" ? value.jobTitle : "",
    companySize:
      typeof value.companySize === "string" ? value.companySize : "",
    referralSource:
      typeof value.referralSource === "string" ? value.referralSource : "",
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
