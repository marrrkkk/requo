"use client";

import {
  FormSection,
} from "@/components/shared/form-layout";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessSettingsActionState } from "@/features/settings/types";

type SummarySectionProps = {
  draftValue: string;
  fieldErrors: BusinessSettingsActionState["fieldErrors"];
  isPending: boolean;
  updateDraftValue: (value: string) => void;
};

export function SummarySection({
  draftValue,
  fieldErrors,
  isPending,
  updateDraftValue,
}: SummarySectionProps) {
  return (
    <FormSection
      description="Keep this short so public inquiry pages stay easy to scan."
      title="Business summary"
    >
      <Field
        data-invalid={Boolean(fieldErrors?.shortDescription) || undefined}
      >
        <FieldLabel htmlFor="settings-short-description">
          Short description
        </FieldLabel>
        <FieldContent>
          <Textarea
            value={draftValue}
            disabled={isPending}
            id="settings-short-description"
            maxLength={280}
            name="shortDescription"
            onChange={(event) =>
              updateDraftValue(event.currentTarget.value)
            }
            placeholder="Reliable repair, install, and recurring maintenance work for homes and small property portfolios."
            rows={4}
          />
          <FieldError
            errors={
              fieldErrors?.shortDescription?.[0]
                ? [{ message: fieldErrors.shortDescription[0] }]
                : undefined
            }
          />
        </FieldContent>
      </Field>
    </FormSection>
  );
}
