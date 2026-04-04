"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileArchive,
  FormInput,
  Plus,
} from "lucide-react";

import {
  FormActions,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  workspaceBusinessTypeMeta,
  workspaceBusinessTypes,
  type WorkspaceBusinessType,
} from "@/features/inquiries/business-types";
import type {
  WorkspaceInquiryFormsActionState,
  WorkspaceInquiryFormsSettingsView,
} from "@/features/settings/types";
import { getWorkspaceInquiryFormEditorPath } from "@/features/workspaces/routes";
import { cn } from "@/lib/utils";

type WorkspaceInquiryFormsManagerProps = {
  settings: WorkspaceInquiryFormsSettingsView;
  createAction: (
    state: WorkspaceInquiryFormsActionState,
    formData: FormData,
  ) => Promise<WorkspaceInquiryFormsActionState>;
};

const initialState: WorkspaceInquiryFormsActionState = {};

export function WorkspaceInquiryFormsManager({
  settings,
  createAction,
}: WorkspaceInquiryFormsManagerProps) {
  const [createState, createFormAction, isCreatePending] = useActionState(
    createAction,
    initialState,
  );
  const [businessType, setBusinessType] = useState<WorkspaceBusinessType>(
    settings.businessType,
  );
  const nameError = createState.fieldErrors?.name?.[0];
  const businessTypeError = createState.fieldErrors?.businessType?.[0];
  const activeForms = settings.forms.filter((form) => !form.archivedAt);
  const archivedForms = settings.forms.filter((form) => form.archivedAt);

  return (
    <div className="form-stack">
      {createState.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not create the inquiry form.</AlertTitle>
          <AlertDescription>{createState.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Create inquiry form</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form action={createFormAction} className="form-stack">
            <input name="businessType" type="hidden" value={businessType} />

            <FormSection title="New form">
              <FieldGroup>
                <Field data-invalid={Boolean(nameError) || undefined}>
                  <FieldLabel htmlFor="workspace-inquiry-form-create-name">
                    Form name
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      disabled={isCreatePending}
                      id="workspace-inquiry-form-create-name"
                      maxLength={80}
                      minLength={2}
                      name="name"
                      placeholder="Wholesale request"
                      required
                    />
                    <FieldError
                      errors={nameError ? [{ message: nameError }] : undefined}
                    />
                  </FieldContent>
                </Field>

                <Field data-invalid={Boolean(businessTypeError) || undefined}>
                  <FieldLabel htmlFor="workspace-inquiry-form-create-type">
                    Business type
                  </FieldLabel>
                  <FieldContent>
                    <Select
                      onValueChange={(value) =>
                        setBusinessType(value as WorkspaceBusinessType)
                      }
                      value={businessType}
                    >
                      <SelectTrigger
                        className="w-full"
                        id="workspace-inquiry-form-create-type"
                      >
                        <SelectValue placeholder="Choose a business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {workspaceBusinessTypes.map((option) => (
                            <SelectItem key={option} value={option}>
                              {workspaceBusinessTypeMeta[option].label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldError
                      errors={
                        businessTypeError
                          ? [{ message: businessTypeError }]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FormSection>

            <FormActions align="start">
              <Button disabled={isCreatePending} type="submit">
                <Plus data-icon="inline-start" />
                {isCreatePending ? "Creating..." : "Create form"}
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Forms</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-0">
          {activeForms.length ? (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
              {activeForms.map((form, index) => (
                <Link
                  className={cn(
                    "flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-accent/35",
                    index > 0 && "border-t border-border/70",
                  )}
                  href={getWorkspaceInquiryFormEditorPath(settings.slug, form.slug)}
                  key={form.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {form.name}
                      </p>
                      {form.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                      {form.publicInquiryEnabled ? (
                        <Badge variant="outline">Live</Badge>
                      ) : (
                        <Badge variant="outline">Off</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{workspaceBusinessTypeMeta[form.businessType].label}</span>
                      <span>{form.submittedInquiryCount} inquiries</span>
                      <span>{form.inquiryFormConfig.projectFields.length} fields</span>
                      <span>{form.inquiryPageConfig.cards.length} cards</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-muted-foreground">
                      {settings.slug}/{form.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <FormInput className="size-4 text-muted-foreground" />
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Alert>
              <CheckCircle2 data-icon="inline-start" />
              <AlertTitle>No active forms</AlertTitle>
              <AlertDescription>Create an inquiry form to publish a page.</AlertDescription>
            </Alert>
          )}

          {archivedForms.length ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Archived</p>
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70">
                {archivedForms.map((form, index) => (
                  <div
                    className={cn(
                      "flex items-center justify-between gap-4 px-4 py-4",
                      index > 0 && "border-t border-border/70",
                    )}
                    key={form.id}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{form.name}</p>
                        <Badge variant="outline">Archived</Badge>
                      </div>
                      <p className="mt-2 truncate text-sm text-muted-foreground">
                        {settings.slug}/{form.slug}
                      </p>
                    </div>
                    <FileArchive className="size-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
