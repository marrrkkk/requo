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
import { Textarea } from "@/components/ui/textarea";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  BusinessQuoteSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";

type BusinessQuoteSettingsFormProps = {
  action: (
    state: BusinessQuoteSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessQuoteSettingsActionState>;
  settings: BusinessSettingsView;
};

const initialState: BusinessQuoteSettingsActionState = {};

export function BusinessQuoteSettingsForm({
  action,
  settings,
}: BusinessQuoteSettingsFormProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [defaultQuoteValidityDays, setDefaultQuoteValidityDays] = useState(
    String(settings.defaultQuoteValidityDays),
  );
  const [defaultQuoteNotes, setDefaultQuoteNotes] = useState(
    settings.defaultQuoteNotes ?? "",
  );
  const hasUnsavedChanges =
    defaultQuoteValidityDays !== String(settings.defaultQuoteValidityDays) ||
    defaultQuoteNotes !== (settings.defaultQuoteNotes ?? "");
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();
  }, [router, state.success]);

  function handleCancelChanges() {
    setDefaultQuoteValidityDays(String(settings.defaultQuoteValidityDays));
    setDefaultQuoteNotes(settings.defaultQuoteNotes ?? "");
  }

  return (
    <form action={formAction} className="form-stack pb-28">
      <div className="flex flex-col gap-6">
        {/* Info notice */}
        <div className="flex items-start gap-3 rounded-xl border border-border/75 bg-muted/30 px-5 py-4">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            These defaults apply to new quotes only. Existing quotes keep their
            stored values.
          </p>
        </div>

        {/* Settings fields */}
        <section className="section-panel p-5 sm:p-6">
          <div className="flex flex-col gap-6">
            <Field
              data-invalid={
                Boolean(state.fieldErrors?.defaultQuoteValidityDays) || undefined
              }
            >
              <FieldLabel htmlFor="quote-settings-validity-days">
                Default validity period
              </FieldLabel>
              <FieldContent>
                <div className="flex items-center gap-3">
                  <Input
                    className="w-24"
                    disabled={isPending}
                    id="quote-settings-validity-days"
                    inputMode="numeric"
                    max="365"
                    min="1"
                    name="defaultQuoteValidityDays"
                    onChange={(event) =>
                      setDefaultQuoteValidityDays(event.currentTarget.value)
                    }
                    required
                    step="1"
                    type="number"
                    value={defaultQuoteValidityDays}
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <FieldDescription>
                  How long new quotes stay valid before expiring (1–365 days).
                </FieldDescription>
                <FieldError
                  errors={
                    state.fieldErrors?.defaultQuoteValidityDays?.[0]
                      ? [{ message: state.fieldErrors.defaultQuoteValidityDays[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <div className="border-t border-border" />

            <Field data-invalid={Boolean(state.fieldErrors?.defaultQuoteNotes) || undefined}>
              <FieldLabel htmlFor="quote-settings-default-notes">
                Default quote notes
              </FieldLabel>
              <FieldContent>
                <Textarea
                  disabled={isPending}
                  id="quote-settings-default-notes"
                  maxLength={1600}
                  name="defaultQuoteNotes"
                  onChange={(event) => setDefaultQuoteNotes(event.currentTarget.value)}
                  placeholder="e.g., Payment terms, warranty info, or next steps..."
                  rows={6}
                  value={defaultQuoteNotes}
                />
                <FieldDescription>
                  Automatically added to the notes section of every new quote.
                  Customers see this on the public quote page.
                </FieldDescription>
                <FieldError
                  errors={
                    state.fieldErrors?.defaultQuoteNotes?.[0]
                      ? [{ message: state.fieldErrors.defaultQuoteNotes[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </div>
        </section>
      </div>

      <FloatingFormActions
        disableSubmit={!hasUnsavedChanges}
        isPending={isPending}
        message="You have unsaved quote settings."
        onCancel={handleCancelChanges}
        state={floatingActionsState}
        submitLabel="Save quote settings"
        submitPendingLabel="Saving..."
        visible={shouldRenderFloatingActions}
      />
    </form>
  );
}
