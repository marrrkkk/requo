import { Camera } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { OnboardingDraft } from "@/features/onboarding/helpers";
import {
  companySizeOptions,
  jobTitleOptions,
  referralSourceOptions,
} from "@/features/onboarding/schemas";
import type { OnboardingFieldName } from "@/features/onboarding/types";
import { cn } from "@/lib/utils";

import {
  getInitials,
  onboardingComboboxButtonClassName,
  onboardingInputClassName,
} from "./types";

type ProfileStepProps = {
  draft: OnboardingDraft;
  fieldErrors: Partial<Record<OnboardingFieldName, string>>;
  isPending: boolean;
  isDraftHydrated: boolean;
  avatarPreviewUrl: string | null;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  updateField: <FieldName extends OnboardingFieldName>(
    field: FieldName,
    value: OnboardingDraft[FieldName],
  ) => void;
  handleAvatarSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function ProfileStep({
  draft,
  fieldErrors,
  isPending,
  isDraftHydrated,
  avatarPreviewUrl,
  avatarInputRef,
  updateField,
  handleAvatarSelection,
}: ProfileStepProps) {
  return (
    <div className="mx-auto w-full max-w-md py-4">
      <FieldGroup>
            <Field>
              <FieldLabel>Profile photo</FieldLabel>
              <FieldContent>
                <div className="flex items-center gap-5">
                  <div className="group relative">
                    <input
                      ref={avatarInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={isPending}
                      id="onboarding-avatar"
                      name="avatar"
                      onChange={handleAvatarSelection}
                      type="file"
                    />
                    <Avatar className="size-20 border border-border/75 shadow-sm">
                      <AvatarImage
                        alt="Profile photo preview"
                        src={avatarPreviewUrl ?? undefined}
                      />
                      <AvatarFallback className="text-lg">
                        {getInitials(
                          draft.firstName || draft.lastName
                            ? `${draft.firstName} ${draft.lastName}`
                            : "?",
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      className={cn(
                        "absolute inset-0 flex cursor-pointer items-end justify-end rounded-full focus-within:outline-none",
                        isPending &&
                          "pointer-events-none cursor-default opacity-60",
                      )}
                      htmlFor="onboarding-avatar"
                      role="button"
                      tabIndex={isPending ? -1 : 0}
                    >
                      <span className="absolute inset-0 rounded-full bg-foreground/0 transition-colors duration-150 sm:group-hover:bg-foreground/10" />
                      <span className="relative mr-0.5 mb-0.5 inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/94 text-foreground shadow-sm">
                        <Camera className="size-3.5" />
                        <span className="sr-only">Upload photo</span>
                      </span>
                    </label>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Upload a profile photo.</p>
                    <p>JPG, PNG, or WEBP. Max 2 MB.</p>
                  </div>
                </div>
              </FieldContent>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                data-invalid={
                  Boolean(fieldErrors.firstName) || undefined
                }
              >
                <FieldLabel htmlFor="onboarding-first-name">
                  First name
                </FieldLabel>
                <FieldContent>
                  <Input
                    aria-invalid={
                      Boolean(fieldErrors.firstName) || undefined
                    }
                    autoFocus={isDraftHydrated && !draft.firstName}
                    className={onboardingInputClassName}
                    disabled={isPending}
                    id="onboarding-first-name"
                    maxLength={60}
                    minLength={1}
                    onChange={(event) =>
                      updateField(
                        "firstName",
                        event.currentTarget.value,
                      )
                    }
                    placeholder="Alicia"
                    required
                    value={draft.firstName}
                  />
                </FieldContent>
              </Field>

              <Field
                data-invalid={
                  Boolean(fieldErrors.lastName) || undefined
                }
              >
                <FieldLabel htmlFor="onboarding-last-name">
                  Last name
                </FieldLabel>
                <FieldContent>
                  <Input
                    aria-invalid={
                      Boolean(fieldErrors.lastName) || undefined
                    }
                    className={onboardingInputClassName}
                    disabled={isPending}
                    id="onboarding-last-name"
                    maxLength={60}
                    minLength={1}
                    onChange={(event) =>
                      updateField(
                        "lastName",
                        event.currentTarget.value,
                      )
                    }
                    placeholder="Cruz"
                    required
                    value={draft.lastName}
                  />
                </FieldContent>
              </Field>
            </div>

            <Field
              data-invalid={Boolean(fieldErrors.jobTitle) || undefined}
            >
              <FieldLabel htmlFor="onboarding-job-title">
                Role <span className="text-muted-foreground font-normal">(optional)</span>
              </FieldLabel>
              <FieldContent>
                <Combobox
                  aria-invalid={
                    Boolean(fieldErrors.jobTitle) || undefined
                  }
                  buttonClassName={onboardingComboboxButtonClassName}
                  disabled={isPending}
                  id="onboarding-job-title"
                  onValueChange={(value) =>
                    updateField("jobTitle", value)
                  }
                  options={jobTitleOptions}
                  placeholder="Choose your role"
                  value={draft.jobTitle}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="onboarding-company-size">
                Team size <span className="text-muted-foreground font-normal">(optional)</span>
              </FieldLabel>
              <FieldContent>
                <Combobox
                  buttonClassName={onboardingComboboxButtonClassName}
                  disabled={isPending}
                  id="onboarding-company-size"
                  onValueChange={(value) =>
                    updateField("companySize", value)
                  }
                  options={companySizeOptions}
                  placeholder="How big is your team?"
                  value={draft.companySize}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="onboarding-referral-source">
                How did you find us? <span className="text-muted-foreground font-normal">(optional)</span>
              </FieldLabel>
              <FieldContent>
                <Combobox
                  buttonClassName={onboardingComboboxButtonClassName}
                  disabled={isPending}
                  id="onboarding-referral-source"
                  onValueChange={(value) =>
                    updateField("referralSource", value)
                  }
                  options={referralSourceOptions}
                  placeholder="Choose a source"
                  value={draft.referralSource}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
    </div>
  );
}
