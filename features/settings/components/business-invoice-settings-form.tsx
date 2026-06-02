"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";

import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";
import type {
  BusinessInvoiceSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";

type BusinessInvoiceSettingsFormProps = {
  action: (
    state: BusinessInvoiceSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessInvoiceSettingsActionState>;
  settings: BusinessSettingsView;
};

const PAYMENT_TERM_PRESETS = [
  { label: "Net 7", value: 7 },
  { label: "Net 14", value: 14 },
  { label: "Net 30", value: 30 },
  { label: "Net 45", value: 45 },
  { label: "Net 60", value: 60 },
  { label: "Net 90", value: 90 },
] as const;

const initialState: BusinessInvoiceSettingsActionState = {};

export function BusinessInvoiceSettingsForm({
  action,
  settings,
}: BusinessInvoiceSettingsFormProps) {
  const { scheduleRefresh } = useDeferredRefresh();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [defaultInvoiceDueDays, setDefaultInvoiceDueDays] = useState(
    String(settings.defaultInvoiceDueDays),
  );

  const hasUnsavedChanges =
    defaultInvoiceDueDays !== String(settings.defaultInvoiceDueDays);
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    scheduleRefresh();
  }, [scheduleRefresh, state.success]);

  function handleCancelChanges() {
    setDefaultInvoiceDueDays(String(settings.defaultInvoiceDueDays));
  }

  const currentValue = Number(defaultInvoiceDueDays);
  const isPresetValue = PAYMENT_TERM_PRESETS.some((p) => p.value === currentValue);

  return (
    <form action={formAction} className="form-stack pb-28">
      <div className="flex flex-col gap-6">
        {/* Info notice */}
        <div className="flex items-start gap-3 rounded-xl border border-border/75 bg-muted/30 px-5 py-4">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            This default applies when generating new invoices. Existing invoices
            keep their stored due date.
          </p>
        </div>

        {/* Settings fields */}
        <section className="section-panel p-5 sm:p-6">
          <div className="flex flex-col gap-6">
            <Field
              data-invalid={
                Boolean(state.fieldErrors?.defaultInvoiceDueDays) || undefined
              }
            >
              <FieldLabel htmlFor="invoice-settings-due-days">
                Default payment terms
              </FieldLabel>
              <FieldContent>
                <div className="flex flex-col gap-3">
                  {/* Preset buttons */}
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_TERM_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          setDefaultInvoiceDueDays(String(preset.value))
                        }
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          currentValue === preset.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div className="flex items-center gap-3">
                    <Input
                      className="w-24"
                      disabled={isPending}
                      id="invoice-settings-due-days"
                      inputMode="numeric"
                      max="365"
                      min="1"
                      name="defaultInvoiceDueDays"
                      onChange={(event) =>
                        setDefaultInvoiceDueDays(event.currentTarget.value)
                      }
                      required
                      step="1"
                      type="number"
                      value={defaultInvoiceDueDays}
                    />
                    <span className="text-sm text-muted-foreground">
                      days after invoice is created
                    </span>
                  </div>
                </div>
                <FieldDescription>
                  How many days customers have to pay after an invoice is issued
                  (1–365 days).
                  {!isPresetValue && currentValue > 0 && (
                    <> Using a custom term of {currentValue} days.</>
                  )}
                </FieldDescription>
                <FieldError
                  errors={
                    state.fieldErrors?.defaultInvoiceDueDays?.[0]
                      ? [{ message: state.fieldErrors.defaultInvoiceDueDays[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </div>
        </section>
      </div>

      {shouldRenderFloatingActions && (
        <FloatingFormActions
          disableSubmit={!hasUnsavedChanges}
          isPending={isPending}
          message="You have unsaved invoice settings."
          onCancel={handleCancelChanges}
          state={floatingActionsState}
          submitLabel="Save invoice settings"
          submitPendingLabel="Saving..."
          visible={shouldRenderFloatingActions}
        />
      )}
    </form>
  );
}
