"use client";

import Image from "next/image";
import Link from "next/link";
import Cropper, { type Area } from "react-easy-crop";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CountryCombobox } from "@/components/shared/country-combobox";
import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import {
  FormSection,
} from "@/components/shared/form-layout";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { getFieldError } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  businessCurrencyOptions,
  getBusinessCountryOption,
  getBusinessCurrencyOption,
  resolveCurrencyForCountry,
} from "@/features/businesses/locale";
import type {
  BusinessAiTonePreference,
  BusinessDeleteActionState,
  BusinessSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";
import {
  formatBusinessAiToneLabel,
  getBusinessPublicInquiryUrl,
  businessLogoAccept,
  businessLogoAllowedMimeTypes,
  businessLogoMaxSize,
  businessSlugMaxLength,
  businessSlugPattern,
} from "@/features/settings/utils";
import { BusinessDeleteZone } from "@/features/settings/components/business-delete-zone";

type BusinessSettingsFormProps = {
  action: (
    state: BusinessSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessSettingsActionState>;
  deleteAction: (
    state: BusinessDeleteActionState,
    formData: FormData,
  ) => Promise<BusinessDeleteActionState>;
  fallbackContactEmail: string;
  logoPreviewUrl: string | null;
  settings: BusinessSettingsView;
};

const initialState: BusinessSettingsActionState = {};

const aiToneOptions: BusinessAiTonePreference[] = [
  "balanced",
  "warm",
  "direct",
  "formal",
];
const aiToneComboboxOptions = aiToneOptions.map((value) => ({
  label: formatBusinessAiToneLabel(value),
  value,
}));

type LoadedLogoAsset = {
  file: File;
  url: string;
  width: number;
  height: number;
};

type BusinessSettingsDraftValues = {
  name: string;
  slug: string;
  contactEmail: string;
  shortDescription: string;
  defaultEmailSignature: string;
  countryCode: string;
  defaultCurrency: string;
  aiTonePreference: BusinessAiTonePreference;
};

function getBusinessSettingsDraftValues(
  settings: BusinessSettingsView,
  fallbackContactEmail: string,
): BusinessSettingsDraftValues {
  return {
    name: settings.name,
    slug: settings.slug,
    contactEmail: settings.contactEmail ?? fallbackContactEmail,
    shortDescription: settings.shortDescription ?? "",
    defaultEmailSignature: settings.defaultEmailSignature ?? "",
    countryCode: settings.countryCode ?? "",
    defaultCurrency: settings.defaultCurrency,
    aiTonePreference: settings.aiTonePreference,
  };
}

export function BusinessSettingsForm({
  action,
  deleteAction,
  fallbackContactEmail,
  logoPreviewUrl,
  settings,
}: BusinessSettingsFormProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const initialDraftValues = useMemo(
    () => getBusinessSettingsDraftValues(settings, fallbackContactEmail),
    [fallbackContactEmail, settings],
  );
  const [draftValues, setDraftValues] = useState(initialDraftValues);
  const draftValuesRef = useRef(draftValues);
  const [savedValues, setSavedValues] = useState(initialDraftValues);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [hasPendingLogo, setHasPendingLogo] = useState(false);
  const [logoResetSignal, setLogoResetSignal] = useState(0);
  const countryCodeError = getFieldError(state.fieldErrors, "countryCode");
  const defaultCurrencyError = getFieldError(state.fieldErrors, "defaultCurrency");
  const aiToneError = getFieldError(state.fieldErrors, "aiTonePreference");
  const publicInquiryUrl = useMemo(
    () => getBusinessPublicInquiryUrl(draftValues.slug || settings.slug),
    [draftValues.slug, settings.slug],
  );
  const selectedCountry = getBusinessCountryOption(draftValues.countryCode);
  const selectedCurrency = getBusinessCurrencyOption(draftValues.defaultCurrency);
  const hasTextInputChanges =
    draftValues.name !== savedValues.name ||
    draftValues.slug !== savedValues.slug ||
    draftValues.contactEmail !== savedValues.contactEmail ||
    draftValues.shortDescription !== savedValues.shortDescription ||
    draftValues.defaultEmailSignature !== savedValues.defaultEmailSignature;
  const hasControlledChanges =
    removeLogo ||
    hasPendingLogo ||
    draftValues.countryCode !== savedValues.countryCode ||
    draftValues.defaultCurrency !== savedValues.defaultCurrency ||
    draftValues.aiTonePreference !== savedValues.aiTonePreference;
  const hasUnsavedChanges = hasControlledChanges || hasTextInputChanges;
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    draftValuesRef.current = draftValues;
  }, [draftValues]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    queueMicrotask(() => {
      setRemoveLogo(false);
      setHasPendingLogo(false);
      setSavedValues(draftValuesRef.current);
      setLogoResetSignal((current) => current + 1);
    });

    router.refresh();
  }, [router, state.success]);

  useEffect(() => {
    queueMicrotask(() => {
      setDraftValues(initialDraftValues);
      setSavedValues(initialDraftValues);
      setRemoveLogo(false);
      setHasPendingLogo(false);
      setLogoResetSignal((current) => current + 1);
    });
  }, [initialDraftValues]);

  function updateDraftValue<Key extends keyof BusinessSettingsDraftValues>(
    key: Key,
    value: BusinessSettingsDraftValues[Key],
  ) {
    setDraftValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCancelChanges() {
    setDraftValues(savedValues);
    setRemoveLogo(false);
    setHasPendingLogo(false);
    setLogoResetSignal((current) => current + 1);
  }

  return (
    <>
      <form
        action={formAction}
        className="form-stack pb-28"
      >
        <input name="removeLogo" type="hidden" value={String(removeLogo)} />
        <input name="countryCode" type="hidden" value={draftValues.countryCode} />
        <input
          name="defaultCurrency"
          type="hidden"
          value={draftValues.defaultCurrency}
        />
        <input
          name="aiTonePreference"
          type="hidden"
          value={draftValues.aiTonePreference}
        />

        <Card className="gap-0 border-border/75 bg-card/97">
          <CardHeader className="gap-2.5 pb-6">
            <CardTitle>Business profile</CardTitle>
            <CardDescription>
              Update your business details, branding, and workflow defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-6">
              <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-7">
                <BusinessLogoField
                  businessName={settings.name}
                  disabled={isPending}
                  fieldError={state.fieldErrors?.logo?.[0]}
                  initialPreviewUrl={logoPreviewUrl}
                  onPendingChange={setHasPendingLogo}
                  onRemoveLogoChange={setRemoveLogo}
                  removeLogo={removeLogo}
                  resetSignal={logoResetSignal}
                  showRemoveToggle={Boolean(settings.logoStoragePath)}
                />
                <div className="flex min-w-0 flex-col gap-5">
                  <FormSection
                    className="soft-panel px-5 py-5 shadow-none sm:px-6"
                    description="Shown to customers."
                    title="Identity & public details"
                  >
                    <FieldGroup>
                      <Field data-invalid={Boolean(state.fieldErrors?.name) || undefined}>
                        <FieldLabel htmlFor="settings-name">Business name</FieldLabel>
                        <FieldContent>
                          <Input
                            value={draftValues.name}
                            disabled={isPending}
                            id="settings-name"
                            maxLength={120}
                            minLength={2}
                            name="name"
                            onChange={(event) =>
                              updateDraftValue("name", event.currentTarget.value)
                            }
                            placeholder="Northline Print Studio"
                            required
                          />
                          <FieldError
                            errors={
                              state.fieldErrors?.name?.[0]
                                ? [{ message: state.fieldErrors.name[0] }]
                                : undefined
                            }
                          />
                        </FieldContent>
                      </Field>

                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <Field data-invalid={Boolean(state.fieldErrors?.slug) || undefined}>
                          <FieldLabel htmlFor="settings-slug">Public slug</FieldLabel>
                          <FieldContent>
                            <Input
                              value={draftValues.slug}
                              disabled={isPending}
                              id="settings-slug"
                              maxLength={businessSlugMaxLength}
                              minLength={2}
                              name="slug"
                              onChange={(event) =>
                                updateDraftValue("slug", event.currentTarget.value)
                              }
                              pattern={businessSlugPattern}
                              placeholder="northline-print"
                              required
                              spellCheck={false}
                            />
                            <FieldDescription>
                              Public URL:{" "}
                              <Link
                                className="underline underline-offset-4"
                                href={publicInquiryUrl}
                                prefetch={false}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {publicInquiryUrl}
                              </Link>
                            </FieldDescription>
                            <FieldError
                              errors={
                                state.fieldErrors?.slug?.[0]
                                  ? [{ message: state.fieldErrors.slug[0] }]
                                  : undefined
                              }
                            />
                          </FieldContent>
                        </Field>

                        <Field
                          data-invalid={Boolean(state.fieldErrors?.contactEmail) || undefined}
                        >
                          <FieldLabel htmlFor="settings-contact-email">
                            Contact email
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              value={draftValues.contactEmail}
                              disabled={isPending}
                              id="settings-contact-email"
                              maxLength={320}
                              name="contactEmail"
                              onChange={(event) =>
                                updateDraftValue(
                                  "contactEmail",
                                  event.currentTarget.value,
                                )
                              }
                              placeholder="hello@example.com"
                              type="email"
                            />
                            <FieldDescription>Shown to customers.</FieldDescription>
                            <FieldError
                              errors={
                                state.fieldErrors?.contactEmail?.[0]
                                  ? [{ message: state.fieldErrors.contactEmail[0] }]
                                  : undefined
                              }
                            />
                          </FieldContent>
                        </Field>
                      </div>
                    </FieldGroup>
                  </FormSection>

                  <FormSection
                    className="soft-panel px-5 py-5 shadow-none sm:px-6"
                    description="Used on inquiry pages and quotes."
                    title="Business summary"
                  >
                    <Field
                      data-invalid={Boolean(state.fieldErrors?.shortDescription) || undefined}
                    >
                      <FieldLabel htmlFor="settings-short-description">
                        Short description
                      </FieldLabel>
                      <FieldContent>
                        <Textarea
                          value={draftValues.shortDescription}
                          disabled={isPending}
                          id="settings-short-description"
                          maxLength={280}
                          name="shortDescription"
                          onChange={(event) =>
                            updateDraftValue(
                              "shortDescription",
                              event.currentTarget.value,
                            )
                          }
                          placeholder="Reliable repair, install, and recurring maintenance work for homes and small property portfolios."
                          rows={5}
                        />
                        <FieldError
                          errors={
                            state.fieldErrors?.shortDescription?.[0]
                              ? [{ message: state.fieldErrors.shortDescription[0] }]
                              : undefined
                          }
                        />
                      </FieldContent>
                    </Field>
                  </FormSection>
                </div>
              </div>

              <FormSection
                className="soft-panel px-5 py-5 shadow-none sm:px-6"
                description="Used for regional defaults and new quotes."
                title="Location & currency"
              >
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <Field data-invalid={Boolean(countryCodeError) || undefined}>
                    <FieldLabel htmlFor="settings-country-code">Country</FieldLabel>
                    <FieldContent>
                      <CountryCombobox
                        aria-invalid={Boolean(countryCodeError) || undefined}
                        disabled={isPending}
                        id="settings-country-code"
                        onValueChange={(value) => {
                          const nextCurrency = resolveCurrencyForCountry(value);
                          setDraftValues((current) => ({
                            ...current,
                            countryCode: value,
                            defaultCurrency: nextCurrency ?? current.defaultCurrency,
                          }));
                        }}
                        placeholder="Choose a country"
                        searchPlaceholder="Search country"
                        showFlags={false}
                        value={draftValues.countryCode}
                      />
                      <FieldDescription>
                        {selectedCountry
                          ? `Selecting ${selectedCountry.label} starts with ${selectedCountry.currencyCode}. You can still set a different default currency.`
                          : "Optional for older businesses. New businesses set this during onboarding."}
                      </FieldDescription>
                      <FieldError
                        errors={
                          countryCodeError ? [{ message: countryCodeError }] : undefined
                        }
                      />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(defaultCurrencyError) || undefined}>
                    <FieldLabel htmlFor="settings-default-currency">
                      Default currency
                    </FieldLabel>
                    <FieldContent>
                      <Combobox
                        aria-invalid={Boolean(defaultCurrencyError) || undefined}
                        disabled={isPending}
                        id="settings-default-currency"
                        onValueChange={(value) =>
                          updateDraftValue("defaultCurrency", value)
                        }
                        options={businessCurrencyOptions.map((currencyOption) => ({
                          label: currencyOption.label,
                          searchText: `${currencyOption.code} ${currencyOption.name}`,
                          value: currencyOption.code,
                        }))}
                        placeholder="Choose a currency"
                        searchPlaceholder="Search currency"
                        value={draftValues.defaultCurrency}
                      />
                      <FieldDescription>
                        New quotes and pricing entries start with{" "}
                        {selectedCurrency?.code ?? draftValues.defaultCurrency}.
                      </FieldDescription>
                      <FieldError
                        errors={
                          defaultCurrencyError
                            ? [{ message: defaultCurrencyError }]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                </div>
              </FormSection>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 border-border/75 bg-card/97">
          <CardHeader className="gap-2.5 pb-6">
            <CardTitle>Writing and follow-up defaults</CardTitle>
            <CardDescription>Default tone and signature for replies and drafts.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex min-w-0 flex-col gap-5">
              <FormSection
                className="soft-panel px-5 py-5 shadow-none sm:px-6"
                description="Used for AI drafts."
                title="AI writing tone"
              >
                <Field data-invalid={Boolean(aiToneError) || undefined}>
                  <FieldLabel htmlFor="settings-ai-tone">Tone preference</FieldLabel>
                  <FieldContent>
                    <Combobox
                      aria-invalid={Boolean(aiToneError) || undefined}
                      disabled={isPending}
                      id="settings-ai-tone"
                      onValueChange={(value) =>
                        updateDraftValue(
                          "aiTonePreference",
                          value as BusinessAiTonePreference,
                        )
                      }
                      options={aiToneComboboxOptions}
                      placeholder="Choose a tone"
                      searchPlaceholder="Search tone"
                      value={draftValues.aiTonePreference}
                    />
                    <FieldError
                      errors={aiToneError ? [{ message: aiToneError }] : undefined}
                    />
                  </FieldContent>
                </Field>
              </FormSection>

              <FormSection
                className="soft-panel px-5 py-5 shadow-none sm:px-6"
                description="Used in email drafts."
                title="Email signature"
              >
                <Field
                  data-invalid={
                    Boolean(state.fieldErrors?.defaultEmailSignature) || undefined
                  }
                >
                  <FieldLabel htmlFor="settings-email-signature">
                    Default email signature
                  </FieldLabel>
                  <FieldContent>
                    <Textarea
                      value={draftValues.defaultEmailSignature}
                      disabled={isPending}
                      id="settings-email-signature"
                      maxLength={1200}
                      name="defaultEmailSignature"
                      onChange={(event) =>
                        updateDraftValue(
                          "defaultEmailSignature",
                          event.currentTarget.value,
                        )
                      }
                      placeholder="Thanks,\nNorthline Home Services"
                      rows={5}
                    />
                    <FieldError
                      errors={
                        state.fieldErrors?.defaultEmailSignature?.[0]
                          ? [{ message: state.fieldErrors.defaultEmailSignature[0] }]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
              </FormSection>
            </div>
          </CardContent>
        </Card>

        <FloatingFormActions
          disableSubmit={!hasUnsavedChanges}
          isPending={isPending}
          message="You have unsaved business settings."
          onCancel={handleCancelChanges}
          state={floatingActionsState}
          submitLabel="Save settings"
          submitPendingLabel="Saving settings..."
          visible={shouldRenderFloatingActions}
        />
      </form>

      <BusinessDeleteZone action={deleteAction} businessName={settings.name} />
    </>
  );
}

function BusinessLogoField({
  businessName,
  disabled,
  fieldError,
  initialPreviewUrl,
  onPendingChange,
  removeLogo,
  resetSignal,
  showRemoveToggle,
  onRemoveLogoChange,
}: {
  businessName: string;
  disabled: boolean;
  fieldError?: string;
  initialPreviewUrl: string | null;
  onPendingChange: (hasPendingChange: boolean) => void;
  removeLogo: boolean;
  resetSignal: number;
  showRemoveToggle: boolean;
  onRemoveLogoChange: (nextValue: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftAsset, setDraftAsset] = useState<LoadedLogoAsset | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (draftAsset) {
        URL.revokeObjectURL(draftAsset.url);
      }
    };
  }, [draftAsset]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    onPendingChange(Boolean(previewUrl));
  }, [onPendingChange, previewUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setCropOpen(false);
      setDraftAsset((currentAsset) => {
        if (currentAsset) {
          URL.revokeObjectURL(currentAsset.url);
        }

        return null;
      });
      setPreviewUrl((currentPreviewUrlValue) => {
        if (currentPreviewUrlValue) {
          URL.revokeObjectURL(currentPreviewUrlValue);
        }

        return null;
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setLocalError(null);
    });
  }, [resetSignal]);

  const currentPreviewUrl = !removeLogo ? previewUrl ?? initialPreviewUrl : null;

  async function handleLogoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.currentTarget.files?.[0];

    setLocalError(null);

    if (!nextFile) {
      return;
    }

    try {
      const nextAsset = await loadLogoAsset(nextFile);

      setDraftAsset((currentAsset) => {
        if (currentAsset) {
          URL.revokeObjectURL(currentAsset.url);
        }

        return nextAsset;
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropOpen(true);
    } catch (error) {
      event.currentTarget.value = "";
      setLocalError(
        error instanceof Error
          ? error.message
          : "We couldn't open that image for cropping.",
      );
    }
  }

  function closeCropper() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setCropOpen(false);
    setDraftAsset((currentAsset) => {
      if (currentAsset) {
        URL.revokeObjectURL(currentAsset.url);
      }

      return null;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  async function applyCrop() {
    if (!draftAsset || !croppedAreaPixels || !inputRef.current) {
      return;
    }

    setLocalError(null);

    try {
      const croppedFile = await createCroppedLogoFile(
        draftAsset.file,
        draftAsset.url,
        croppedAreaPixels,
      );

      const transfer = new DataTransfer();
      transfer.items.add(croppedFile);
      inputRef.current.files = transfer.files;

      setPreviewUrl((currentPreviewUrlValue) => {
        if (currentPreviewUrlValue) {
          URL.revokeObjectURL(currentPreviewUrlValue);
        }

        return URL.createObjectURL(croppedFile);
      });
      onRemoveLogoChange(false);
      setCropOpen(false);
      setDraftAsset((currentAsset) => {
        if (currentAsset) {
          URL.revokeObjectURL(currentAsset.url);
        }

        return null;
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "We couldn't crop that logo right now.",
      );
    }
  }

  function clearPendingLogo() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setPreviewUrl((currentPreviewUrlValue) => {
      if (currentPreviewUrlValue) {
        URL.revokeObjectURL(currentPreviewUrlValue);
      }

      return null;
    });
    setLocalError(null);
  }

  return (
    <>
      <div className="self-start xl:sticky xl:top-6">
        <div className="soft-panel flex flex-col gap-5 p-5 shadow-none sm:p-6">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Brand asset
            </p>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Business identity
              </h2>
              <p className="text-sm text-muted-foreground">Shown on inquiry pages and quotes.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-5 py-5">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="group relative">
                <input
                  ref={inputRef}
                  accept={businessLogoAccept}
                  className="sr-only"
                  disabled={disabled}
                  id="settings-logo"
                  name="logo"
                  onChange={handleLogoSelection}
                  type="file"
                />
                <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] border border-border/75 bg-background/92 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-transform duration-150 group-hover:scale-[1.01] xl:size-28">
                  {currentPreviewUrl ? (
                    <Image
                      alt={`${businessName} logo`}
                      className="max-h-[68%] w-auto object-contain"
                      height={112}
                      src={currentPreviewUrl}
                      unoptimized
                      width={112}
                    />
                  ) : (
                    <span className="text-lg font-semibold uppercase tracking-[0.18em] text-foreground">
                      {getInitials(businessName)}
                    </span>
                  )}
                </div>
                <label
                  className={cn(
                    "absolute inset-0 flex cursor-pointer items-end justify-end rounded-[1.6rem] focus-within:outline-none",
                    disabled && "pointer-events-none cursor-default opacity-60",
                  )}
                  htmlFor="settings-logo"
                  onKeyDown={(event) => {
                    if (
                      disabled ||
                      (event.key !== "Enter" && event.key !== " ")
                    ) {
                      return;
                    }

                    event.preventDefault();
                    inputRef.current?.click();
                  }}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                >
                  <span className="absolute inset-0 rounded-[1.6rem] bg-foreground/0 transition-colors duration-150 sm:group-hover:bg-foreground/10 sm:group-focus-within:bg-foreground/10" />
                  <span className="relative mr-1.5 mb-1.5 inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-background/94 text-foreground shadow-[0_8px_20px_rgba(15,23,42,0.14)] transition-[transform,opacity] duration-150 opacity-100 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
                    <Camera className="size-4" />
                    <span className="sr-only">
                      {currentPreviewUrl ? "Update logo" : "Upload logo"}
                    </span>
                  </span>
                </label>
              </div>

              <div className="min-w-0 max-w-full space-y-2">
                <p className="text-base font-semibold tracking-tight text-foreground">
                  {businessName}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/70 pt-5">
            <div className="flex flex-col gap-3">
              {previewUrl ? (
                <div className="soft-panel flex flex-col gap-3 px-4 py-3 text-sm shadow-none sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">Cropped logo ready</p>
                    <p className="text-muted-foreground">Uploads after save.</p>
                  </div>
                  <Button
                    disabled={disabled}
                    onClick={clearPendingLogo}
                    type="button"
                    variant="outline"
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
              {showRemoveToggle && !previewUrl ? (
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <Button
                      aria-pressed={removeLogo}
                      disabled={disabled}
                      onClick={() => onRemoveLogoChange(!removeLogo)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {removeLogo ? "Keep logo" : "Remove logo"}
                    </Button>
                  </div>
                  {removeLogo ? (
                    <p className="text-muted-foreground">
                      Falls back to initials after save.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {localError || fieldError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {localError || fieldError}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={cropOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCropper();
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Crop brand asset</DialogTitle>
            <DialogDescription>Adjust the crop.</DialogDescription>
          </DialogHeader>

          <DialogBody className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex flex-col gap-4">
              <div className="soft-panel relative min-h-[26rem] overflow-hidden bg-muted/25">
                {draftAsset ? (
                  <Cropper
                    aspect={1}
                    crop={crop}
                    cropShape="rect"
                    image={draftAsset.url}
                    objectFit="contain"
                    onCropChange={setCrop}
                    onCropComplete={(_, areaPixels) =>
                      setCroppedAreaPixels(areaPixels)
                    }
                    onZoomChange={setZoom}
                    showGrid={false}
                    zoom={zoom}
                  />
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">Drag and zoom to fit.</p>
            </div>

            <div className="flex flex-col gap-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="logo-crop-zoom">Zoom</FieldLabel>
                  <FieldContent>
                    <input
                      className="h-10 w-full accent-primary"
                      id="logo-crop-zoom"
                      max="4"
                      min="1"
                      onChange={(event) => setZoom(Number(event.currentTarget.value))}
                      step="0.01"
                      type="range"
                      value={zoom}
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>

              {draftAsset ? (
                <div className="soft-panel flex items-start gap-3 px-4 py-4 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{draftAsset.file.name}</p>
                    <p className="text-muted-foreground">Replaces the upload.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </DialogBody>

          <DialogFooter>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={closeCropper} type="button" variant="outline">
                Cancel
              </Button>
              <Button onClick={applyCrop} type="button">
                Use cropped logo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function loadLogoAsset(file: File): Promise<LoadedLogoAsset> {
  const url = URL.createObjectURL(file);

  try {
    const dimensions = await readImageDimensions(url);

    return {
      file,
      url,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function readImageDimensions(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      reject(
        new Error("Choose a JPG, PNG, or WEBP image that can be opened in the browser."),
      );
    };
    image.src = url;
  });
}

async function createCroppedLogoFile(
  sourceFile: File,
  sourceUrl: string,
  cropAreaPixels: Area,
) {
  const image = await loadCanvasImage(sourceUrl);
  const outputMimeType = businessLogoAllowedMimeTypes.includes(
    sourceFile.type as (typeof businessLogoAllowedMimeTypes)[number],
  )
    ? sourceFile.type
    : "image/png";
  const outputExtension = getLogoExtensionForMimeType(outputMimeType);

  for (const maxDimension of [1200, 1024, 896, 768, 640, 512]) {
    const scale = Math.min(
      1,
      maxDimension / Math.max(cropAreaPixels.width, cropAreaPixels.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cropAreaPixels.width * scale));
    canvas.height = Math.max(1, Math.round(cropAreaPixels.height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Your browser could not prepare that crop.");
    }

    context.drawImage(
      image,
      cropAreaPixels.x,
      cropAreaPixels.y,
      cropAreaPixels.width,
      cropAreaPixels.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        outputMimeType,
        outputMimeType === "image/jpeg" || outputMimeType === "image/webp"
          ? 0.92
          : undefined,
      );
    });

    if (!blob) {
      continue;
    }

    const croppedFile = new File(
      [blob],
      buildCroppedLogoFileName(sourceFile.name, outputExtension),
      {
        lastModified: Date.now(),
        type: outputMimeType,
      },
    );

    if (croppedFile.size <= businessLogoMaxSize) {
      return croppedFile;
    }
  }

  throw new Error("The cropped logo is still larger than 2 MB. Try a tighter crop or a smaller source image.");
}

function loadCanvasImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("We couldn't render that image for cropping."));
    image.src = url;
  });
}

function buildCroppedLogoFileName(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");

  return `${baseName || "business-logo"}-cropped${extension}`;
}

function getLogoExtensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      return ".png";
  }
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
