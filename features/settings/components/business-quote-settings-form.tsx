"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import { FormSection } from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  BusinessQuoteSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";
import { businessCurrencyOptions } from "@/features/settings/utils";

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
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultCurrency);
  const [defaultQuoteValidityDays, setDefaultQuoteValidityDays] = useState(
    String(settings.defaultQuoteValidityDays),
  );
  const [defaultQuoteNotes, setDefaultQuoteNotes] = useState(
    settings.defaultQuoteNotes ?? "",
  );
  const hasUnsavedChanges =
    defaultCurrency !== settings.defaultCurrency ||
    defaultQuoteValidityDays !== String(settings.defaultQuoteValidityDays) ||
    defaultQuoteNotes !== (settings.defaultQuoteNotes ?? "");
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);
  const quoteNotesPreview = defaultQuoteNotes.trim()
    ? defaultQuoteNotes.trim().slice(0, 140)
    : "No default quote notes.";

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();
  }, [router, state.success]);

  function handleCancelChanges() {
    setDefaultCurrency(settings.defaultCurrency);
    setDefaultQuoteValidityDays(String(settings.defaultQuoteValidityDays));
    setDefaultQuoteNotes(settings.defaultQuoteNotes ?? "");
  }

  return (
    <form action={formAction} className="form-stack pb-28">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not save the quote settings.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <CheckCircle2 data-icon="inline-start" />
          <AlertTitle>Quote settings saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <input name="defaultCurrency" type="hidden" value={defaultCurrency} />

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-7">
        <div className="self-start xl:sticky xl:top-6">
          <div className="soft-panel flex flex-col gap-5 p-5 shadow-none sm:p-6">
            <div className="space-y-2">
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Quote defaults
              </p>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Default quote setup
                </h2>
                <p className="text-sm text-muted-foreground">
                  Applied when you start a new quote.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border/75 bg-background/80 px-5 py-5">
              <div className="grid gap-4">
                <QuoteSummaryRow label="Currency" value={defaultCurrency} />
                <QuoteSummaryRow
                  label="Validity"
                  value={`${defaultQuoteValidityDays || "0"} days`}
                />
                <QuoteSummaryRow
                  label="Default notes"
                  value={defaultQuoteNotes.trim() ? "Included" : "Not set"}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border/75 bg-background/80 px-4 py-4">
              <p className="text-sm font-medium text-foreground">Current note preview</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {quoteNotesPreview}
                {defaultQuoteNotes.trim().length > 140 ? "..." : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="section-panel p-6">
            <FormSection
              description="Base values for new quotes."
              title="Defaults"
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
                <Field
                  data-invalid={Boolean(state.fieldErrors?.defaultCurrency) || undefined}
                >
                  <FieldLabel htmlFor="quote-settings-default-currency">
                    Default currency
                  </FieldLabel>
                  <FieldContent>
                    <Select
                      disabled={isPending}
                      onValueChange={setDefaultCurrency}
                      value={defaultCurrency}
                    >
                      <SelectTrigger
                        className="w-full"
                        id="quote-settings-default-currency"
                      >
                        <SelectValue placeholder="Choose a currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {businessCurrencyOptions.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldError
                      errors={
                        state.fieldErrors?.defaultCurrency?.[0]
                          ? [{ message: state.fieldErrors.defaultCurrency[0] }]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>

                <Field
                  data-invalid={
                    Boolean(state.fieldErrors?.defaultQuoteValidityDays) || undefined
                  }
                >
                  <FieldLabel htmlFor="quote-settings-validity-days">
                    Validity days
                  </FieldLabel>
                  <FieldContent>
                    <Input
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
                    <FieldError
                      errors={
                        state.fieldErrors?.defaultQuoteValidityDays?.[0]
                          ? [{ message: state.fieldErrors.defaultQuoteValidityDays[0] }]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
              </div>
            </FormSection>
          </section>

          <section className="section-panel p-6">
            <FormSection
              description="Added to new quotes by default."
              title="Default quote notes"
            >
              <Field data-invalid={Boolean(state.fieldErrors?.defaultQuoteNotes) || undefined}>
                <FieldLabel htmlFor="quote-settings-default-notes">
                  Quote notes
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    disabled={isPending}
                    id="quote-settings-default-notes"
                    maxLength={1600}
                    name="defaultQuoteNotes"
                    onChange={(event) => setDefaultQuoteNotes(event.currentTarget.value)}
                    rows={8}
                    value={defaultQuoteNotes}
                  />
                  <FieldError
                    errors={
                      state.fieldErrors?.defaultQuoteNotes?.[0]
                        ? [{ message: state.fieldErrors.defaultQuoteNotes[0] }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
            </FormSection>
          </section>
        </div>
      </div>

      <FloatingFormActions
        disableSubmit={!hasUnsavedChanges}
        isPending={isPending}
        message="You have unsaved quote default changes."
        onCancel={handleCancelChanges}
        state={floatingActionsState}
        submitLabel="Save quote defaults"
        submitPendingLabel="Saving quote defaults..."
        visible={shouldRenderFloatingActions}
      />
    </form>
  );
}

function QuoteSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-right text-xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
