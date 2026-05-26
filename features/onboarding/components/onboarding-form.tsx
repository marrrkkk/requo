"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Camera, CheckCircle2, PartyPopper } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/shared/brand-mark";
import { CountryCombobox } from "@/components/shared/country-combobox";
import { FormActions } from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  businessCurrencyOptions,
} from "@/features/businesses/locale";
import {
  starterTemplateDefinitions,
  starterTemplateBusinessTypes,
} from "@/features/businesses/starter-templates";
import {
  businessTypeOptions,
  type BusinessType,
} from "@/features/inquiries/business-types";
import { cn } from "@/lib/utils";
import { slugifyPublicName } from "@/lib/slugs";
import {
  createEmptyOnboardingDraft,
  getRecommendedStarterTemplateForBusinessType,
  onboardingSessionStorageKey,
  resolveOnboardingCurrencyChange,
  type OnboardingDraft,
} from "@/features/onboarding/helpers";
import { OnboardingStepper } from "@/features/onboarding/components/onboarding-stepper";
import {
  customerContactChannelOptions,
  companySizeOptions,
  jobTitleOptions,
  onboardingBusinessContextSchema,
  onboardingOwnerProfileSchema,
  onboardingTemplateSchema,
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
  detectedCountryCode?: string;
  initialProfile?: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
};

type OnboardingStepId = "business" | "template" | "profile";

