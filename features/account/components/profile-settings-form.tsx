"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";

import {
  FormActions,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  AccountProfileActionState,
  AccountProfileView,
} from "@/features/account/types";

type ProfileSettingsFormProps = {
  action: (
    state: AccountProfileActionState,
    formData: FormData,
  ) => Promise<AccountProfileActionState>;
  profile: AccountProfileView;
};

const initialState: AccountProfileActionState = {};

export function ProfileSettingsForm({
  action,
  profile,
}: ProfileSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fullNameError = state.fieldErrors?.fullName?.[0];
  const jobTitleError = state.fieldErrors?.jobTitle?.[0];
  const phoneError = state.fieldErrors?.phone?.[0];

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not save your profile.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <CheckCircle2 data-icon="inline-start" />
          <AlertTitle>Profile saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Owner profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-0">
          <FormSection
            description="These details are used across your account and owner-facing workspace views."
            title="Profile details"
          >
            <FieldGroup>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Field data-invalid={Boolean(fullNameError) || undefined}>
                  <FieldLabel htmlFor="account-full-name">Full name</FieldLabel>
                  <FieldContent>
                    <Input
                      defaultValue={profile.fullName}
                      disabled={isPending}
                      id="account-full-name"
                      maxLength={120}
                      minLength={2}
                      name="fullName"
                      placeholder="Alicia Cruz"
                      required
                    />
                    <FieldError
                      errors={fullNameError ? [{ message: fullNameError }] : undefined}
                    />
                  </FieldContent>
                </Field>

                <Field data-invalid={Boolean(jobTitleError) || undefined}>
                  <FieldLabel htmlFor="account-job-title">Role or title</FieldLabel>
                  <FieldContent>
                    <Input
                      defaultValue={profile.jobTitle ?? ""}
                      disabled={isPending}
                      id="account-job-title"
                      maxLength={80}
                      minLength={2}
                      name="jobTitle"
                      placeholder="Owner"
                      required
                    />
                    <FieldError
                      errors={jobTitleError ? [{ message: jobTitleError }] : undefined}
                    />
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Field data-invalid={Boolean(phoneError) || undefined}>
                  <FieldLabel htmlFor="account-phone">Phone</FieldLabel>
                  <FieldContent>
                    <Input
                      defaultValue={profile.phone ?? ""}
                      disabled={isPending}
                      id="account-phone"
                      maxLength={32}
                      name="phone"
                      placeholder="+1 555 012 3456"
                    />
                    <FieldDescription>
                      Optional. Keep an owner contact number on file.
                    </FieldDescription>
                    <FieldError
                      errors={phoneError ? [{ message: phoneError }] : undefined}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="account-email">Email</FieldLabel>
                  <FieldContent>
                    <Input
                      disabled
                      id="account-email"
                      readOnly
                      value={profile.email}
                    />
                    <FieldDescription>
                      Your sign-in email is managed through your account.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </FormSection>
        </CardContent>
      </Card>

      <div className="toolbar-panel">
        <FormActions align="between" className="pt-0">
          <Button disabled={isPending} size="lg" type="submit">
            {isPending ? "Saving profile..." : "Save profile"}
          </Button>
        </FormActions>
      </div>
    </form>
  );
}
