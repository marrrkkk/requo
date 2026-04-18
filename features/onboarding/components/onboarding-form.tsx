"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { CountryCombobox } from "@/components/shared/country-combobox";
import { FormActions } from "@/components/shared/form-layout";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StarterTemplateCombobox } from "@/features/businesses/components/starter-template-combobox";
import type { BusinessType } from "@/features/inquiries/business-types";
import {
  ensureOnboardingWorkspaceAction,
  verifyOnboardingPaidPlanAction,
} from "@/features/onboarding/actions";
import {
  jobTitleOptions,
  onboardingBusinessSchema,
  onboardingProfileSchema,
  onboardingReferralSchema,
  onboardingWorkspaceSchema,
  referralSourceOptions,
} from "@/features/onboarding/schemas";
import type { OnboardingActionState } from "@/features/onboarding/types";
import { CheckoutDialog } from "@/features/billing/components/checkout-dialog";
import type { BillingCurrency, BillingRegion, PaidPlan } from "@/lib/billing/types";
import type { WorkspacePlan } from "@/lib/plans/plans";
import { planMeta } from "@/lib/plans/plans";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";

type OnboardingFormProps = {
  action: (
    state: OnboardingActionState,
    formData: FormData,
  ) => Promise<OnboardingActionState>;
  billingRegion: BillingRegion;
  defaultCurrency: BillingCurrency;
  initialValues: {
    fullName: string;
    jobTitle: string;
  };
};

type OnboardingVisibleField =
  | "workspaceName"
  | "workspacePlan"
  | "businessName"
  | "businessType"
  | "countryCode"
  | "fullName"
  | "jobTitle"
  | "referralSource";

type OnboardingStep = {
  fields: OnboardingVisibleField[];
  label: string;
  prompt: string;
};

const onboardingSteps: OnboardingStep[] = [
  {
    fields: ["workspaceName", "workspacePlan"],
    label: "Workspace",
    prompt: "Set up your workspace",
  },
  {
    fields: ["businessName", "businessType", "countryCode"],
    label: "Business",
    prompt: "Create your first business",
  },
  {
    fields: ["fullName", "jobTitle"],
    label: "About you",
    prompt: "Tell us about yourself",
  },
  {
    fields: ["referralSource"],
    label: "One last thing",
    prompt: "How did you find us?",
  },
];

const planOptions = (["free", "pro", "business"] as const).map((plan) => ({
  value: plan,
  label: planMeta[plan].label,
  description: planMeta[plan].description,
  searchText: `${planMeta[plan].label} ${planMeta[plan].description}`,
}));

const initialState: OnboardingActionState = {};
const lastOnboardingStepIndex = onboardingSteps.length - 1;
const onboardingInputClassName =
  "h-12 text-base aria-invalid:border-input/95 aria-invalid:ring-0 aria-invalid:ring-transparent";
const onboardingComboboxButtonClassName =
  "h-12 text-base aria-invalid:border-border/85 aria-invalid:ring-0 aria-invalid:ring-transparent";

