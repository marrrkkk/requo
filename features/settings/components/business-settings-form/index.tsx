"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { getFieldError } from "@/lib/action-state";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import type {
  BusinessSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";
import type { BusinessRecordActionState } from "@/features/businesses/types";
import { BusinessDeleteZone } from "@/features/settings/components/business-delete-zone";
import { IdentitySection } from "./identity-section";
import { SummarySection } from "./summary-section";
import { RegionalDefaultsSection } from "./regional-defaults-section";

type BusinessSettingsFormProps = {
  action: (
    state: BusinessSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessSettingsActionState>;
  archiveAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
  deleteAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
  fallbackContactEmail: string;
  logoPreviewUrl: string | null;
  restoreAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
  settings: BusinessSettingsView;
  unarchiveAction: (
    state: BusinessRecordActionState,
    formData: FormData,
  ) => Promise<BusinessRecordActionState>;
};

const initialState: BusinessSettingsActionState = {};

type BusinessSettingsDraftValues = {
  name: string;
  slug: string;
  contactEmail: string;
  shortDescription: string;
  countryCode: string;
  defaultCurrency: string;
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
    countryCode: settings.countryCode ?? "",
    defaultCurrency: settings.defaultCurrency,
  };
}

export function BusinessSettingsForm({
  action,
  archiveAction,
  deleteAction,
  fallbackContactEmail,
  logoPreviewUrl,
  restoreAction,
  settings,
  unarchiveAction,
}: BusinessSettingsFormProps) {
  const { scheduleRefresh } = useDeferredRefresh();
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
  const hasTextInputChanges =
    draftValues.name !== savedValues.name ||
    draftValues.slug !== savedValues.slug ||
    draftValues.contactEmail !== savedValues.contactEmail ||
    draftValues.shortDescription !== savedValues.shortDescription;
  const hasControlledChanges =
    removeLogo ||
    hasPendingLogo ||
    draftValues.countryCode !== savedValues.countryCode ||
    draftValues.defaultCurrency !== savedValues.defaultCurrency;
  const hasUnsavedChanges = hasControlledChanges || hasTextInputChanges;
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);
  const businessNamePreview = draftValues.name.trim() || settings.name;

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

    scheduleRefresh();
  }, [scheduleRefresh, state.success]);

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
        className="form-stack"
      >
        <input name="removeLogo" type="hidden" value={String(removeLogo)} />
        <input name="countryCode" type="hidden" value={draftValues.countryCode} />
        <input
          name="defaultCurrency"
          type="hidden"
          value={draftValues.defaultCurrency}
        />

        <section className="section-panel p-5 sm:p-6">
          <div className="flex flex-col gap-7">
            {/* Logo + identity row */}
            <IdentitySection
              businessNamePreview={businessNamePreview}
              draftValues={draftValues}
              fieldErrors={state.fieldErrors}
              isPending={isPending}
              logoPreviewUrl={logoPreviewUrl}
              logoResetSignal={logoResetSignal}
              onPendingLogoChange={setHasPendingLogo}
              onRemoveLogoChange={setRemoveLogo}
              removeLogo={removeLogo}
              showRemoveToggle={Boolean(settings.logoStoragePath)}
              updateDraftValue={updateDraftValue}
            />

            <div className="border-t border-border/70" />

            <SummarySection
              draftValue={draftValues.shortDescription}
              fieldErrors={state.fieldErrors}
              isPending={isPending}
              updateDraftValue={(value) =>
                updateDraftValue("shortDescription", value)
              }
            />

            <div className="border-t border-border/70" />

            <RegionalDefaultsSection
              countryCode={draftValues.countryCode}
              countryCodeError={countryCodeError}
              defaultCurrency={draftValues.defaultCurrency}
              defaultCurrencyError={defaultCurrencyError}
              isPending={isPending}
              onCountryChange={(value, resolvedCurrency) => {
                setDraftValues((current) => ({
                  ...current,
                  countryCode: value,
                  defaultCurrency: resolvedCurrency ?? current.defaultCurrency,
                }));
              }}
              onCurrencyChange={(value) =>
                updateDraftValue("defaultCurrency", value)
              }
            />
          </div>
        </section>

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

      <BusinessDeleteZone
        archiveAction={archiveAction}
        businessName={settings.name}
        deleteAction={deleteAction}
        recordState={settings.recordState}
        restoreAction={restoreAction}
        unarchiveAction={unarchiveAction}
      />
    </>
  );
}