const onboardingSteps = [
  {
    id: "business" as const,
    label: "Business",
    description: "Add the core details for your first business.",
    title: "Add your first business",
    body:
      "Set up your business identity so clients recognize you.",
    fields: [
      "businessName",
      "businessSlug",
      "countryCode",
      "defaultCurrency",
    ] as const satisfies readonly OnboardingFieldName[],
  },
  {
    id: "template" as const,
    label: "Template",
    description: "Choose the fastest path to a usable inquiry form.",
    title: "Configure your workflow",
    body:
      "Pick your business type and starting template. You can customize everything later.",
    fields: [
      "starterTemplateBusinessType",
    ] as const satisfies readonly OnboardingFieldName[],
  },
  {
    id: "profile" as const,
    label: "Profile",
    description: "Your avatar, name, and role.",
    title: "Finish your profile",
    body: "Add your photo and name so your team and clients can recognize you.",
    fields: [
      "firstName",
      "lastName",
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
  "h-9 text-sm focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-border aria-invalid:border-input/95 aria-invalid:ring-0 aria-invalid:ring-transparent";
const onboardingComboboxButtonClassName =
  "h-9 text-sm focus-visible:ring-0 focus-visible:ring-transparent focus-visible:border-border aria-invalid:border-border/85 aria-invalid:ring-0 aria-invalid:ring-transparent";

export function OnboardingForm({ action, detectedCountryCode, initialProfile }: OnboardingFormProps) {
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => ({
    ...createEmptyOnboardingDraft(),
    ...(detectedCountryCode
      ? {
          countryCode: detectedCountryCode,
          defaultCurrency: resolveOnboardingCurrencyChange({
            currentCurrency: "",
            previousCountryCode: "",
            nextCountryCode: detectedCountryCode,
          }),
        }
      : {}),
    ...(initialProfile
      ? {
          firstName: initialProfile.firstName,
          lastName: initialProfile.lastName,
        }
      : {}),
  }));
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
    initialProfile?.avatarUrl ?? null,
  );
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const businessAvatarInputRef = useRef<HTMLInputElement>(null);
  const [businessAvatarPreviewUrl, setBusinessAvatarPreviewUrl] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugAvailability, setSlugAvailability] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const slugCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    if (currentStepId === "business" && slugAvailability === "taken") {
      toast.error("That URL is already taken. Choose a different one.");
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

  function handleAvatarSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile photo must be under 2 MB.");
      event.currentTarget.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setAvatarPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return url;
    });
  }

  function handleBusinessAvatarSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Business logo must be under 2 MB.");
      event.currentTarget.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setBusinessAvatarPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return url;
    });
  }

  function checkSlugAvailability(slug: string) {
    if (slugCheckTimeoutRef.current) {
      clearTimeout(slugCheckTimeoutRef.current);
    }

    if (!slug || slug.length < 2) {
      setSlugAvailability("idle");
      return;
    }

    setSlugAvailability("checking");

    slugCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/business/check-slug?slug=${encodeURIComponent(slug)}`,
        );
        const data = await response.json();
        setSlugAvailability(data.available ? "available" : "taken");
      } catch {
        setSlugAvailability("idle");
      }
    }, 400);
  }

  return (
    <>
      <form
        action={formAction}
        className="mx-auto w-full max-w-5xl"
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
        <input name="firstName" type="hidden" value={draft.firstName} />
        <input name="lastName" type="hidden" value={draft.lastName} />
        <input name="businessName" type="hidden" value={draft.businessName} />
        <input name="businessSlug" type="hidden" value={draft.businessSlug} />
        <input name="businessType" type="hidden" value={draft.businessType} />
        <input name="countryCode" type="hidden" value={draft.countryCode} />
        <input
          name="defaultCurrency"
          type="hidden"
          value={draft.defaultCurrency}
        />
        <input
          name="customerContactChannel"
          type="hidden"
          value={draft.customerContactChannel}
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

        <div className="flex w-full flex-col gap-5">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {currentStepMeta.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentStepMeta.body}
            </p>
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

          <div className="min-w-0 animate-in fade-in slide-in-from-bottom-3 duration-300" key={currentStepId}>
            {currentStepId === "profile" ? (
              <div className="mx-auto w-full max-w-md py-4">
                <FieldGroup>
                      <Field>
                        <FieldLabel>Profile photo</FieldLabel>
                        <FieldContent>
                          <div className="flex items-center gap-5">
                            <div className="group relative">
                              <input
                                ref={avatarInputRef}
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                disabled={isPending}
                                id="onboarding-avatar"
                                name="avatar"
                                onChange={handleAvatarSelection}
                                type="file"
                              />
                              <Avatar className="size-20 border border-border/75 shadow-sm">
                                <AvatarImage
                                  alt="Profile photo preview"
                                  src={avatarPreviewUrl ?? undefined}
                                />
                                <AvatarFallback className="text-lg">
                                  {getInitials(
                                    draft.firstName || draft.lastName
                                      ? `${draft.firstName} ${draft.lastName}`
                                      : "?",
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <label
                                className={cn(
                                  "absolute inset-0 flex cursor-pointer items-end justify-end rounded-full focus-within:outline-none",
                                  isPending &&
                                    "pointer-events-none cursor-default opacity-60",
                                )}
                                htmlFor="onboarding-avatar"
                                role="button"
                                tabIndex={isPending ? -1 : 0}
                              >
                                <span className="absolute inset-0 rounded-full bg-foreground/0 transition-colors duration-150 sm:group-hover:bg-foreground/10" />
                                <span className="relative mr-0.5 mb-0.5 inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/94 text-foreground shadow-sm">
                                  <Camera className="size-3.5" />
                                  <span className="sr-only">Upload photo</span>
                                </span>
                              </label>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>Upload a profile photo.</p>
                              <p>JPG, PNG, or WEBP. Max 2 MB.</p>
                            </div>
                          </div>
                        </FieldContent>
                      </Field>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field
                          data-invalid={
                            Boolean(fieldErrors.firstName) || undefined
                          }
                        >
                          <FieldLabel htmlFor="onboarding-first-name">
                            First name
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              aria-invalid={
                                Boolean(fieldErrors.firstName) || undefined
                              }
                              autoFocus={isDraftHydrated && !draft.firstName}
                              className={onboardingInputClassName}
                              disabled={isPending}
                              id="onboarding-first-name"
                              maxLength={60}
                              minLength={1}
                              onChange={(event) =>
                                updateField(
                                  "firstName",
                                  event.currentTarget.value,
                                )
                              }
                              placeholder="Alicia"
                              required
                              value={draft.firstName}
                            />
                          </FieldContent>
                        </Field>

                        <Field
                          data-invalid={
                            Boolean(fieldErrors.lastName) || undefined
                          }
                        >
                          <FieldLabel htmlFor="onboarding-last-name">
                            Last name
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              aria-invalid={
                                Boolean(fieldErrors.lastName) || undefined
                              }
                              className={onboardingInputClassName}
                              disabled={isPending}
                              id="onboarding-last-name"
                              maxLength={60}
                              minLength={1}
                              onChange={(event) =>
                                updateField(
                                  "lastName",
                                  event.currentTarget.value,
                                )
                              }
                              placeholder="Cruz"
                              required
                              value={draft.lastName}
                            />
                          </FieldContent>
                        </Field>
                      </div>

                      <Field
                        data-invalid={Boolean(fieldErrors.jobTitle) || undefined}
                      >
                        <FieldLabel htmlFor="onboarding-job-title">
                          Role <span className="text-muted-foreground font-normal">(optional)</span>
                        </FieldLabel>
                        <FieldContent>
                          <Combobox
                            aria-invalid={
                              Boolean(fieldErrors.jobTitle) || undefined
                            }
                            buttonClassName={onboardingComboboxButtonClassName}
                            disabled={isPending}
                            id="onboarding-job-title"
                            onValueChange={(value) =>
                              updateField("jobTitle", value)
                            }
                            options={jobTitleOptions}
                            placeholder="Choose your role"
                            value={draft.jobTitle}
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="onboarding-company-size">
                          Team size <span className="text-muted-foreground font-normal">(optional)</span>
                        </FieldLabel>
                        <FieldContent>
                          <Combobox
                            buttonClassName={onboardingComboboxButtonClassName}
                            disabled={isPending}
                            id="onboarding-company-size"
                            onValueChange={(value) =>
                              updateField("companySize", value)
                            }
                            options={companySizeOptions}
                            placeholder="How big is your team?"
                            value={draft.companySize}
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="onboarding-referral-source">
                          How did you find us? <span className="text-muted-foreground font-normal">(optional)</span>
                        </FieldLabel>
                        <FieldContent>
                          <Combobox
                            buttonClassName={onboardingComboboxButtonClassName}
                            disabled={isPending}
                            id="onboarding-referral-source"
                            onValueChange={(value) =>
                              updateField("referralSource", value)
                            }
                            options={referralSourceOptions}
                            placeholder="Choose a source"
                            value={draft.referralSource}
                          />
                        </FieldContent>
                      </Field>
                    </FieldGroup>
              </div>
            ) : null}

            {currentStepId === "business" ? (
              <div className="mx-auto w-full max-w-md py-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Business logo</FieldLabel>
                      <FieldContent>
                        <div className="flex items-center gap-5">
                          <div className="group relative">
                            <input
                              ref={businessAvatarInputRef}
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              disabled={isPending}
                              id="onboarding-business-avatar"
                              name="businessAvatar"
                              onChange={handleBusinessAvatarSelection}
                              type="file"
                            />
                            <Avatar className="size-20 rounded-xl border border-border/75 shadow-sm">
                              <AvatarImage
                                alt="Business logo preview"
                                className="rounded-xl"
                                src={businessAvatarPreviewUrl ?? undefined}
                              />
                              <AvatarFallback className="rounded-xl text-lg">
                                {getInitials(draft.businessName || "?")}
                              </AvatarFallback>
                            </Avatar>
                            <label
                              className={cn(
                                "absolute inset-0 flex cursor-pointer items-end justify-end rounded-xl focus-within:outline-none",
                                isPending &&
                                  "pointer-events-none cursor-default opacity-60",
                              )}
                              htmlFor="onboarding-business-avatar"
                              role="button"
                              tabIndex={isPending ? -1 : 0}
                            >
                              <span className="absolute inset-0 rounded-xl bg-foreground/0 transition-colors duration-150 sm:group-hover:bg-foreground/10" />
                              <span className="relative mr-0.5 mb-0.5 inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/94 text-foreground shadow-sm">
                                <Camera className="size-3.5" />
                                <span className="sr-only">Upload logo</span>
                              </span>
                            </label>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Upload a business logo.</p>
                            <p>JPG, PNG, or WEBP. Max 2 MB.</p>
                          </div>
                        </div>
                      </FieldContent>
                    </Field>

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
                          onChange={(event) => {
                            const name = event.currentTarget.value;
                            updateField("businessName", name);
                            if (!slugManuallyEdited) {
                              const autoSlug = name.trim()
                                ? slugifyPublicName(name)
                                : "";
                              updateField("businessSlug", autoSlug);
                              checkSlugAvailability(autoSlug);
                            }
                          }}
                          placeholder="Northline Print Studio"
                          required
                          value={draft.businessName}
                        />
                      </FieldContent>
                    </Field>

                    <Field
                      data-invalid={Boolean(fieldErrors.businessSlug) || slugAvailability === "taken" || undefined}
                    >
                      <FieldLabel htmlFor="onboarding-business-slug">
                        Public URL
                      </FieldLabel>
                      <FieldContent>
                        <div
                          className={cn(
                            "flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm transition-colors",
                            (Boolean(fieldErrors.businessSlug) || slugAvailability === "taken") && "border-destructive",
                            isPending && "opacity-60",
                          )}
                        >
                          <span className="shrink-0 select-none text-sm text-muted-foreground">
                            /businesses/
                          </span>
                          <input
                            aria-invalid={
                              Boolean(fieldErrors.businessSlug) || slugAvailability === "taken" || undefined
                            }
                            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                            disabled={isPending}
                            id="onboarding-business-slug"
                            maxLength={60}
                            onChange={(event) => {
                              setSlugManuallyEdited(true);
                              const nextSlug = event.currentTarget.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, "-")
                                .replace(/--+/g, "-")
                                .replace(/^-|-$/g, "");
                              updateField("businessSlug", nextSlug);
                              checkSlugAvailability(nextSlug);
                            }}
                            placeholder="your-business"
                            value={draft.businessSlug}
                          />
                        </div>
                        {slugAvailability === "taken" ? (
                          <p className="mt-1.5 text-sm text-destructive">
                            This URL is already taken. Try a different one.
                          </p>
                        ) : slugAvailability === "available" && draft.businessSlug.length >= 2 ? (
                          <p className="mt-1.5 text-sm text-primary">
                            Available
                          </p>
                        ) : null}
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
                        </FieldContent>
                      </Field>
                    </div>
                  </FieldGroup>
              </div>
            ) : null}

            {currentStepId === "template" ? (
              <div className="mx-auto w-full max-w-md py-4">
                      <FieldGroup>
                    <Field
                      data-invalid={Boolean(fieldErrors.businessType) || undefined}
                    >
                      <FieldLabel htmlFor="onboarding-business-type">
                        Business type
                      </FieldLabel>
                      <FieldContent>
                        <Combobox
                          aria-invalid={
                            Boolean(fieldErrors.businessType) || undefined
                          }
                          buttonClassName={onboardingComboboxButtonClassName}
                          disabled={isPending}
                          id="onboarding-business-type"
                          onValueChange={handleBusinessTypeChange}
                          options={businessTypeOptions}
                          placeholder="Choose a type"
                          searchPlaceholder="Search types"
                          searchable
                          value={draft.businessType}
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="onboarding-customer-contact">
                        Contact channel <span className="text-muted-foreground font-normal">(optional)</span>
                      </FieldLabel>
                      <FieldContent>
                        <Combobox
                          buttonClassName={onboardingComboboxButtonClassName}
                          disabled={isPending}
                          id="onboarding-customer-contact"
                          onValueChange={(value) =>
                            updateField("customerContactChannel", value)
                          }
                          options={customerContactChannelOptions}
                          placeholder="Choose a channel"
                          value={draft.customerContactChannel}
                        />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel>Template</FieldLabel>
                      <FieldContent>
                        <div className="flex flex-col gap-1.5">
                          {starterTemplateBusinessTypes.map((templateType) => {
                            const def = starterTemplateDefinitions[templateType];
                            const isSelected =
                              draft.starterTemplateBusinessType === templateType;
                            const isRecommended =
                              recommendedTemplate === templateType;

                            return (
                              <button
                                key={templateType}
                                className={cn(
                                  "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary/5 text-foreground"
                                    : "border-border/60 hover:bg-accent/30",
                                  isPending && "pointer-events-none opacity-60",
                                )}
                                disabled={isPending}
                                onClick={() =>
                                  updateField(
                                    "starterTemplateBusinessType",
                                    templateType,
                                  )
                                }
                                type="button"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={cn(
                                      "flex size-3.5 shrink-0 items-center justify-center rounded-full border-2",
                                      isSelected
                                        ? "border-primary bg-primary"
                                        : "border-border",
                                    )}
                                  >
                                    {isSelected ? (
                                      <span className="size-1 rounded-full bg-white" />
                                    ) : null}
                                  </span>
                                  <span className="min-w-0 flex-1 font-medium">
                                    {def.label}
                                  </span>
                                  {isRecommended ? (
                                    <span className="shrink-0 text-[10px] text-primary">
                                      ★
                                    </span>
                                  ) : null}
                                </div>
                                <p className="ml-6 text-[11px] leading-relaxed text-muted-foreground">
                                  {def.recommendedFields.join(" · ")}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
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
                size="sm"
                type="button"
                variant="ghost"
              >
                Back
              </Button>
            ) : null}

            {currentStep < lastOnboardingStepIndex ? (
              <Button
                key="continue"
                disabled={isPending}
                onClick={handleContinue}
                size="sm"
                type="button"
              >
                Continue
              </Button>
            ) : (
              <Button key="finish" disabled={isPending} size="sm" type="submit">
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
    case "firstName": {
      const result = onboardingOwnerProfileSchema.shape.firstName.safeParse(
        draft.firstName,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "lastName": {
      const result = onboardingOwnerProfileSchema.shape.lastName.safeParse(
        draft.lastName,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "jobTitle": {
      if (!draft.jobTitle) return undefined;
      const result = onboardingOwnerProfileSchema.shape.jobTitle.safeParse(
        draft.jobTitle,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "businessName": {
      const result = onboardingBusinessContextSchema.shape.businessName.safeParse(
        draft.businessName,
      );
      return result.success ? undefined : result.error.issues[0]?.message;
    }
    case "businessSlug": {
      const slug = draft.businessSlug.trim();
      if (!slug) return "Enter a URL slug.";
      if (slug.length < 2) return "Use at least 2 characters.";
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug))
        return "Use only lowercase letters, numbers, and hyphens.";
      return undefined;
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
    case "customerContactChannel": {
      const result =
        onboardingBusinessContextSchema.shape.customerContactChannel.safeParse(
          draft.customerContactChannel,
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
    case "companySize":
    case "referralSource":
      return undefined;
  }
}

function sanitizeDraft(
  value: Partial<OnboardingDraft> | undefined,
): Partial<OnboardingDraft> {
  if (!value) {
    return {};
  }

  return {
    firstName: typeof value.firstName === "string" ? value.firstName : "",
    lastName: typeof value.lastName === "string" ? value.lastName : "",
    jobTitle: typeof value.jobTitle === "string" ? value.jobTitle : "",
    businessName:
      typeof value.businessName === "string" ? value.businessName : "",
    businessSlug:
      typeof value.businessSlug === "string" ? value.businessSlug : "",
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
    customerContactChannel:
      typeof value.customerContactChannel === "string"
        ? value.customerContactChannel
        : "",
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
  "Creating your business…",
  "Setting up your business…",
  "Building your inquiry form…",
  "You're all set!",
];

function SetupLoadingOverlay() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep >= setupLoadingSteps.length - 1) {
      return;
    }

    const delay = activeStep === setupLoadingSteps.length - 2 ? 1400 : 1200;

    const timeout = window.setTimeout(
      () => setActiveStep((step) => Math.min(step + 1, setupLoadingSteps.length - 1)),
      delay,
    );

    return () => window.clearTimeout(timeout);
  }, [activeStep]);

  const isComplete = activeStep === setupLoadingSteps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-10 px-6">
        <BrandMark subtitle={null} size="xl" />
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
              ) : index === activeStep && !isComplete ? (
                <Spinner className="size-5 shrink-0" />
              ) : index === activeStep && isComplete ? (
                <PartyPopper className="size-5 shrink-0 text-primary" />
              ) : (
                <div className="size-5 shrink-0" />
              )}
              <p
                className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  index <= activeStep
                    ? "text-foreground"
                    : "text-muted-foreground",
                  index === activeStep && isComplete && "text-primary",
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

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
