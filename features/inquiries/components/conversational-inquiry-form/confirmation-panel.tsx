"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  inquiryContactMethodLabels,
  type InquiryContactMethod,
} from "@/features/inquiries/form-config";
import type { PublicInquiryChatExtractedFields } from "@/features/inquiries/public-inquiry-chat-schemas";
import type { PublicInquiryBusiness } from "@/features/inquiries/types";
import { cn } from "@/lib/utils";
import type { CustomFieldMetaItem } from "./types";

/* -------------------------------------------------------------------------- */
/*  Confirmation panel                                                         */
/* -------------------------------------------------------------------------- */

export function ConfirmationPanel({
  fields,
  business,
  customFieldMeta,
  submitError,
  onEdit,
  onEditCustomField,
  onSubmit,
  onBack,
}: {
  fields: PublicInquiryChatExtractedFields;
  business: PublicInquiryBusiness;
  customFieldMeta: CustomFieldMetaItem[];
  submitError: string | null;
  onEdit: (
    field: keyof PublicInquiryChatExtractedFields,
    value: string,
  ) => void;
  onEditCustomField: (fieldId: string, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const contactMethodLabel =
    inquiryContactMethodLabels[
      fields.customerContactMethod as InquiryContactMethod
    ] ?? fields.customerContactMethod;

  return (
    <div className="flex flex-col gap-4 border-t border-border/50 px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
          Review your inquiry
        </h3>
        <p className="text-sm text-muted-foreground">
          Confirm the details below before submitting to {business.name}.
        </p>
      </div>

      <div className="grid gap-3">
        <ConfirmationField
          label="Name"
          value={fields.customerName}
          onChange={(v) => onEdit("customerName", v)}
        />
        <ConfirmationField
          label={`Contact (${contactMethodLabel})`}
          value={fields.customerContactHandle}
          onChange={(v) => onEdit("customerContactHandle", v)}
        />
        <ConfirmationField
          label="Service needed"
          value={fields.serviceCategory}
          onChange={(v) => onEdit("serviceCategory", v)}
        />
        <ConfirmationField
          label="Details"
          value={fields.details}
          onChange={(v) => onEdit("details", v)}
          multiline
        />
        {fields.budgetText ? (
          <ConfirmationField
            label="Budget"
            value={fields.budgetText}
            onChange={(v) => onEdit("budgetText", v)}
          />
        ) : null}
        {fields.requestedDeadline ? (
          <ConfirmationField
            label="Deadline"
            value={fields.requestedDeadline}
            onChange={(v) => onEdit("requestedDeadline", v)}
          />
        ) : null}

        {/* Custom fields from the form config */}
        {customFieldMeta.map((meta) => {
          const extractedValue = fields.customFields?.[meta.fieldId];
          const displayValue =
            typeof extractedValue === "string"
              ? extractedValue
              : Array.isArray(extractedValue)
                ? extractedValue.join(", ")
                : typeof extractedValue === "boolean"
                  ? extractedValue
                    ? "Yes"
                    : "No"
                  : "";

          if (!displayValue && !meta.required) return null;

          return (
            <ConfirmationField
              key={meta.fieldId}
              label={`${meta.label}${meta.required ? "" : " (optional)"}`}
              value={displayValue}
              onChange={(v) => onEditCustomField(meta.fieldId, v)}
              missing={!displayValue && meta.required}
            />
          );
        })}
      </div>

      {submitError ? (
        <p className="text-sm text-destructive">{submitError}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back to chat
        </Button>
        <Button onClick={onSubmit} size="default">
          <Send className="mr-1.5 size-3.5" />
          Submit inquiry
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confirmation field                                                         */
/* -------------------------------------------------------------------------- */

function ConfirmationField({
  label,
  value,
  onChange,
  multiline = false,
  missing = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  missing?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false || missing);
  const [editValue, setEditValue] = useState(value);

  function handleSave() {
    onChange(editValue.trim());
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className={cn(
          "text-xs font-medium",
          missing ? "text-destructive" : "text-muted-foreground",
        )}>
          {label}
          {missing ? " — required" : ""}
        </span>
        {multiline ? (
          <textarea
            className="control-surface min-h-[5rem] w-full resize-y rounded-lg border border-input/95 px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-4 focus:ring-ring/15"
            onChange={(e) => setEditValue(e.target.value)}
            value={editValue}
          />
        ) : (
          <Input
            autoFocus
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            value={editValue}
          />
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={handleSave}>
            Save
          </Button>
          {!missing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditValue(value);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-sm text-foreground">
          {multiline ? (
            <span className="line-clamp-3 whitespace-pre-line">{value}</span>
          ) : (
            value
          )}
        </span>
      </div>
      <button
        className="shrink-0 text-xs text-primary hover:underline"
        onClick={() => setIsEditing(true)}
        type="button"
      >
        Edit
      </button>
    </div>
  );
}
