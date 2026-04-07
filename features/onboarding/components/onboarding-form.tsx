"use client";

import { useActionState, useState } from "react";

import { FormActions } from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  businessTypeMeta,
  businessTypes,
  type BusinessType,
} from "@/features/inquiries/business-types";
import {
  onboardingProfileSchema,
  onboardingWorkspaceSchema,
} from "@/features/onboarding/schemas";
import type { OnboardingActionState } from "@/features/onboarding/types";

type OnboardingFormProps = {
  action: (
    state: OnboardingActionState,
    formData: FormData,
  ) => Promise<OnboardingActionState>;
  initialValues: {
    fullName: string;
    jobTitle: string;
  };
};

type OnboardingVisibleField =
  | "businessName"
  | "businessType"
  | "fullName"
  | "jobTitle";

const onboardingSteps = [
  {
    field: "businessName",
    label: "Business name",
    prompt: "What is your business called?",
  },
  {
    field: "businessType",
    label: "Industry",
    prompt: "What kind of business do you run?",
  },
  {
    field: "fullName",
    label: "Your name",
    prompt: "What should we call you?",
  },
  {
    field: "jobTitle",
    label: "Role",
    prompt: "What is your role?",
  },
] as const;

const initialState: OnboardingActionState = {};
const lastOnboardingStepIndex = onboardingSteps.length - 1;

