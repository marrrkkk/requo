import {
  Briefcase,
  CalendarDays,
  HardHat,
  Palette,
  Repeat,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

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
  type StarterTemplateBusinessType,
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

const templateIcons: Record<StarterTemplateBusinessType, LucideIcon> = {
  creative_marketing_services: Palette,
  consulting_professional_services: Briefcase,
  contractor_home_improvement: HardHat,
  event_services_rentals: CalendarDays,
  cleaning_services: Repeat,
  general_project_services: Sparkles,
};

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
    <div className="mx-auto w-full max-w-lg py-4">
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
          <FieldLabel>Starting template</FieldLabel>
          <FieldContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {starterTemplateBusinessTypes.map((templateType) => {
                const def = starterTemplateDefinitions[templateType];
                const Icon = templateIcons[templateType];
                const isSelected =
                  draft.starterTemplateBusinessType === templateType;
                const isRecommended =
                  recommendedTemplate === templateType;

                return (
                  <button
                    key={templateType}
                    className={cn(
                      "group relative flex flex-col gap-2 rounded-xl border p-3.5 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary/20"
                        : "border-border/60 hover:border-border hover:bg-accent/20",
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
                    {/* Header row */}
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-[13px] font-semibold leading-tight",
                              isSelected
                                ? "text-foreground"
                                : "text-foreground/90",
                            )}
                          >
                            {def.label}
                          </span>
                          {isRecommended && !isSelected ? (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                              Recommended
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                          {def.description}
                        </p>
                      </div>
                    </div>

                    {/* Selected indicator */}
                    {isSelected ? (
                      <div className="absolute top-2.5 right-2.5">
                        <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                          <svg
                            className="size-3 text-primary-foreground"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Selected template fields preview */}
            {draft.starterTemplateBusinessType ? (
              <div className="mt-3 rounded-lg border border-border/40 bg-muted/20 px-3.5 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Form fields included
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {starterTemplateDefinitions[
                    draft.starterTemplateBusinessType as StarterTemplateBusinessType
                  ]?.recommendedFields.map((field) => (
                    <span
                      key={field}
                      className="rounded-md bg-background px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border/50"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </FieldContent>
        </Field>
      </FieldGroup>
    </div>
  );
}
