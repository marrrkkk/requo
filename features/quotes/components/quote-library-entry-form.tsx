"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  FormActions,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  QuoteEditorLineItemValue,
  QuoteLibraryActionState,
  QuoteLibraryEditorValues,
} from "@/features/quotes/types";
import {
  calculateQuoteEditorTotals,
  createQuoteEditorLineItem,
  createQuoteEditorLineItemValue,
  formatQuoteMoney,
  getQuoteLibraryEntryKindLabel,
  parseCurrencyInputToCents,
} from "@/features/quotes/utils";

type QuoteLibraryEntryFormProps = {
  action: (
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
  currency: string;
  initialValues?: QuoteLibraryEditorValues;
  submitLabel: string;
  submitPendingLabel: string;
  onSuccess?: () => void;
  idPrefix?: string;
};

const initialState: QuoteLibraryActionState = {};

export function QuoteLibraryEntryForm({
  action,
  currency,
  initialValues,
  submitLabel,
  submitPendingLabel,
  onSuccess,
  idPrefix = "quote-library-entry",
}: QuoteLibraryEntryFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onSuccess?.();
    router.refresh();
  }, [initialValues, onSuccess, router, state.success]);

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not save the pricing entry.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <AlertTitle>Pricing entry saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <QuoteLibraryEntryFormFields
        key={initialValues ? idPrefix : state.success ?? "quote-library-create"}
        currency={currency}
        idPrefix={idPrefix}
        initialValues={initialValues}
        isPending={isPending}
        state={state}
        submitLabel={submitLabel}
        submitPendingLabel={submitPendingLabel}
      />
    </form>
  );
}