export function OnboardingForm({
  action,
  initialValues,
}: OnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [currentStep, setCurrentStep] = useState(0);
  const [clientFieldErrors, setClientFieldErrors] = useState<
    Partial<Record<OnboardingVisibleField, string>>
  >({});
  const [values, setValues] = useState({
    businessName: "",
    businessType: "" as BusinessType | "",
    fullName: initialValues.fullName,
    jobTitle: initialValues.jobTitle,
  });

  function updateField<FieldName extends OnboardingVisibleField>(
    field: FieldName,
    value: string,
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setClientFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      delete nextErrors[field];

      return nextErrors;
    });
  }

  function getFieldError(field: OnboardingVisibleField) {
    return clientFieldErrors[field] ?? state.fieldErrors?.[field]?.[0];
  }

  function getFieldValidationError(field: OnboardingVisibleField) {
    switch (field) {
      case "businessName": {
        const validationResult = onboardingWorkspaceSchema.shape.businessName.safeParse(
          values.businessName,
        );

        return validationResult.success
          ? undefined
          : validationResult.error.issues[0]?.message;
      }
      case "businessType": {
        const validationResult = onboardingWorkspaceSchema.shape.businessType.safeParse(
          values.businessType,
        );

        return validationResult.success
          ? undefined
          : validationResult.error.issues[0]?.message;
      }
      case "fullName": {
        const validationResult = onboardingProfileSchema.shape.fullName.safeParse(
          values.fullName,
        );

        return validationResult.success
          ? undefined
          : validationResult.error.issues[0]?.message;
      }
      case "jobTitle": {
        const validationResult = onboardingProfileSchema.shape.jobTitle.safeParse(
          values.jobTitle,
        );

        return validationResult.success
          ? undefined
          : validationResult.error.issues[0]?.message;
      }
    }
  }

  function validateSingleField(field: OnboardingVisibleField) {
    const error = getFieldValidationError(field);

    setClientFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (error) {
        nextErrors[field] = error;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });

    return !error;
  }

  function validateAllSteps() {
    const nextErrors: Partial<Record<OnboardingVisibleField, string>> = {};
    let firstInvalidStepIndex = -1;

    onboardingSteps.forEach((step, index) => {
      const error = getFieldValidationError(step.field);

      if (!error) {
        return;
      }

      nextErrors[step.field] = error;

      if (firstInvalidStepIndex === -1) {
        firstInvalidStepIndex = index;
      }
    });

    setClientFieldErrors(nextErrors);

    return firstInvalidStepIndex;
  }

  function handleContinue() {
    const activeField = onboardingSteps[currentStep]?.field;

    if (!activeField || !validateSingleField(activeField)) {
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, lastOnboardingStepIndex));
  }

  function handleBack() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  const currentStepMeta = onboardingSteps[currentStep];
  const progressValue = ((currentStep + 1) / onboardingSteps.length) * 100;
  const businessNameError = getFieldError("businessName");
  const businessTypeError = getFieldError("businessType");
  const fullNameError = getFieldError("fullName");
  const jobTitleError = getFieldError("jobTitle");

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

        const firstInvalidStepIndex = validateAllSteps();

        if (firstInvalidStepIndex >= 0) {
          event.preventDefault();
          setCurrentStep(firstInvalidStepIndex);
        }
      }}
    >
      <input name="businessName" type="hidden" value={values.businessName} />
      <input name="businessType" type="hidden" value={values.businessType} />
      <input name="shortDescription" type="hidden" value="" />
      <input name="fullName" type="hidden" value={values.fullName} />
      <input name="jobTitle" type="hidden" value={values.jobTitle} />
      <input name="phone" type="hidden" value="" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="meta-label">{currentStepMeta.label}</p>
          <p className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {onboardingSteps.length}
          </p>
        </div>
        <Progress value={progressValue} />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not finish setup.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex min-h-[19rem] flex-col justify-center gap-8">
        <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.4rem]">
          {currentStepMeta.prompt}
        </h1>

        <FieldGroup className="gap-4">
          {currentStepMeta.field === "businessName" ? (
            <Field data-invalid={Boolean(businessNameError) || undefined}>
              <FieldLabel className="sr-only" htmlFor="onboarding-business-name">
                Business name
              </FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(businessNameError) || undefined}
                  autoFocus
                  className="h-12 text-base"
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
          ) : null}

          {currentStepMeta.field === "businessType" ? (
            <Field data-invalid={Boolean(businessTypeError) || undefined}>
              <FieldLabel className="sr-only" htmlFor="onboarding-business-type">
                Industry
              </FieldLabel>
              <FieldContent>
                <Select
                  onValueChange={(value) =>
                    updateField("businessType", value as BusinessType)
                  }
                  value={values.businessType || undefined}
                >
                  <SelectTrigger
                    aria-invalid={Boolean(businessTypeError) || undefined}
                    className="h-12 w-full text-base"
                    id="onboarding-business-type"
                  >
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {businessTypes.map((option) => (
                        <SelectItem key={option} value={option}>
                          {businessTypeMeta[option].label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError
                  errors={
                    businessTypeError ? [{ message: businessTypeError }] : undefined
                  }
                />
              </FieldContent>
            </Field>
          ) : null}

          {currentStepMeta.field === "fullName" ? (
            <Field data-invalid={Boolean(fullNameError) || undefined}>
              <FieldLabel className="sr-only" htmlFor="onboarding-full-name">
                Full name
              </FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(fullNameError) || undefined}
                  autoFocus
                  className="h-12 text-base"
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
          ) : null}

          {currentStepMeta.field === "jobTitle" ? (
            <Field data-invalid={Boolean(jobTitleError) || undefined}>
              <FieldLabel className="sr-only" htmlFor="onboarding-job-title">
                Role or title
              </FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(jobTitleError) || undefined}
                  autoFocus
                  className="h-12 text-base"
                  id="onboarding-job-title"
                  maxLength={80}
                  minLength={2}
                  onChange={(event) =>
                    updateField("jobTitle", event.currentTarget.value)
                  }
                  placeholder="Owner"
                  required
                  value={values.jobTitle}
                />
                <FieldError
                  errors={jobTitleError ? [{ message: jobTitleError }] : undefined}
                />
              </FieldContent>
            </Field>
          ) : null}
        </FieldGroup>
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
          <Button disabled={isPending} onClick={handleContinue} size="lg" type="button">
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
    </form>
  );
}
