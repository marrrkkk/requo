"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DashboardMetaPill,
  DashboardSection,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import {
  FloatingFormActions,
  useFloatingUnsavedChanges,
} from "@/components/shared/floating-form-actions";
import { InfoTile } from "@/components/shared/info-tile";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { QuoteLibrarySheet } from "@/features/quotes/components/quote-library-sheet";
import { QuotePreview } from "@/features/quotes/components/quote-preview";
import type {
  DashboardQuoteLibraryEntry,
  QuoteEditorActionState,
  QuoteEditorLineItemValue,
  QuoteEditorValues,
  QuoteLinkedInquirySummary,
} from "@/features/quotes/types";
import {
  calculateQuoteEditorTotals,
  createQuoteEditorLineItem,
  createQuoteEditorLineItemFromLibraryItem,
  formatQuoteMoney,
  isQuoteEditorLineItemBlank,
  parseCurrencyInputToCents,
} from "@/features/quotes/utils";
import { cn } from "@/lib/utils";

type QuoteEditorProps = {
  action: (
    state: QuoteEditorActionState,
    formData: FormData,
  ) => Promise<QuoteEditorActionState>;
  businessName: string;
  currency: string;
  initialValues: QuoteEditorValues;
  linkedInquiry: QuoteLinkedInquirySummary | null;
  pricingLibrary: DashboardQuoteLibraryEntry[];
  quoteNumber?: string;
  showFloatingUnsavedChanges?: boolean;
  submitLabel: string;
  submitPendingLabel: string;
};

const initialState: QuoteEditorActionState = {};
const LINE_ITEM_ENTER_DURATION_MS = 220;
const LINE_ITEM_EXIT_DURATION_MS = 180;

type EditorLineItem = QuoteEditorLineItemValue & {
  motionState?: "entering" | "exiting";
};

function cloneQuoteEditorValues(values: QuoteEditorValues): QuoteEditorValues {
  return {
    ...values,
    items: values.items.map((item) => ({ ...item })),
  };
}

