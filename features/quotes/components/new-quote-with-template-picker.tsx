"use client";

import { useState } from "react";

import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { QuoteTemplatePicker } from "@/features/quotes/components/quote-template-picker";
import { applyTemplateToQuoteForm } from "@/features/quotes/utils";
import type {
  DashboardQuoteLibraryEntry,
  QuoteEditorValues,
} from "@/features/quotes/types";
import type { QuoteEditorProps } from "@/features/quotes/components/quote-editor/types";

type NewQuoteWithTemplatePickerProps = Omit<QuoteEditorProps, "initialValues"> & {
  baseInitialValues: QuoteEditorValues;
  templates: DashboardQuoteLibraryEntry[];
};

export function NewQuoteWithTemplatePicker({
  baseInitialValues,
  templates,
  businessDefaults,
  ...editorProps
}: NewQuoteWithTemplatePickerProps) {
  const [pickerDismissed, setPickerDismissed] = useState(false);
  const [initialValues, setInitialValues] =
    useState<QuoteEditorValues>(baseInitialValues);
  const [editorKey, setEditorKey] = useState("manual");

  const compatibleTemplates = templates.filter(
    (t) => t.currency === editorProps.currency,
  );
  const showPicker = !pickerDismissed && compatibleTemplates.length > 0;

  function handleSelectTemplate(template: DashboardQuoteLibraryEntry) {
    if (!template.title || !template.validityDays) return;

    const applied = applyTemplateToQuoteForm(
      {
        title: template.title,
        notes: template.notes,
        terms: template.terms,
        validityDays: template.validityDays,
        items: template.items.map((item) => ({
          id: crypto.randomUUID(),
          description: item.description,
          quantity: item.quantity,
          unitPriceInCents: item.unitPriceInCents,
        })),
      },
      businessDefaults,
    );

    setInitialValues({
      ...baseInitialValues,
      title: applied.title,
      notes: applied.notes,
      terms: applied.terms,
      validUntil: applied.validUntil,
      items: applied.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String((item.unitPriceInCents / 100).toFixed(2)),
      })),
    });
    setEditorKey(`template-${template.id}`);
    setPickerDismissed(true);
  }

  function handleStartFromScratch() {
    setPickerDismissed(true);
  }

  return (
    <>
      {showPicker ? (
        <QuoteTemplatePicker
          templates={compatibleTemplates}
          currency={editorProps.currency}
          onSelect={handleSelectTemplate}
          onStartFromScratch={handleStartFromScratch}
        />
      ) : null}

      <QuoteEditor
        {...editorProps}
        businessDefaults={businessDefaults}
        initialValues={initialValues}
        key={editorKey}
      />
    </>
  );
}
