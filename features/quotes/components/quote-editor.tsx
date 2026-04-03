"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  DashboardMetaPill,
  DashboardSection,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { QuotePreview } from "@/features/quotes/components/quote-preview";
import type {
  QuoteEditorActionState,
  QuoteEditorLineItemValue,
  QuoteEditorValues,
  QuoteLinkedInquirySummary,
} from "@/features/quotes/types";
import {
  calculateQuoteEditorTotals,
  createQuoteEditorLineItem,
  formatQuoteMoney,
  parseCurrencyInputToCents,
} from "@/features/quotes/utils";

type QuoteEditorProps = {
  action: (
    state: QuoteEditorActionState,
    formData: FormData,
  ) => Promise<QuoteEditorActionState>;
  workspaceName: string;
  currency: string;
  initialValues: QuoteEditorValues;
  linkedInquiry: QuoteLinkedInquirySummary | null;
  quoteNumber?: string;
  submitLabel: string;
  submitPendingLabel: string;
};

const initialState: QuoteEditorActionState = {};

export function QuoteEditor({
  action,
  workspaceName,
  currency,
  initialValues,
  linkedInquiry,
  quoteNumber,
  submitLabel,
  submitPendingLabel,
}: QuoteEditorProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [customerName, setCustomerName] = useState(initialValues.customerName);
  const [customerEmail, setCustomerEmail] = useState(initialValues.customerEmail);
  const [notes, setNotes] = useState(initialValues.notes);
  const [validUntil, setValidUntil] = useState(initialValues.validUntil);
  const [discount, setDiscount] = useState(initialValues.discount);
  const [items, setItems] = useState<QuoteEditorLineItemValue[]>(
    initialValues.items,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const previewItems = items.map((item) => {
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
  const totals = calculateQuoteEditorTotals(items, discount);

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

  return (
    <form
      action={formAction}
      className="dashboard-detail-layout items-start xl:grid-cols-[minmax(0,1.08fr)_0.92fr]"
    >
      <input name="items" type="hidden" value={JSON.stringify(items)} />

      <DashboardSidebarStack className="min-w-0">
        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not save the quote.</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {state.success ? (
          <Alert>
            <AlertTitle>Quote saved</AlertTitle>
            <AlertDescription>{state.success}</AlertDescription>
          </Alert>
        ) : null}

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
          description="Customer, validity date, and notes."
          title="Quote details"
        >
          {linkedInquiry ? (
            <InfoTile
              label="Linked inquiry"
              value={linkedInquiry.serviceCategory}
              description={`${linkedInquiry.customerName} | ${linkedInquiry.customerEmail}`}
            />
          ) : null}

          <FieldGroup>
            <Field data-invalid={Boolean(state.fieldErrors?.title) || undefined}>
              <FieldLabel htmlFor="quote-title">Quote title</FieldLabel>
              <FieldContent>
                <Input
                  id="quote-title"
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.currentTarget.value)}
                  placeholder="Website design proposal, banner printing quote"
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
                    name="customerName"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.currentTarget.value)
                    }
                    placeholder="Jordan Rivera"
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
                    name="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(event) =>
                      setCustomerEmail(event.currentTarget.value)
                    }
                    placeholder="jordan@example.com"
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
                  <Input
                    id="quote-valid-until"
                    name="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.currentTarget.value)}
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
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setItems((currentItems) => [
                  ...currentItems,
                  createQuoteEditorLineItem(),
                ])
              }
              disabled={isPending}
            >
              <Plus data-icon="inline-start" />
              Add item
            </Button>
          }
          contentClassName="flex flex-col gap-5"
          description="Description, quantity, and unit price."
          title="Line items"
        >
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
                <div
                  className="soft-panel p-4"
                  key={item.id}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        Item {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(item.id)}
                        disabled={isPending || items.length === 1}
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
                            value={item.description}
                            onChange={(event) =>
                              updateItem(item.id, {
                                description: event.currentTarget.value,
                              })
                            }
                            placeholder="Logo concept package"
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
                              type="number"
                              min="1"
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
                              min="0"
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
          description="Auto-calculated while you edit line items and discount."
          footer={
            <>
              <p className="text-sm leading-6 text-muted-foreground sm:mr-auto">
                The preview updates live as you edit line items and notes.
              </p>
              <Button disabled={isPending} size="lg" type="submit">
                {isPending ? submitPendingLabel : submitLabel}
              </Button>
            </>
          }
          footerClassName="w-full sm:justify-between"
          title="Commercial summary"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-foreground">Totals</span>
              <span className="dashboard-meta-pill">
                Auto-calculated
              </span>
            </div>
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

      <QuotePreview
        workspaceName={workspaceName}
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
