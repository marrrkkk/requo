"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  FormActions,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultCurrency);

  return (
    <form action={formAction} className="form-stack">
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

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Quote defaults</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-0">
          <FormSection title="Defaults">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
              <Field
                data-invalid={Boolean(state.fieldErrors?.defaultCurrency) || undefined}
              >
                <FieldLabel htmlFor="quote-settings-default-currency">
                  Default currency
                </FieldLabel>
                <FieldContent>
                  <Select onValueChange={setDefaultCurrency} value={defaultCurrency}>
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
                    defaultValue={String(settings.defaultQuoteValidityDays)}
                    disabled={isPending}
                    id="quote-settings-validity-days"
                    inputMode="numeric"
                    max="365"
                    min="1"
                    name="defaultQuoteValidityDays"
                    required
                    step="1"
                    type="number"
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

          <FormSection title="Quote template">
            <Field data-invalid={Boolean(state.fieldErrors?.defaultQuoteNotes) || undefined}>
              <FieldLabel htmlFor="quote-settings-default-notes">
                Default quote content
              </FieldLabel>
              <FieldContent>
                <Textarea
                  defaultValue={settings.defaultQuoteNotes ?? ""}
                  disabled={isPending}
                  id="quote-settings-default-notes"
                  maxLength={1600}
                  name="defaultQuoteNotes"
                  rows={6}
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
        </CardContent>
      </Card>

      <div className="toolbar-panel">
        <FormActions align="between" className="pt-0">
          <Button disabled={isPending} size="lg" type="submit">
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Saving quote settings...
              </>
            ) : (
              "Save quote settings"
            )}
          </Button>
        </FormActions>
      </div>
    </form>
  );
}
