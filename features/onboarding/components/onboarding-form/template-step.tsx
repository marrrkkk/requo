import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  starterTemplateDefinitions,
  starterTemplateBusinessTypes,
} from "@/features/businesses/starter-templates";
import {
  businessTypeOptions,
} from "@/features/inquiries/business-types";
import type { OnboardingDraft } from "@/features/onboarding/helpers";
import {
  customerContactChannelOptions,
} from "@/features/onboarding/schemas";
import type { OnboardingFieldName } from "@/features/onboarding/types";
import { cn } from "@/lib/utils";

import { onboardingComboboxButtonClassName } from "./types";

type TemplateStepProps = {
  draft: OnboardingDraft;
  fieldErrors: Partial<Record<OnboardingFieldName, string>>;
  isPending: boolean;
  recommendedTemplate: string;
  updateField: <FieldName extends OnboardingFieldName>(
    field: FieldName,
    value: OnboardingDraft[FieldName],
  ) => void;
  handleBusinessTypeChange: (value: string) => void;
};

export function TemplateStep({
  draft,
  fieldErrors,
  isPending,
  recommendedTemplate,
  updateField,
  handleBusinessTypeChange,
}: TemplateStepProps) {
  return (
    <div className="mx-auto w-full max-w-md py-4">
      <FieldGroup>
        <Field
          data-invalid={Boolean(fieldErrors.businessType) || undefined}
        >
          <FieldLabel htmlFor="onboarding-business-type">
            Business type
          </FieldLabel>
          <FieldContent>
            <Combobox
              aria-invalid={
                Boolean(fieldErrors.businessType) || undefined
              }
              buttonClassName={onboardingComboboxButtonClassName}
              disabled={isPending}
              id="onboarding-business-type"
              onValueChange={handleBusinessTypeChange}
              options={businessTypeOptions}
              placeholder="Choose a type"
              searchPlaceholder="Search types"
              searchable
              value={draft.businessType}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-customer-contact">
            Contact channel <span className="text-muted-foreground font-normal">(optional)</span>
          </FieldLabel>
          <FieldContent>
            <Combobox
              buttonClassName={onboardingComboboxButtonClassName}
              disabled={isPending}
              id="onboarding-customer-contact"
              onValueChange={(value) =>
                updateField("customerContactChannel", value)
              }
              options={customerContactChannelOptions}
              placeholder="Choose a channel"
              value={draft.customerContactChannel}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Template</FieldLabel>
          <FieldContent>
            <div className="flex flex-col gap-1.5">
              {starterTemplateBusinessTypes.map((templateType) => {
                const def = starterTemplateDefinitions[templateType];
                const isSelected =
                  draft.starterTemplateBusinessType === templateType;
                const isRecommended =
                  recommendedTemplate === templateType;

                return (
                  <button
                    key={templateType}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/60 hover:bg-accent/30",
                      isPending && "pointer-events-none opacity-60",
                    )}
                    disabled={isPending}
                    onClick={() =>
                      updateField(
                        "starterTemplateBusinessType",
                        templateType,
                      )
                    }
                    type="button"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-3.5 shrink-0 items-center justify-center rounded-full border-2",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-border",
                        )}
                      >
                        {isSelected ? (
                          <span className="size-1 rounded-full bg-white" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 font-medium">
                        {def.label}
                      </span>
                      {isRecommended ? (
                        <span className="shrink-0 text-[10px] text-primary">
                          ★
                        </span>
                      ) : null}
                    </div>
                    <p className="ml-6 text-[11px] leading-relaxed text-muted-foreground">
                      {def.recommendedFields.join(" · ")}
                    </p>
                  </button>
                );
              })}
            </div>
          </FieldContent>
        </Field>
      </FieldGroup>
    </div>
  );
}
