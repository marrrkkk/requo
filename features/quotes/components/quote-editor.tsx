"use client";

import dynamic from "next/dynamic";
import {
  useActionState,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  inquiryContactMethods,
  inquiryContactMethodLabels,
  type InquiryContactMethod,
} from "@/features/inquiries/form-config";
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
  centsToMoneyInput,
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
const LazyQuoteLibrarySheet = dynamic(() =>
  import("@/features/quotes/components/quote-library-sheet").then(
    (module) => module.QuoteLibrarySheet,
  ),
);

type EditorLineItem = QuoteEditorLineItemValue & {
  motionState?: "entering" | "exiting";
};

function cloneQuoteEditorValues(values: QuoteEditorValues): QuoteEditorValues {
  return {
    ...values,
    items: values.items.map((item) => ({ ...item })),
  };
}

function normalizeQuoteEditorValues(values: QuoteEditorValues): QuoteEditorValues {
  const clonedValues = cloneQuoteEditorValues(values);

  return {
    ...clonedValues,
    customerEmail: getEffectiveCustomerEmail({
      customerEmail: clonedValues.customerEmail ?? "",
      customerContactMethod: clonedValues.customerContactMethod,
      customerContactHandle: clonedValues.customerContactHandle,
    }),
  };
}

function areQuoteEditorValuesEqual(
  left: QuoteEditorValues,
  right: QuoteEditorValues,
) {
  if (
    left.title !== right.title ||
    left.customerName !== right.customerName ||
    (left.customerEmail ?? "") !== (right.customerEmail ?? "") ||
    left.customerContactMethod !== right.customerContactMethod ||
    left.customerContactHandle !== right.customerContactHandle ||
    left.notes !== right.notes ||
    left.validUntil !== right.validUntil ||
    left.discount !== right.discount ||
    left.discountType !== right.discountType ||
    left.items.length !== right.items.length
  ) {
    return false;
  }

  for (let index = 0; index < left.items.length; index += 1) {
    const leftItem = left.items[index];
    const rightItem = right.items[index];

    if (
      leftItem.id !== rightItem.id ||
      leftItem.description !== rightItem.description ||
      leftItem.quantity !== rightItem.quantity ||
      leftItem.unitPrice !== rightItem.unitPrice
    ) {
      return false;
    }
  }

  return true;
}

function getVisibleEditorItems(items: EditorLineItem[]): QuoteEditorLineItemValue[] {
  return items
    .filter((item) => item.motionState !== "exiting")
    .map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
}