function QuoteLibraryEntryFormFields({
  currency,
  idPrefix,
  initialValues,
  isPending,
  state,
  submitLabel,
  submitPendingLabel,
}: {
  currency: string;
  idPrefix: string;
  initialValues?: QuoteLibraryEditorValues;
  isPending: boolean;
  state: QuoteLibraryActionState;
  submitLabel: string;
  submitPendingLabel: string;
}) {
  const stableItemSeed = useId().replace(/:/g, "");
  const [kind, setKind] = useState(initialValues?.kind ?? "block");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [items, setItems] = useState<QuoteEditorLineItemValue[]>(() =>
    initialValues?.items.length
      ? initialValues.items
      : [
          createQuoteEditorLineItemValue({
            id: `draft_item_${stableItemSeed}`,
          }),
        ],
  );
  const totals = calculateQuoteEditorTotals(items, "");
  const serializedItems = items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPriceInCents: item.unitPrice,
  }));

  function updateItem(
    itemId: string,
    patch: Partial<QuoteEditorLineItemValue>,
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(itemId: string) {
    setItems((currentItems) =>
      currentItems.length === 1
        ? currentItems
        : currentItems.filter((item) => item.id !== itemId),
    );
  }

  function handleKindChange(nextKind: "block" | "package") {
    setKind(nextKind);
    setItems((currentItems) => {
      if (nextKind === "block") {
        return [currentItems[0] ?? createQuoteEditorLineItem()];
      }

      return currentItems.length ? currentItems : [createQuoteEditorLineItem()];
    });
  }

  return (
    <>
      <input name="kind" type="hidden" value={kind} />
      <input name="items" type="hidden" value={JSON.stringify(serializedItems)} />

      <FieldGroup>
        <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <Field data-invalid={Boolean(state.fieldErrors?.kind) || undefined}>
            <FieldLabel htmlFor={`${idPrefix}-kind`}>Entry type</FieldLabel>
            <FieldContent>
              <Select onValueChange={handleKindChange} value={kind}>
                <SelectTrigger className="w-full" id={`${idPrefix}-kind`}>
                  <SelectValue placeholder="Choose an entry type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="block">
                      {getQuoteLibraryEntryKindLabel("block")}
                    </SelectItem>
                    <SelectItem value="package">
                      {getQuoteLibraryEntryKindLabel("package")}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError
                errors={
                  state.fieldErrors?.kind?.[0]
                    ? [{ message: state.fieldErrors.kind[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(state.fieldErrors?.name) || undefined}>
            <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
            <FieldContent>
              <Input
                id={`${idPrefix}-name`}
                maxLength={120}
                minLength={2}
                name="name"
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="Standard window vinyl install"
                required
                aria-invalid={Boolean(state.fieldErrors?.name) || undefined}
                disabled={isPending}
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
        </div>

        <Field data-invalid={Boolean(state.fieldErrors?.description) || undefined}>
          <FieldLabel htmlFor={`${idPrefix}-description`}>
            Internal description
          </FieldLabel>
          <FieldContent>
            <Textarea
              id={`${idPrefix}-description`}
              maxLength={600}
              name="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              placeholder="Optional note about when this pricing entry is the right fit."
              aria-invalid={Boolean(state.fieldErrors?.description) || undefined}
              disabled={isPending}
            />
            <FieldError
              errors={
                state.fieldErrors?.description?.[0]
                  ? [{ message: state.fieldErrors.description[0] }]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Line items</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {kind === "block"
                ? "Save one reusable line item."
                : "Packages can include up to 25 line items."}
            </p>
          </div>
          {kind === "package" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setItems((currentItems) => [
                  ...currentItems,
                  createQuoteEditorLineItem(),
                ])
              }
              disabled={isPending || items.length >= 25}
            >
              <Plus data-icon="inline-start" />
              Add item
            </Button>
          ) : null}
        </div>

        {state.fieldErrors?.items?.[0] ? (
          <Alert variant="destructive">
            <AlertTitle>Check the line items.</AlertTitle>
            <AlertDescription>{state.fieldErrors.items[0]}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-4">
          {items.map((item, index) => {
            const unitPriceInCents = parseCurrencyInputToCents(item.unitPrice);
            const quantity = Number.parseInt(item.quantity.trim(), 10);
            const safeQuantity =
              Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

            return (
              <div className="soft-panel p-5" key={item.id}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-foreground">
                        Item {index + 1}
                      </p>
                      <span className="dashboard-meta-pill min-h-0 px-2.5 py-1 text-[0.7rem]">
                        {formatQuoteMoney(
                          safeQuantity * unitPriceInCents,
                          currency,
                        )}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => removeItem(item.id)}
                      disabled={
                        isPending ||
                        items.length === 1 ||
                        kind === "block"
                      }
                    >
                      <Trash2 data-icon="inline-start" />
                      <span className="sr-only">Remove line item</span>
                    </Button>
                  </div>

                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor={`${idPrefix}-description-${item.id}`}>
                        Description
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id={`${idPrefix}-description-${item.id}`}
                          maxLength={400}
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, {
                              description: event.currentTarget.value,
                            })
                          }
                          placeholder="Window vinyl production"
                          required
                          disabled={isPending}
                        />
                      </FieldContent>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
                      <Field>
                        <FieldLabel htmlFor={`${idPrefix}-quantity-${item.id}`}>
                          Quantity
                        </FieldLabel>
                        <FieldContent>
                            <Input
                              id={`${idPrefix}-quantity-${item.id}`}
                              inputMode="numeric"
                              max="999999999"
                              type="number"
                              min="1"
                              required
                              step="1"
                              value={item.quantity}
                            onChange={(event) =>
                              updateItem(item.id, {
                                quantity: event.currentTarget.value,
                              })
                            }
                            disabled={isPending}
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor={`${idPrefix}-price-${item.id}`}>
                          Unit price
                        </FieldLabel>
                        <FieldContent>
                            <Input
                              id={`${idPrefix}-price-${item.id}`}
                              inputMode="decimal"
                              type="number"
                              max="1000000"
                              min="0"
                              required
                              step="0.01"
                            value={item.unitPrice}
                            onChange={(event) =>
                              updateItem(item.id, {
                                unitPrice: event.currentTarget.value,
                              })
                            }
                            placeholder="0.00"
                            disabled={isPending}
                          />
                        </FieldContent>
                      </Field>

                      <div className="info-tile bg-muted/20 px-4 py-3 shadow-none">
                        <p className="meta-label">Line total</p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {formatQuoteMoney(
                            safeQuantity * unitPriceInCents,
                            currency,
                          )}
                        </p>
                      </div>
                    </div>
                  </FieldGroup>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="soft-panel flex flex-col gap-3 px-4 py-4 shadow-none">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground">Saved total</span>
          <span className="dashboard-meta-pill">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-sm font-semibold text-foreground">
            {formatQuoteMoney(totals.totalInCents, currency)}
          </span>
        </div>
      </div>

      <FormActions>
        <Button disabled={isPending} type="submit">
          {isPending ? submitPendingLabel : submitLabel}
        </Button>
      </FormActions>
    </>
  );
}