function areQuoteEditorValuesEqual(
  left: QuoteEditorValues,
  right: QuoteEditorValues,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function QuoteEditor({
  action,
  businessName,
  currency,
  initialValues,
  linkedInquiry,
  pricingLibrary,
  quoteNumber,
  showFloatingUnsavedChanges = false,
  submitLabel,
  submitPendingLabel,
}: QuoteEditorProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [customerName, setCustomerName] = useState(initialValues.customerName);
  const [customerEmail, setCustomerEmail] = useState(initialValues.customerEmail);
  const [notes, setNotes] = useState(initialValues.notes);
  const [validUntil, setValidUntil] = useState(initialValues.validUntil);
  const [discount, setDiscount] = useState(initialValues.discount);
  const lineItemTimersRef = useRef<Map<string, number>>(new Map());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [items, setItems] = useState<EditorLineItem[]>(
    initialValues.items.map((item) => ({ ...item })),
  );
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const visibleItems = items.filter((item) => item.motionState !== "exiting");
  const [savedValues, setSavedValues] = useState(() =>
    cloneQuoteEditorValues(initialValues),
  );
  const submittedValuesRef = useRef<QuoteEditorValues>(
    cloneQuoteEditorValues(initialValues),
  );
  const serializedItems = visibleItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPriceInCents: item.unitPrice,
  }));
  const previewItems = visibleItems.map((item) => {
    const quantity = Number.parseInt(item.quantity.trim(), 10);
    const safeQuantity =
      Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    const unitPriceInCents = parseCurrencyInputToCents(item.unitPrice);

    return {
      id: item.id,
      description: item.description.trim(),
      quantity: safeQuantity,
      unitPriceInCents,
      lineTotalInCents: safeQuantity * unitPriceInCents,
    };
  });
  const totals = calculateQuoteEditorTotals(visibleItems, discount);
  const currentValues = useMemo<QuoteEditorValues>(
    () => ({
      title,
      customerName,
      customerEmail,
      notes,
      validUntil,
      discount,
      items: items
        .filter((item) => item.motionState !== "exiting")
        .map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    }),
    [customerEmail, customerName, discount, notes, title, validUntil, items],
  );
  const hasUnsavedChanges =
    showFloatingUnsavedChanges &&
    !areQuoteEditorValuesEqual(currentValues, savedValues);
  const { shouldRenderFloatingActions, floatingActionsState } =
    useFloatingUnsavedChanges(hasUnsavedChanges);
  const [state, formAction, isPending] = useActionState(
    async (prevState: QuoteEditorActionState, formData: FormData) => {
      const nextState = await action(prevState, formData);
      const firstFieldError = nextState.fieldErrors
        ? Object.values(nextState.fieldErrors).find((errors) => errors?.[0])?.[0]
        : undefined;

      if (nextState.success) {
        toast.success(nextState.success);
      }

       if (firstFieldError || nextState.error) {
        toast.error(firstFieldError ?? nextState.error ?? "Check the form and try again.");
      }

      if (nextState.success && showFloatingUnsavedChanges) {
        setSavedValues(cloneQuoteEditorValues(submittedValuesRef.current));
      }

      return nextState;
    },
    initialState,
  );

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

  function clearLineItemTimers() {
    const lineItemTimers = lineItemTimersRef.current;

    for (const timeoutId of lineItemTimers.values()) {
      window.clearTimeout(timeoutId);
    }

    lineItemTimers.clear();
  }

  function resetEditor(values: QuoteEditorValues) {
    clearLineItemTimers();
    setTitle(values.title);
    setCustomerName(values.customerName);
    setCustomerEmail(values.customerEmail);
    setNotes(values.notes);
    setValidUntil(values.validUntil);
    setDiscount(values.discount);
    setItems(values.items.map((item) => ({ ...item })));
  }

  function handleCancelChanges() {
    resetEditor(savedValues);
  }

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

  function insertPricingEntry(entry: DashboardQuoteLibraryEntry) {
    if (entry.currency !== currency) {
      return;
    }

    const copiedItems = entry.items.map((item) => ({
      ...createQuoteEditorLineItemFromLibraryItem(item),
      motionState: "entering" as const,
    }));

    for (const item of copiedItems) {
      scheduleItemEnter(item.id);
    }

    setItems((currentItems) => {
      const shouldReplacePlaceholder =
        visibleItems.length === 1 &&
        isQuoteEditorLineItemBlank(visibleItems[0]);

      return shouldReplacePlaceholder
        ? copiedItems
        : [...currentItems, ...copiedItems];
    });
    setIsLibraryOpen(false);
  }

  return (
    <form
      action={formAction}
      className={cn(
        "dashboard-detail-layout items-start xl:grid-cols-[minmax(0,1.08fr)_0.92fr]",
        shouldRenderFloatingActions && "pb-28",
      )}
      onSubmitCapture={() => {
        submittedValuesRef.current = cloneQuoteEditorValues(currentValues);
      }}
    >
      <input name="items" type="hidden" value={JSON.stringify(serializedItems)} />

      <DashboardSidebarStack className="min-w-0">
        <DashboardSection
          action={
            <>
              <DashboardMetaPill className="text-foreground">
                {quoteNumber ?? "Assigned on save"}
              </DashboardMetaPill>
              <DashboardMetaPill>{currency}</DashboardMetaPill>
            </>
          }
          contentClassName="flex flex-col gap-5"
          title="Quote details"
        >
          {linkedInquiry ? (
            <InfoTile
              label="Linked inquiry"
              value={linkedInquiry.serviceCategory}
              description={linkedInquiry.customerEmail}
            />
          ) : null}

          <FieldGroup>
            <Field data-invalid={Boolean(state.fieldErrors?.title) || undefined}>
              <FieldLabel htmlFor="quote-title">Quote title</FieldLabel>
              <FieldContent>
                <Input
                  id="quote-title"
                  maxLength={160}
                  minLength={2}
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.currentTarget.value)}
                  placeholder="Website design proposal, banner printing quote"
                  required
                  disabled={isPending}
                />
                <FieldError
                  errors={
                    state.fieldErrors?.title?.[0]
                      ? [{ message: state.fieldErrors.title[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                data-invalid={Boolean(state.fieldErrors?.customerName) || undefined}
              >
                <FieldLabel htmlFor="quote-customer-name">
                  Customer name
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="quote-customer-name"
                    maxLength={120}
                    minLength={2}
                    name="customerName"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.currentTarget.value)
                    }
                    placeholder="Jordan Rivera"
                    required
                    disabled={isPending}
                  />
                  <FieldError
                    errors={
                      state.fieldErrors?.customerName?.[0]
                        ? [{ message: state.fieldErrors.customerName[0] }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field
                data-invalid={Boolean(state.fieldErrors?.customerEmail) || undefined}
              >
                <FieldLabel htmlFor="quote-customer-email">
                  Customer email
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="quote-customer-email"
                    maxLength={320}
                    name="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(event) =>
                      setCustomerEmail(event.currentTarget.value)
                    }
                    placeholder="jordan@example.com"
                    required
                    disabled={isPending}
                  />
                  <FieldError
                    errors={
                      state.fieldErrors?.customerEmail?.[0]
                        ? [{ message: state.fieldErrors.customerEmail[0] }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <Field
                data-invalid={Boolean(state.fieldErrors?.validUntil) || undefined}
              >
                <FieldLabel htmlFor="quote-valid-until">
                  Valid until
                </FieldLabel>
                <FieldContent>
                  <DatePicker
                    id="quote-valid-until"
                    name="validUntil"
                    onChange={setValidUntil}
                    required
                    value={validUntil}
                    disabled={isPending}
                  />
                  <FieldError
                    errors={
                      state.fieldErrors?.validUntil?.[0]
                        ? [{ message: state.fieldErrors.validUntil[0] }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field
                data-invalid={Boolean(state.fieldErrors?.discount) || undefined}
              >
                <FieldLabel htmlFor="quote-discount">Discount</FieldLabel>
                <FieldContent>
                  <Input
                    id="quote-discount"
                    name="discount"
                    inputMode="decimal"
                    max="1000000"
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(event) => setDiscount(event.currentTarget.value)}
                    disabled={isPending}
                  />
                  <FieldError
                    errors={
                      state.fieldErrors?.discount?.[0]
                        ? [{ message: state.fieldErrors.discount[0] }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
            </div>

            <Field data-invalid={Boolean(state.fieldErrors?.notes) || undefined}>
              <FieldLabel htmlFor="quote-notes">Notes</FieldLabel>
              <FieldContent>
                <Textarea
                  id="quote-notes"
                  maxLength={4000}
                  name="notes"
                  rows={5}
                  value={notes}
                  onChange={(event) => setNotes(event.currentTarget.value)}
                  placeholder="Optional delivery notes, scope assumptions, or follow-up instructions."
                  disabled={isPending}
                />
                <FieldError
                  errors={
                    state.fieldErrors?.notes?.[0]
                      ? [{ message: state.fieldErrors.notes[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        </DashboardSection>

        <DashboardSection
          action={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLibraryOpen(true)}
                disabled={isPending}
              >
                Insert saved
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nextItem = {
                    ...createQuoteEditorLineItem(),
                    motionState: "entering" as const,
                  };

                  setItems((currentItems) => [...currentItems, nextItem]);
                  scheduleItemEnter(nextItem.id);
                }}
                disabled={isPending}
              >
                <Plus data-icon="inline-start" />
                Add item
              </Button>
            </>
          }
          contentClassName="flex flex-col gap-5"
          title="Line items"
        >
          <div className="flex flex-col gap-4">
            {items.map((item, index) => {
              const unitPriceInCents = parseCurrencyInputToCents(item.unitPrice);
              const quantity = Number.parseInt(item.quantity.trim(), 10);
              const safeQuantity =
                Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

              return (
                <div
                  className={cn(
                    "soft-panel p-5 motion-reduce:animate-none",
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
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-foreground">
                          Item {index + 1}
                        </p>
                        <span className="dashboard-meta-pill min-h-0 px-2.5 py-1 text-[0.7rem]">
                          Live total
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
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
                    </div>

                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor={`quote-item-description-${item.id}`}>
                          Description
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            id={`quote-item-description-${item.id}`}
                            maxLength={400}
                            value={item.description}
                            onChange={(event) =>
                              updateItem(item.id, {
                                description: event.currentTarget.value,
                              })
                            }
                            placeholder="Logo concept package"
                            required
                            disabled={isPending}
                          />
                        </FieldContent>
                      </Field>

                      <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
                        <Field>
                          <FieldLabel htmlFor={`quote-item-quantity-${item.id}`}>
                            Quantity
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              id={`quote-item-quantity-${item.id}`}
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
                          <FieldLabel htmlFor={`quote-item-price-${item.id}`}>
                            Unit price
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              id={`quote-item-price-${item.id}`}
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
        </DashboardSection>

        <DashboardSection
          contentClassName="flex flex-col gap-4"
          footer={
            showFloatingUnsavedChanges ? undefined : (
              <>
                <Button disabled={isPending} size="lg" type="submit">
                  {isPending ? (
                    <>
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                      {submitPendingLabel}
                    </>
                  ) : (
                    submitLabel
                  )}
                </Button>
              </>
            )
          }
          footerClassName="w-full sm:justify-between"
          title="Summary"
        >
          <div className="soft-panel flex flex-col gap-4 px-4 py-4 shadow-none">
            <span className="text-sm font-medium text-foreground">Totals</span>
            <div className="flex flex-col gap-3">
              <TotalsRow
                label="Subtotal"
                value={formatQuoteMoney(totals.subtotalInCents, currency)}
              />
              <TotalsRow
                label="Discount"
                value={`-${formatQuoteMoney(totals.discountInCents, currency)}`}
              />
              <Separator />
              <TotalsRow
                label="Total"
                value={formatQuoteMoney(totals.totalInCents, currency)}
                strong
              />
            </div>
          </div>
        </DashboardSection>
      </DashboardSidebarStack>

      <FloatingFormActions
        disableSubmit={!hasUnsavedChanges}
        isPending={isPending}
        message="You have unsaved quote changes."
        onCancel={handleCancelChanges}
        state={floatingActionsState}
        submitLabel={submitLabel}
        submitPendingLabel={submitPendingLabel}
        visible={shouldRenderFloatingActions}
      />

      <QuoteLibrarySheet
        currency={currency}
        entries={pricingLibrary}
        items={items}
        onInsert={insertPricingEntry}
        open={isLibraryOpen}
        onOpenChange={setIsLibraryOpen}
      />

      <QuotePreview
        businessName={businessName}
        quoteNumber={quoteNumber ?? "Assigned after save"}
        title={title || "Untitled quote"}
        customerName={customerName || "Customer name"}
        customerEmail={customerEmail || "customer@example.com"}
        currency={currency}
        validUntil={validUntil}
        notes={notes}
        items={previewItems}
        subtotalInCents={totals.subtotalInCents}
        discountInCents={totals.discountInCents}
        totalInCents={totals.totalInCents}
        className="xl:sticky xl:top-[5.5rem] xl:self-start"
      />
    </form>
  );
}

function TotalsRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-semibold" : "text-sm font-medium"}>
        {value}
      </span>
    </div>
  );
}