export function OnboardingForm({
  action,
  billingRegion,
  defaultCurrency,
  initialValues,
}: OnboardingFormProps) {
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [isCheckoutBusy, startCheckoutTransition] = useTransition();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [onboardingWorkspace, setOnboardingWorkspace] = useState<{
    id: string;
    slug: string;
  } | null>(null);
  const [paidCheckoutVerified, setPaidCheckoutVerified] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [clientFieldErrors, setClientFieldErrors] = useState<
    Partial<Record<OnboardingVisibleField, string>>
  >({});
  const [dismissedServerErrorSources, setDismissedServerErrorSources] = useState<
    Partial<Record<OnboardingVisibleField, OnboardingActionState["fieldErrors"]>>
  >({});
  const [values, setValues] = useState({
    workspaceName: "",
    workspacePlan: "free" as WorkspacePlan,
    businessName: "",
    businessType: "" as BusinessType | "",
    countryCode: "",
    fullName: initialValues.fullName,
    jobTitle: initialValues.jobTitle.trim() || "",
    referralSource: "",
  });

  function updateField<FieldName extends OnboardingVisibleField>(
    field: FieldName,
    value: string,
  ) {
    if (field === "workspacePlan" && value !== values.workspacePlan) {
      setPaidCheckoutVerified(false);
    }

    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setClientFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      delete nextErrors[field];

      return nextErrors;
    });

    setDismissedServerErrorSources((currentDismissedErrors) => ({
      ...currentDismissedErrors,
      [field]: state.fieldErrors,
    }));
  }

  function getFieldError(field: OnboardingVisibleField) {
    const serverError = state.fieldErrors?.[field]?.[0];

    return (
      clientFieldErrors[field] ??
      (dismissedServerErrorSources[field] === state.fieldErrors
        ? undefined
        : serverError)
    );
  }

  function getFieldValidationError(field: OnboardingVisibleField) {
    switch (field) {
      case "workspaceName": {
        const result = onboardingWorkspaceSchema.shape.workspaceName.safeParse(values.workspaceName);
        return result.success ? undefined : result.error.issues[0]?.message;
      }
      case "workspacePlan": {
        const result = onboardingWorkspaceSchema.shape.workspacePlan.safeParse(values.workspacePlan);
        return result.success ? undefined : result.error.issues[0]?.message;
      }
      case "businessName": {
        const result = onboardingBusinessSchema.shape.businessName.safeParse(values.businessName);
        return result.success ? undefined : result.error.issues[0]?.message;
      }
      case "businessType": {
        const result = onboardingBusinessSchema.shape.businessType.safeParse(values.businessType);
        return result.success ? undefined : result.error.issues[0]?.message;
      }
      case "countryCode": {
        const result = onboardingBusinessSchema.shape.countryCode.safeParse(values.countryCode);
        return result.success ? undefined : result.error.issues[0]?.message;
      }
      case "fullName": {
        const result = onboardingProfileSchema.shape.fullName.safeParse(values.fullName);
        return result.success ? undefined : result.error.issues[0]?.message;
      }
      case "jobTitle": {
        const result = onboardingProfileSchema.shape.jobTitle.safeParse(values.jobTitle);
        return result.success ? undefined : result.error.issues[0]?.message;
      }
      case "referralSource": {
        const result = onboardingReferralSchema.shape.referralSource.safeParse(values.referralSource);
        return result.success ? undefined : result.error.issues[0]?.message;
      }
    }
  }

  function validateStepFields(stepIndex: number) {
    const step = onboardingSteps[stepIndex];
    if (!step) return true;

    let allValid = true;

    for (const field of step.fields) {
      const error = getFieldValidationError(field);
      if (error) {
        setClientFieldErrors((current) => ({ ...current, [field]: error }));
        allValid = false;
      }
    }

    return allValid;
  }

  function validateAllSteps() {
    const nextErrors: Partial<Record<OnboardingVisibleField, string>> = {};
    let firstInvalidStepIndex = -1;

    onboardingSteps.forEach((step, index) => {
      for (const field of step.fields) {
        const error = getFieldValidationError(field);
        if (error) {
          nextErrors[field] = error;
          if (firstInvalidStepIndex === -1) {
            firstInvalidStepIndex = index;
          }
        }
      }
    });

    setClientFieldErrors(nextErrors);
    return firstInvalidStepIndex;
  }

  function handleCheckoutOpenChange(open: boolean) {
    setCheckoutOpen(open);
    if (open) return;
    if (values.workspacePlan === "free" || !onboardingWorkspace) return;

    startCheckoutTransition(async () => {
      const result = await verifyOnboardingPaidPlanAction(
        onboardingWorkspace.slug,
        values.workspacePlan as "pro" | "business",
      );
      if (result.ok) {
        setPaidCheckoutVerified(true);
        setCurrentStep(1);
        toast.success("Plan active — let's set up your business.");
      }
    });
  }

  function handleContinue() {
    if (!validateStepFields(currentStep)) return;

    if (currentStep === 0 && values.workspacePlan !== "free") {
      if (paidCheckoutVerified) {
        setCurrentStep(1);
        return;
      }

      startCheckoutTransition(async () => {
        const formData = new FormData();
        formData.set("workspaceName", values.workspaceName);

        const ensured = await ensureOnboardingWorkspaceAction(formData);
        if (!ensured.ok) {
          toast.error(ensured.error);
          return;
        }

        setOnboardingWorkspace({
          id: ensured.workspaceId,
          slug: ensured.workspaceSlug,
        });

        const verified = await verifyOnboardingPaidPlanAction(
          ensured.workspaceSlug,
          values.workspacePlan as "pro" | "business",
        );
        if (verified.ok) {
          setPaidCheckoutVerified(true);
          setCurrentStep(1);
          toast.success("Plan active — let's set up your business.");
          return;
        }

        setCheckoutOpen(true);
      });
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, lastOnboardingStepIndex));
  }

  function handleBack() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  const currentStepMeta = onboardingSteps[currentStep];
  const progressValue = ((currentStep + 1) / onboardingSteps.length) * 100;

  const workspaceNameError = getFieldError("workspaceName");
  const workspacePlanError = getFieldError("workspacePlan");
  const businessNameError = getFieldError("businessName");
  const businessTypeError = getFieldError("businessType");
  const countryCodeError = getFieldError("countryCode");
  const fullNameError = getFieldError("fullName");
  const jobTitleError = getFieldError("jobTitle");
  const referralSourceError = getFieldError("referralSource");

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-xl flex-col gap-8"
      onSubmit={(event) => {
        if (currentStep < lastOnboardingStepIndex) {
          event.preventDefault();
          handleContinue();
          return;
        }

        if (
          values.workspacePlan !== "free" &&
          !paidCheckoutVerified
        ) {
          event.preventDefault();
          setCurrentStep(0);
          toast.error("Complete payment for your selected plan to finish setup.");
          return;
        }

        const firstInvalidStepIndex = validateAllSteps();

        if (firstInvalidStepIndex >= 0) {
          event.preventDefault();
          setCurrentStep(firstInvalidStepIndex);
        }
      }}
    >
      <input name="workspaceName" type="hidden" value={values.workspaceName} />
      <input name="workspacePlan" type="hidden" value={values.workspacePlan} />
      <input name="businessName" type="hidden" value={values.businessName} />
      <input name="businessType" type="hidden" value={values.businessType} />
      <input name="countryCode" type="hidden" value={values.countryCode} />
      <input name="fullName" type="hidden" value={values.fullName} />
      <input name="jobTitle" type="hidden" value={values.jobTitle} />
      <input name="referralSource" type="hidden" value={values.referralSource} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="meta-label">{currentStepMeta.label}</p>
          <p className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {onboardingSteps.length}
          </p>
        </div>
        <Progress value={progressValue} />
      </div>

      <div className="flex min-h-[22rem] flex-col justify-center gap-8">
        <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.4rem]">
          {currentStepMeta.prompt}
        </h1>

        {/* Step 1: Workspace */}
        {currentStep === 0 ? (
          <FieldGroup className="gap-5">
            <Field data-invalid={Boolean(workspaceNameError) || undefined}>
              <FieldLabel htmlFor="onboarding-workspace-name">
                Workspace name
              </FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(workspaceNameError) || undefined}
                  autoFocus
                  className={onboardingInputClassName}
                  id="onboarding-workspace-name"
                  maxLength={80}
                  minLength={2}
                  onChange={(event) =>
                    updateField("workspaceName", event.currentTarget.value)
                  }
                  placeholder="Acme Studio"
                  required
                  value={values.workspaceName}
                />
                <FieldError
                  errors={
                    workspaceNameError ? [{ message: workspaceNameError }] : undefined
                  }
                />
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(workspacePlanError) || undefined}>
              <FieldLabel htmlFor="onboarding-workspace-plan">
                Plan
              </FieldLabel>
              <FieldContent>
                <Combobox
                  aria-invalid={Boolean(workspacePlanError) || undefined}
                  buttonClassName={onboardingComboboxButtonClassName}
                  disabled={isPending}
                  id="onboarding-workspace-plan"
                  onValueChange={(value) => updateField("workspacePlan", value)}
                  options={planOptions}
                  placeholder="Choose a plan"
                  renderOption={(option) => (
                    <div className="flex min-w-0 flex-col gap-0.5 py-0.5">
                      <p className="truncate font-medium">{option.label}</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  )}
                  searchable={false}
                  value={values.workspacePlan}
                />
                <FieldError
                  errors={
                    workspacePlanError ? [{ message: workspacePlanError }] : undefined
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        ) : null}

        {/* Step 2: Business */}
        {currentStep === 1 ? (
          <FieldGroup className="gap-5">
            <Field data-invalid={Boolean(businessNameError) || undefined}>
              <FieldLabel htmlFor="onboarding-business-name">
                Business name
              </FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(businessNameError) || undefined}
                  autoFocus
                  className={onboardingInputClassName}
                  id="onboarding-business-name"
                  maxLength={80}
                  minLength={2}
                  onChange={(event) =>
                    updateField("businessName", event.currentTarget.value)
                  }
                  placeholder="Northline Print Studio"
                  required
                  value={values.businessName}
                />
                <FieldError
                  errors={
                    businessNameError ? [{ message: businessNameError }] : undefined
                  }
                />
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(businessTypeError) || undefined}>
              <FieldLabel htmlFor="onboarding-starter-template">
                Starter template
              </FieldLabel>
              <FieldContent>
                <StarterTemplateCombobox
                  aria-invalid={Boolean(businessTypeError) || undefined}
                  buttonClassName={onboardingComboboxButtonClassName}
                  disabled={isPending}
                  id="onboarding-starter-template"
                  onValueChange={(value) => updateField("businessType", value)}
                  placeholder="Choose a template"
                  value={values.businessType}
                />
                <FieldError
                  errors={
                    businessTypeError ? [{ message: businessTypeError }] : undefined
                  }
                />
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(countryCodeError) || undefined}>
              <FieldLabel htmlFor="onboarding-country-code">
                Country
              </FieldLabel>
              <FieldContent>
                <CountryCombobox
                  aria-invalid={Boolean(countryCodeError) || undefined}
                  buttonClassName={onboardingComboboxButtonClassName}
                  disabled={isPending}
                  id="onboarding-country-code"
                  onValueChange={(value) => updateField("countryCode", value)}
                  placeholder="Choose your country"
                  searchPlaceholder="Search country"
                  showFlags={false}
                  value={values.countryCode}
                />
                <FieldError
                  errors={
                    countryCodeError ? [{ message: countryCodeError }] : undefined
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        ) : null}

        {/* Step 3: About you */}
        {currentStep === 2 ? (
          <FieldGroup className="gap-5">
            <Field data-invalid={Boolean(fullNameError) || undefined}>
              <FieldLabel htmlFor="onboarding-full-name">
                Full name
              </FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(fullNameError) || undefined}
                  autoFocus
                  className={onboardingInputClassName}
                  id="onboarding-full-name"
                  maxLength={120}
                  minLength={2}
                  onChange={(event) =>
                    updateField("fullName", event.currentTarget.value)
                  }
                  placeholder="Alicia Cruz"
                  required
                  value={values.fullName}
                />
                <FieldError
                  errors={fullNameError ? [{ message: fullNameError }] : undefined}
                />
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(jobTitleError) || undefined}>
              <FieldLabel htmlFor="onboarding-job-title">
                Your role
              </FieldLabel>
              <FieldContent>
                <Combobox
                  aria-invalid={Boolean(jobTitleError) || undefined}
                  buttonClassName={onboardingComboboxButtonClassName}
                  disabled={isPending}
                  id="onboarding-job-title"
                  onValueChange={(value) => updateField("jobTitle", value)}
                  options={jobTitleOptions}
                  placeholder="Choose your role"
                  searchable
                  searchPlaceholder="Search roles"
                  value={values.jobTitle}
                />
                <FieldError
                  errors={jobTitleError ? [{ message: jobTitleError }] : undefined}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        ) : null}

        {/* Step 4: How did you find us */}
        {currentStep === 3 ? (
          <FieldGroup className="gap-5">
            <Field data-invalid={Boolean(referralSourceError) || undefined}>
              <FieldLabel htmlFor="onboarding-referral-source">
                Where did you hear about us?
              </FieldLabel>
              <FieldContent>
                <Combobox
                  aria-invalid={Boolean(referralSourceError) || undefined}
                  autoFocus
                  buttonClassName={onboardingComboboxButtonClassName}
                  disabled={isPending}
                  id="onboarding-referral-source"
                  onValueChange={(value) => updateField("referralSource", value)}
                  options={referralSourceOptions}
                  placeholder="Choose an option"
                  searchable
                  searchPlaceholder="Search"
                  value={values.referralSource}
                />
                <FieldError
                  errors={
                    referralSourceError ? [{ message: referralSourceError }] : undefined
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        ) : null}
      </div>

      <FormActions
        align={currentStep === 0 ? "end" : "between"}
        className="gap-3 pt-0"
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
            disabled={
              isPending ||
              (currentStep === 0 &&
                values.workspacePlan !== "free" &&
                !paidCheckoutVerified &&
                isCheckoutBusy)
            }
            onClick={handleContinue}
            size="lg"
            type="button"
          >
            Continue
          </Button>
        ) : (
          <Button disabled={isPending} size="lg" type="submit">
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Creating workspace...
              </>
            ) : (
              "Create workspace"
            )}
          </Button>
        )}
      </FormActions>

      {onboardingWorkspace && values.workspacePlan !== "free" ? (
        <CheckoutDialog
          currentPlan="free"
          defaultCurrency={defaultCurrency}
          onOpenChange={handleCheckoutOpenChange}
          open={checkoutOpen}
          region={billingRegion}
          targetPlan={values.workspacePlan as PaidPlan}
          workspaceId={onboardingWorkspace.id}
          workspaceSlug={onboardingWorkspace.slug}
        />
      ) : null}
    </form>
  );
}
