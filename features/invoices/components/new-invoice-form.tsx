"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DashboardSection } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getBusinessInvoicePath, getBusinessInvoicesPath } from "@/features/businesses/routes";
import type { InvoiceActionState } from "@/features/invoices/types";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";

export type NewInvoiceQuoteSnapshot = {
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
  items: Array<{ description: string; quantity: number; unitPriceInCents: number }>;
};

type NewInvoiceFormProps = {
  action: (state: InvoiceActionState, formData: FormData) => Promise<InvoiceActionState>;
  businessSlug: string;
  currency: string;
  quote: NewInvoiceQuoteSnapshot | null;
};

type EditableLineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

const initialState: InvoiceActionState = {};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export function NewInvoiceForm({
  action,
  businessSlug,
  currency,
  quote,
}: NewInvoiceFormProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(action, initialState);
  const [rows, setRows] = useState<EditableLineItem[]>([{ description: "", quantity: "1", unitPrice: "0" }]);
  const [defaultIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [defaultDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));

  useEffect(() => {
    if (state.success && state.invoiceId) {
      router.replace(getBusinessInvoicePath(businessSlug, state.invoiceId));
    }
  }, [businessSlug, router, state.invoiceId, state.success]);

  const itemsError = state.fieldErrors?.items?.[0];
  const itemsJson = quote
    ? JSON.stringify(quote.items)
    : JSON.stringify(
        rows.map((row) => ({
          description: row.description,
          quantity: row.quantity,
          unitPriceInCents: row.unitPrice,
        })),
      );

  function updateRow(index: number, patch: Partial<EditableLineItem>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((current) => (current.length >= 100 ? current : [...current, { description: "", quantity: "1", unitPrice: "0" }]));
  }

  function removeRow(index: number) {
    setRows((current) => (current.length > 1 ? current.filter((_, rowIndex) => rowIndex !== index) : current));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="customerContactMethod" value={quote?.customerContactMethod ?? "email"} />
      <input type="hidden" name="customerContactHandle" value={quote?.customerContactHandle ?? ""} />
      <input type="hidden" name="items" value={itemsJson} />

      <DashboardSection title="Invoice details">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(state.fieldErrors?.title) || undefined}>
              <FieldLabel htmlFor="invoice-title">Title</FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(state.fieldErrors?.title) || undefined}
                  defaultValue={quote?.title ?? "Invoice"}
                  disabled={isPending}
                  id="invoice-title"
                  name="title"
                  required
                />
                <FieldError errors={state.fieldErrors?.title?.map((message) => ({ message }))} />
              </FieldContent>
            </Field>
            <Field data-invalid={Boolean(state.fieldErrors?.customerName) || undefined}>
              <FieldLabel htmlFor="invoice-customer">Customer name</FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(state.fieldErrors?.customerName) || undefined}
                  defaultValue={quote?.customerName ?? ""}
                  disabled={isPending}
                  id="invoice-customer"
                  name="customerName"
                  required
                />
                <FieldError errors={state.fieldErrors?.customerName?.map((message) => ({ message }))} />
              </FieldContent>
            </Field>
            <Field data-invalid={Boolean(state.fieldErrors?.customerEmail) || undefined}>
              <FieldLabel htmlFor="invoice-email">Customer email</FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(state.fieldErrors?.customerEmail) || undefined}
                  defaultValue={quote?.customerEmail ?? ""}
                  disabled={isPending}
                  id="invoice-email"
                  name="customerEmail"
                  type="email"
                />
                <FieldError errors={state.fieldErrors?.customerEmail?.map((message) => ({ message }))} />
              </FieldContent>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(state.fieldErrors?.issueDate) || undefined}>
              <FieldLabel htmlFor="invoice-issue">Issue date</FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(state.fieldErrors?.issueDate) || undefined}
                  defaultValue={defaultIssueDate}
                  disabled={isPending}
                  id="invoice-issue"
                  name="issueDate"
                  required
                  type="date"
                />
                <FieldError errors={state.fieldErrors?.issueDate?.map((message) => ({ message }))} />
              </FieldContent>
            </Field>
            <Field data-invalid={Boolean(state.fieldErrors?.dueDate) || undefined}>
              <FieldLabel htmlFor="invoice-due">Due date</FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(state.fieldErrors?.dueDate) || undefined}
                  defaultValue={defaultDueDate}
                  disabled={isPending}
                  id="invoice-due"
                  name="dueDate"
                  required
                  type="date"
                />
                <FieldError errors={state.fieldErrors?.dueDate?.map((message) => ({ message }))} />
              </FieldContent>
            </Field>
          </div>
        </FieldGroup>
      </DashboardSection>

      <DashboardSection
        description={
          quote
            ? `Copied from accepted quote ${quote.quoteNumber}. The invoice keeps its own snapshot.`
            : "What this invoice charges for."
        }
        title="Line items"
      >
        {quote ? (
          <div className="rounded-md border p-3 text-sm">
            {quote.items.map((item, index) => (
              <div className="flex items-center justify-between gap-3" key={`${item.description}-${index}`}>
                <span>
                  {item.description || "Line item"} × {item.quantity}
                </span>
                <span className="tabular-nums">{formatMoney(item.unitPriceInCents, currency)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row, index) => (
              <div className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]" key={`line-item-${index}`}>
                <Input
                  aria-label={`Line item ${index + 1} description`}
                  disabled={isPending}
                  onChange={(event) => updateRow(index, { description: event.target.value })}
                  placeholder="Description"
                  value={row.description}
                />
                <Input
                  aria-label={`Line item ${index + 1} quantity`}
                  disabled={isPending}
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => updateRow(index, { quantity: event.target.value })}
                  placeholder="Qty"
                  type="number"
                  value={row.quantity}
                />
                <Input
                  aria-label={`Line item ${index + 1} unit price`}
                  disabled={isPending}
                  inputMode="decimal"
                  onChange={(event) => updateRow(index, { unitPrice: event.target.value })}
                  placeholder="0.00"
                  value={row.unitPrice}
                />
                <Button disabled={isPending || rows.length <= 1} onClick={() => removeRow(index)} type="button" variant="ghost">
                  Remove
                </Button>
              </div>
            ))}
            <div>
              <Button disabled={isPending} onClick={addRow} type="button" variant="outline">
                Add line item
              </Button>
            </div>
          </div>
        )}
        {itemsError ? (
          <p className="text-sm text-destructive" role="alert">
            {itemsError}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(state.fieldErrors?.discountInCents) || undefined}>
            <FieldLabel htmlFor="invoice-discount">Discount</FieldLabel>
            <FieldContent>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.discountInCents) || undefined}
                defaultValue="0"
                disabled={isPending}
                id="invoice-discount"
                inputMode="decimal"
                name="discount"
              />
              <FieldError errors={state.fieldErrors?.discountInCents?.map((message) => ({ message }))} />
            </FieldContent>
          </Field>
          <Field data-invalid={Boolean(state.fieldErrors?.taxInCents) || undefined}>
            <FieldLabel htmlFor="invoice-tax">Tax</FieldLabel>
            <FieldContent>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.taxInCents) || undefined}
                defaultValue="0"
                disabled={isPending}
                id="invoice-tax"
                inputMode="decimal"
                name="tax"
              />
              <FieldError errors={state.fieldErrors?.taxInCents?.map((message) => ({ message }))} />
            </FieldContent>
          </Field>
        </div>
      </DashboardSection>

      <DashboardSection title="Notes and terms">
        <div className="grid gap-4">
          <Textarea disabled={isPending} name="notes" placeholder="Optional notes" />
          <Textarea disabled={isPending} name="paymentTerms" placeholder="Payment terms, for example: due within 14 days." />
        </div>
      </DashboardSection>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href={getBusinessInvoicesPath(businessSlug)}>Cancel</Link>
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? (
            <>
              <Spinner aria-hidden="true" data-icon="inline-start" />
              Creating...
            </>
          ) : (
            "Create invoice"
          )}
        </Button>
      </div>
    </form>
  );
}
