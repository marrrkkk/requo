import { Camera } from "lucide-react";

import { CountryCombobox } from "@/components/shared/country-combobox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  businessCurrencyOptions,
} from "@/features/businesses/locale";
import type { OnboardingDraft } from "@/features/onboarding/helpers";
import type { OnboardingFieldName } from "@/features/onboarding/types";
import { cn } from "@/lib/utils";

import {
  getInitials,
  onboardingComboboxButtonClassName,
  onboardingInputClassName,
} from "./types";

type BusinessStepProps = {
  draft: OnboardingDraft;
  fieldErrors: Partial<Record<OnboardingFieldName, string>>;
  isPending: boolean;
  isDraftHydrated: boolean;
  slugAvailability: "idle" | "checking" | "available" | "taken";
  slugManuallyEdited: boolean;
  businessAvatarPreviewUrl: string | null;
  businessAvatarInputRef: React.RefObject<HTMLInputElement | null>;
  updateField: <FieldName extends OnboardingFieldName>(
    field: FieldName,
    value: OnboardingDraft[FieldName],
  ) => void;
  handleCountryChange: (countryCode: string) => void;
  handleBusinessAvatarSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setSlugManuallyEdited: (value: boolean) => void;
  checkSlugAvailability: (slug: string) => void;
  slugifyPublicName: (name: string) => string;
};

export function BusinessStep({
  draft,
  fieldErrors,
  isPending,
  isDraftHydrated,
  slugAvailability,
  slugManuallyEdited,
  businessAvatarPreviewUrl,
  businessAvatarInputRef,
  updateField,
  handleCountryChange,
  handleBusinessAvatarSelection,
  setSlugManuallyEdited,
  checkSlugAvailability,
  slugifyPublicName,
}: BusinessStepProps) {
  return (
    <div className="mx-auto w-full max-w-md py-4">
      <FieldGroup>
        <Field>
          <FieldLabel>Business logo</FieldLabel>
          <FieldContent>
            <div className="flex items-center gap-5">
              <div className="group relative">
                <input
                  ref={businessAvatarInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={isPending}
                  id="onboarding-business-avatar"
                  name="businessAvatar"
                  onChange={handleBusinessAvatarSelection}
                  type="file"
                />
                <Avatar className="size-20 rounded-xl border border-border/75 shadow-sm">
                  <AvatarImage
                    alt="Business logo preview"
                    className="rounded-xl"
                    src={businessAvatarPreviewUrl ?? undefined}
                  />
                  <AvatarFallback className="rounded-xl text-lg">
                    {getInitials(draft.businessName || "?")}
                  </AvatarFallback>
                </Avatar>
                <label
                  className={cn(
                    "absolute inset-0 flex cursor-pointer items-end justify-end rounded-xl focus-within:outline-none",
                    isPending &&
                      "pointer-events-none cursor-default opacity-60",
                  )}
                  htmlFor="onboarding-business-avatar"
                  role="button"
                  tabIndex={isPending ? -1 : 0}
                >
                  <span className="absolute inset-0 rounded-xl bg-foreground/0 transition-colors duration-150 sm:group-hover:bg-foreground/10" />
                  <span className="relative mr-0.5 mb-0.5 inline-flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/94 text-foreground shadow-sm">
                    <Camera className="size-3.5" />
                    <span className="sr-only">Upload logo</span>
                  </span>
                </label>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Upload a business logo.</p>
                <p>JPG, PNG, or WEBP. Max 2 MB.</p>
              </div>
            </div>
          </FieldContent>
        </Field>

        <Field
          data-invalid={Boolean(fieldErrors.businessName) || undefined}
        >
          <FieldLabel htmlFor="onboarding-business-name">
            Business name
          </FieldLabel>
          <FieldContent>
            <Input
              aria-invalid={
                Boolean(fieldErrors.businessName) || undefined
              }
              autoFocus={isDraftHydrated}
              className={onboardingInputClassName}
              disabled={isPending}
              id="onboarding-business-name"
              maxLength={80}
              minLength={2}
              onChange={(event) => {
                const name = event.currentTarget.value;
                updateField("businessName", name);
                if (!slugManuallyEdited) {
                  const autoSlug = name.trim()
                    ? slugifyPublicName(name)
                    : "";
                  updateField("businessSlug", autoSlug);
                  checkSlugAvailability(autoSlug);
                }
              }}
              placeholder="Northline Print Studio"
              required
              value={draft.businessName}
            />
          </FieldContent>
        </Field>

        <Field
          data-invalid={Boolean(fieldErrors.businessSlug) || slugAvailability === "taken" || undefined}
        >
          <FieldLabel htmlFor="onboarding-business-slug">
            Public URL
          </FieldLabel>
          <FieldContent>
            <div
              className={cn(
                "flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm transition-colors",
                (Boolean(fieldErrors.businessSlug) || slugAvailability === "taken") && "border-destructive",
                isPending && "opacity-60",
              )}
            >
              <span className="shrink-0 select-none text-sm text-muted-foreground">
                /businesses/
              </span>
              <input
                aria-invalid={
                  Boolean(fieldErrors.businessSlug) || slugAvailability === "taken" || undefined
                }
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                disabled={isPending}
                id="onboarding-business-slug"
                maxLength={60}
                onChange={(event) => {
                  setSlugManuallyEdited(true);
                  const nextSlug = event.currentTarget.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/--+/g, "-")
                    .replace(/^-|-$/g, "");
                  updateField("businessSlug", nextSlug);
                  checkSlugAvailability(nextSlug);
                }}
                placeholder="your-business"
                value={draft.businessSlug}
              />
            </div>
            {slugAvailability === "taken" ? (
              <p className="mt-1.5 text-sm text-destructive">
                This URL is already taken. Try a different one.
              </p>
            ) : slugAvailability === "available" && draft.businessSlug.length >= 2 ? (
              <p className="mt-1.5 text-sm text-primary">
                Available
              </p>
            ) : null}
          </FieldContent>
        </Field>

        <div className="grid gap-6 md:grid-cols-2">
          <Field
            data-invalid={Boolean(fieldErrors.countryCode) || undefined}
          >
            <FieldLabel htmlFor="onboarding-country-code">
              Country
            </FieldLabel>
            <FieldContent>
              <CountryCombobox
                aria-invalid={
                  Boolean(fieldErrors.countryCode) || undefined
                }
                buttonClassName={onboardingComboboxButtonClassName}
                disabled={isPending}
                id="onboarding-country-code"
                onValueChange={handleCountryChange}
                placeholder="Choose your country"
                searchPlaceholder="Search country"
                showFlags={false}
                value={draft.countryCode}
              />
            </FieldContent>
          </Field>

          <Field
            data-invalid={
              Boolean(fieldErrors.defaultCurrency) || undefined
            }
          >
            <FieldLabel htmlFor="onboarding-default-currency">
              Currency
            </FieldLabel>
            <FieldContent>
              <Combobox
                aria-invalid={
                  Boolean(fieldErrors.defaultCurrency) || undefined
                }
                buttonClassName={onboardingComboboxButtonClassName}
                disabled={isPending}
                id="onboarding-default-currency"
                onValueChange={(value) =>
                  updateField("defaultCurrency", value)
                }
                options={businessCurrencyOptions.map((option) => ({
                  value: option.code,
                  label: option.label,
                  searchText: `${option.code} ${option.name}`,
                }))}
                placeholder="Choose a currency"
                searchPlaceholder="Search currency"
                searchable
                value={draft.defaultCurrency}
              />
            </FieldContent>
          </Field>
        </div>
      </FieldGroup>
    </div>
  );
}
