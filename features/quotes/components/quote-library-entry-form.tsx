"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { FormActions } from "@/components/shared/form-layout";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { useActionStateWithSuccessToast } from "@/hooks/use-action-state-with-success-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type {
  QuoteEditorLineItemValue,
  QuoteLibraryActionState,
  QuoteLibraryEditorValues,
  QuoteLibraryEntryKind,
} from "@/features/quotes/types";
import {
  createQuoteEditorLineItem,
  createQuoteEditorLineItemValue,
  getQuoteLibraryEntryKindLabel,
} from "@/features/quotes/utils";
import { cn } from "@/lib/utils";

type QuoteLibraryEntryFormProps = {
  action: (
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
  fixedKind?: QuoteLibraryEntryKind;
  initialValues?: QuoteLibraryEditorValues;
  submitLabel: string;
  submitPendingLabel: string;
  onSuccess?: () => void;
  idPrefix?: string;
};

const initialState: QuoteLibraryActionState = {};
const LINE_ITEM_ENTER_DURATION_MS = 220;
const LINE_ITEM_EXIT_DURATION_MS = 180;
const SAVE_REFRESH_DELAY_MS = 180;
const quoteLibraryKindOptions = [
  {
    label: getQuoteLibraryEntryKindLabel("block"),
    value: "block",
  },
  {
    label: getQuoteLibraryEntryKindLabel("package"),
    value: "package",
  },
];

type EditorLineItem = QuoteEditorLineItemValue & {
  motionState?: "entering" | "exiting";
};

export function QuoteLibraryEntryForm({
  action,
  fixedKind,
  initialValues,
  submitLabel,
  submitPendingLabel,
  onSuccess,
  idPrefix = "quote-library-entry",
}: QuoteLibraryEntryFormProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSuccessToast(
    action,
    initialState,
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onSuccess?.();

    const refreshDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : SAVE_REFRESH_DELAY_MS;
    const timeoutId = window.setTimeout(() => {
      router.refresh();
    }, refreshDelay);

    return () => window.clearTimeout(timeoutId);
  }, [onSuccess, router, state.success]);

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert className="motion-pop-in" variant="destructive">
          <AlertTitle>We could not save the pricing entry.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <QuoteLibraryEntryFormFields
        key={initialValues ? idPrefix : state.success ?? "quote-library-create"}
        fixedKind={fixedKind}
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
  fixedKind,
  idPrefix,
  initialValues,
  isPending,
  state,
  submitLabel,
  submitPendingLabel,
}: {
  fixedKind?: QuoteLibraryEntryKind;
  idPrefix: string;
  initialValues?: QuoteLibraryEditorValues;
  isPending: boolean;
  state: QuoteLibraryActionState;
  submitLabel: string;
  submitPendingLabel: string;
}) {
  const stableItemSeed = useId().replace(/:/g, "");
  const [kind, setKind] = useState(initialValues?.kind ?? fixedKind ?? "block");
  const [name, setName] = useState(initialValues?.name ?? "");
  const lineItemTimersRef = useRef<Map<string, number>>(new Map());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [items, setItems] = useState<EditorLineItem[]>(() =>
    initialValues?.items.length
      ? initialValues.items.map((item) => ({ ...item }))
      : [
          {
            ...createQuoteEditorLineItemValue({
              id: `draft_item_${stableItemSeed}`,
            }),
          },
        ],
  );
  const visibleItems = items.filter((item) => item.motionState !== "exiting");
  const serializedItems = visibleItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPriceInCents: item.unitPrice,
  }));

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const lineItemTimers = lineItemTimersRef.current;

    return () => {
      for (const timeoutId of lineItemTimers.values()) {
        window.clearTimeout(timeoutId);
      }

      lineItemTimers.clear();
    };
  }, []);

  function scheduleLineItemTimeout(
    itemId: string,
    callback: () => void,
    duration: number,
  ) {
    const lineItemTimers = lineItemTimersRef.current;
    const existingTimer = lineItemTimers.get(itemId);

    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timeoutId = window.setTimeout(() => {
      callback();
      lineItemTimers.delete(itemId);
    }, prefersReducedMotion ? 0 : duration);

    lineItemTimers.set(itemId, timeoutId);
  }

  function scheduleItemEnter(itemId: string) {
    scheduleLineItemTimeout(
      itemId,
      () =>
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === itemId ? { ...item, motionState: undefined } : item,
          ),
        ),
      LINE_ITEM_ENTER_DURATION_MS,
    );
  }

  function updateItem(
    itemId: string,
    patch: Partial<EditorLineItem>,
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(itemId: string) {
    if (visibleItems.length === 1) {
      return;
    }

    const currentItem = items.find((item) => item.id === itemId);

    if (!currentItem || currentItem.motionState === "exiting") {
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, motionState: "exiting" } : item,
      ),
    );

    scheduleLineItemTimeout(
      itemId,
      () =>
        setItems((currentItems) =>
          currentItems.filter((item) => item.id !== itemId),
        ),
      LINE_ITEM_EXIT_DURATION_MS,
    );
  }

  function addItem() {
    const nextItem = {
      ...createQuoteEditorLineItem(),
      motionState: "entering" as const,
    };

    setItems((currentItems) => [...currentItems, nextItem]);
    scheduleItemEnter(nextItem.id);
  }

  function handleKindChange(nextKind: "block" | "package") {
    setKind(nextKind);

    if (nextKind === "block") {
      for (const timeoutId of lineItemTimersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }

      lineItemTimersRef.current.clear();
    }

    setItems((currentItems) => {
      const activeItems = currentItems.filter(
        (item) => item.motionState !== "exiting",
      );

      if (nextKind === "block") {
        return [{ ...(activeItems[0] ?? createQuoteEditorLineItem()) }];
      }

      return activeItems.length
        ? activeItems
        : [{ ...createQuoteEditorLineItem() }];
    });
  }

  return (
    <>
      <input name="kind" type="hidden" value={kind} />
      <input name="description" type="hidden" value="" />
      <input name="items" type="hidden" value={JSON.stringify(serializedItems)} />

      <div className="grid gap-5">
        <div
          className={
            fixedKind ? "grid gap-5" : "grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]"
          }
        >
          {fixedKind ? null : (
            <Field data-invalid={Boolean(state.fieldErrors?.kind) || undefined}>
              <FieldLabel htmlFor={`${idPrefix}-kind`}>Entry type</FieldLabel>
              <FieldContent>
                <Combobox
                  aria-invalid={Boolean(state.fieldErrors?.kind) || undefined}
                  disabled={isPending}
                  id={`${idPrefix}-kind`}
                  onValueChange={(value) =>
                    handleKindChange(value as "block" | "package")
                  }
                  options={quoteLibraryKindOptions}
                  placeholder="Choose an entry type"
                  searchPlaceholder="Search entry type"
                  value={kind}
                />
                <FieldError
                  errors={
                    state.fieldErrors?.kind?.[0]
                      ? [{ message: state.fieldErrors.kind[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          )}
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
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            {kind === "block" ? "Saved item" : "Saved items"}
          </p>
          {kind === "package" ? (
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={isPending || visibleItems.length >= 25}
            >
              <Plus data-icon="inline-start" />
              Add item
            </Button>
          ) : null}
        </div>

        {state.fieldErrors?.items?.[0] ? (
          <Alert className="motion-pop-in" variant="destructive">
            <AlertTitle>Check the line items.</AlertTitle>
            <AlertDescription>{state.fieldErrors.items[0]}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-4">
          {items.map((item, index) => {
            return (
              <div
                className={cn(
                  "rounded-2xl border border-border/70 bg-background/80 p-4 motion-reduce:animate-none",
                  item.motionState === "entering" &&
                    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200",
                  item.motionState === "exiting" &&
                    "pointer-events-none motion-safe:animate-out motion-safe:fade-out-0 motion-safe:slide-out-to-bottom-2 motion-safe:duration-150",
                )}
                data-motion-state={item.motionState}
                key={item.id}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    {kind === "package" ? (
                      <>
                        <p className="text-sm font-medium text-foreground">
                          Item {index + 1}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeItem(item.id)}
                          disabled={
                            isPending ||
                            visibleItems.length === 1 ||
                            item.motionState === "exiting"
                          }
                        >
                          <Trash2 data-icon="inline-start" />
                          <span className="sr-only">Remove line item</span>
                        </Button>
                      </>
                    ) : null}
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
                    </div>
                  </FieldGroup>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FormActions>
        <Button disabled={isPending} type="submit">
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              {submitPendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </FormActions>
    </>
  );
}