function getQuotePreviewItems(items: QuoteEditorLineItemValue[]) {
  return items.map((item) => {
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
  const [customerEmail, setCustomerEmail] = useState(initialValues.customerEmail ?? "");
  const [customerContactMethod, setCustomerContactMethod] = useState(initialValues.customerContactMethod);
  const [customerContactHandle, setCustomerContactHandle] = useState(initialValues.customerContactHandle);
  const [notes, setNotes] = useState(initialValues.notes);
  const [validUntil, setValidUntil] = useState(initialValues.validUntil);
  const [discount, setDiscount] = useState(initialValues.discount);
  const [discountType, setDiscountType] = useState(initialValues.discountType);
  const lineItemTimersRef = useRef<Map<string, number>>(new Map());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [items, setItems] = useState<EditorLineItem[]>(
    initialValues.items.map((item) => ({ ...item })),
  );
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [hasLoadedLibrary, setHasLoadedLibrary] = useState(false);
  const [savedValues, setSavedValues] = useState(() =>
    normalizeQuoteEditorValues(initialValues),
  );
  const submittedValuesRef = useRef<QuoteEditorValues>(
    normalizeQuoteEditorValues(initialValues),
  );
  const visibleItems = useMemo(() => getVisibleEditorItems(items), [items]);
  const deferredVisibleItems = useDeferredValue(visibleItems);
  const deferredDiscount = useDeferredValue(discount);
  const deferredDiscountType = useDeferredValue(discountType);
  const serializedItems = useMemo(
    () =>
      visibleItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPriceInCents: item.unitPrice,
      })),
    [visibleItems],
  );
  const previewItems = useMemo(
    () => getQuotePreviewItems(deferredVisibleItems),
    [deferredVisibleItems],
  );
  const totals = useMemo(
    () => calculateQuoteEditorTotals(deferredVisibleItems, deferredDiscount, deferredDiscountType),
    [deferredDiscount, deferredDiscountType, deferredVisibleItems],
  );
  const currentValues = useMemo<QuoteEditorValues>(
    () => ({
      title,
      customerName,
      customerEmail: getEffectiveCustomerEmail({
        customerEmail,
        customerContactMethod,
        customerContactHandle,
      }),
      customerContactMethod,
      customerContactHandle,
      notes,
      validUntil,
      discount,
      discountType,
      items: visibleItems,
    }),
    [customerEmail, customerContactMethod, customerContactHandle, customerName, discount, discountType, notes, title, validUntil, visibleItems],
  );
  const effectiveCustomerEmail = currentValues.customerEmail;
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
    setCustomerEmail(values.customerEmail ?? "");
    setCustomerContactMethod(values.customerContactMethod);
    setCustomerContactHandle(values.customerContactHandle);
    setNotes(values.notes);
    setValidUntil(values.validUntil);
    setDiscount(values.discount);
    setDiscountType(values.discountType);
    setItems(values.items.map((item) => ({ ...item })));
  }

  function handleCancelChanges() {
    resetEditor(savedValues);
  }

  function handleLibraryOpenChange(open: boolean) {
    if (open) {
      setHasLoadedLibrary(true);
    }

    setIsLibraryOpen(open);
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
      <input name="customerEmail" type="hidden" value={effectiveCustomerEmail ?? ""} />

      <DashboardSidebarStack className="min-w-0">
        <DashboardSection
          action={
            <>
              {quoteNumber ? (
                <DashboardMetaPill className="text-foreground">
                  {quoteNumber}
                </DashboardMetaPill>
              ) : null}
              <DashboardMetaPill>{currency}</DashboardMetaPill>
            </>
          }
          contentClassName="flex flex-col gap-5"
          description="Set the customer, quote title, validity date, and customer-facing notes."
          title="Customer and quote details"
        >
          {linkedInquiry ? (
            <InfoTile
              label="Linked inquiry"
              value={linkedInquiry.serviceCategory}
              description={
                linkedInquiry.customerEmail ?? linkedInquiry.customerContactHandle
              }
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

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.5fr]">
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
                data-invalid={
                  Boolean(state.fieldErrors?.customerContactMethod) || undefined
                }
              >
                <FieldLabel htmlFor="quote-customer-contact-method">
                  Preferred channel
                </FieldLabel>
                <FieldContent>
                  <input type="hidden" name="customerContactMethod" value={customerContactMethod} />
                  <Combobox
                    disabled={isPending}
                    id="quote-customer-contact-method"
                    onValueChange={(value) => {
                      if (value) {
                        setCustomerContactMethod(value as InquiryContactMethod);
                      }
                    }}
                    options={inquiryContactMethods.map((method) => ({
                      label: inquiryContactMethodLabels[method],
                      value: method,
                    }))}
                    placeholder="Select..."
                    value={customerContactMethod}
                  />
                  <FieldError
                    errors={
                      state.fieldErrors?.customerContactMethod?.[0]
                        ? [{ message: state.fieldErrors.customerContactMethod[0] }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field
                data-invalid={
                  Boolean(state.fieldErrors?.customerContactHandle) || undefined
                }
              >
                <FieldLabel htmlFor="quote-customer-contact-handle">
                  {getQuoteContactHandleLabel(customerContactMethod)}
                </FieldLabel>
                <FieldContent>
                  <Input
                    key={customerContactMethod} // Force re-render on method change
                    disabled={isPending}
                    id="quote-customer-contact-handle"
                    maxLength={320}
                    name="customerContactHandle"
                    type={customerContactMethod === "email" ? "email" : "text"}
                    autoComplete={customerContactMethod === "email" ? "email" : "off"}
                    inputMode={customerContactMethod === "phone" || customerContactMethod === "whatsapp" ? "tel" : "text"}
                    placeholder={
                      customerContactMethod === "email"
                        ? "jordan@example.com"
                        : customerContactMethod === "phone" || customerContactMethod === "whatsapp"
                          ? "+1 (555) 000-0000"
                          : customerContactMethod === "facebook"
                            ? "facebook.com/username"
                            : customerContactMethod === "instagram"
                              ? "@username"
                              : "Details"
                    }
                    required
                    value={customerContactHandle}
                    onChange={(event) =>
                      setCustomerContactHandle(event.currentTarget.value)
                    }
                  />
                  <FieldError
                    errors={
                      state.fieldErrors?.customerContactHandle?.[0]
                        ? [{ message: state.fieldErrors.customerContactHandle[0] }]
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
                  <input
                    name="discount"
                    type="hidden"
                    value={centsToMoneyInput(totals.discountInCents)}
                  />
                  <div className="relative">
                    <Input
                      id="quote-discount"
                      className="pr-14"
                      inputMode="decimal"
                      max={discountType === "percentage" ? "100" : "1000000"}
                      placeholder={discountType === "percentage" ? "10" : "0.00"}
                      type="number"
                      min="0"
                      step={discountType === "percentage" ? "1" : "0.01"}
                      value={discount}
                      onChange={(event) => setDiscount(event.currentTarget.value)}
                      disabled={isPending}
                    />
                    <div className="absolute inset-y-1 right-1 flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setDiscountType((prev) =>
                            prev === "percentage" ? "amount" : "percentage",
                          )
                        }
                        className="flex h-full w-10 items-center justify-center rounded bg-muted/60 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Toggle discount type"
                      >
                        {discountType === "percentage"
                          ? "%"
                          : currency === "USD"
                            ? "$"
                            : currency}
                      </button>
                    </div>
                  </div>
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
                onClick={() => handleLibraryOpenChange(true)}
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
          description="Add priced rows. The preview and totals update while you edit."
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
                      <p className="text-sm font-medium text-foreground">
                        Item {index + 1}
                      </p>
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
          title="Totals"
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

      {hasLoadedLibrary ? (
        <LazyQuoteLibrarySheet
          currency={currency}
          entries={pricingLibrary}
          items={items}
          onInsert={insertPricingEntry}
          open={isLibraryOpen}
          onOpenChange={handleLibraryOpenChange}
        />
      ) : null}

      <QuotePreview
        businessName={businessName}
        quoteNumber={quoteNumber ?? "Assigned after save"}
        title={title || "Untitled quote"}
        customerName={customerName || "Customer name"}
        customerEmail={effectiveCustomerEmail}
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

function getEffectiveCustomerEmail({
  customerEmail,
  customerContactMethod,
  customerContactHandle,
}: {
  customerEmail: string;
  customerContactMethod: string;
  customerContactHandle: string;
}) {
  const contactHandle = customerContactHandle.trim();

  if (customerContactMethod.trim().toLowerCase() === "email") {
    return contactHandle || null;
  }

  return customerEmail.trim() || null;
}

function getQuoteContactHandleLabel(method: string) {
  const normalized = method.trim().toLowerCase();

  if (normalized in inquiryContactMethodLabels) {
    return inquiryContactMethodLabels[normalized as InquiryContactMethod];
  }

  return "Contact details";
}
