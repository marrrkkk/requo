"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileArchive,
  Plus,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  businessTypeMeta,
  businessTypes,
  type BusinessType,
} from "@/features/inquiries/business-types";
import type {
  BusinessInquiryFormsActionState,
  BusinessInquiryFormsSettingsView,
} from "@/features/settings/types";
import { getBusinessInquiryFormEditorPath } from "@/features/businesses/routes";

type BusinessInquiryFormsManagerProps = {
  settings: BusinessInquiryFormsSettingsView;
  createAction: (
    state: BusinessInquiryFormsActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormsActionState>;
};

const initialState: BusinessInquiryFormsActionState = {};

export function BusinessInquiryFormsManager({
  settings,
  createAction,
}: BusinessInquiryFormsManagerProps) {
  const [createState, createFormAction, isCreatePending] = useActionState(
    createAction,
    initialState,
  );
  const [businessType, setBusinessType] = useState<BusinessType>(
    settings.businessType,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const nameError = createState.fieldErrors?.name?.[0];
  const businessTypeError = createState.fieldErrors?.businessType?.[0];
  const activeForms = settings.forms.filter((form) => !form.archivedAt);
  const archivedForms = settings.forms.filter((form) => form.archivedAt);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="meta-label">All forms</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {settings.forms.length
              ? `${settings.forms.length} form${settings.forms.length === 1 ? "" : "s"}`
              : "No forms yet"}
          </h2>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus data-icon="inline-start" />
              Create form
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create form</DialogTitle>
              <DialogDescription>
                Add a new inquiry form and its public page for this business.
              </DialogDescription>
            </DialogHeader>

            <form action={createFormAction} className="form-stack">
              <input name="businessType" type="hidden" value={businessType} />

              {createState.error ? (
                <Alert variant="destructive">
                  <AlertTitle>We could not create the inquiry form.</AlertTitle>
                  <AlertDescription>{createState.error}</AlertDescription>
                </Alert>
              ) : null}

              <FieldGroup>
                <Field data-invalid={Boolean(nameError) || undefined}>
                  <FieldLabel htmlFor="business-inquiry-form-create-name">
                    Form name
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      disabled={isCreatePending}
                      id="business-inquiry-form-create-name"
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
                  <FieldLabel htmlFor="business-inquiry-form-create-type">
                    Business type
                  </FieldLabel>
                  <FieldContent>
                    <Select
                      onValueChange={(value) =>
                        setBusinessType(value as BusinessType)
                      }
                      value={businessType}
                    >
                      <SelectTrigger
                        className="w-full"
                        id="business-inquiry-form-create-type"
                      >
                        <SelectValue placeholder="Choose a business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {businessTypes.map((option) => (
                            <SelectItem key={option} value={option}>
                              {businessTypeMeta[option].label}
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

              <DialogFooter>
                <Button
                  onClick={() => setIsCreateDialogOpen(false)}
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button disabled={isCreatePending} type="submit">
                  <Plus data-icon="inline-start" />
                  {isCreatePending ? "Creating..." : "Create form"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {activeForms.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {activeForms.map((form) => (
            <Card className="border-border/80 bg-card/98" key={form.id}>
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-sm font-semibold tracking-[0.16em] text-foreground">
                      {getFormInitials(form.name)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{form.name}</CardTitle>
                      <CardDescription className="mt-1 truncate">
                        /{settings.slug}/{form.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {form.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                    <Badge
                      variant={form.publicInquiryEnabled ? "secondary" : "outline"}
                    >
                      {form.publicInquiryEnabled ? "Live" : "Off"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {businessTypeMeta[form.businessType].label}
                  </Badge>
                  <Badge variant="outline">
                    {form.submittedInquiryCount} inquiries
                  </Badge>
                  <Badge variant="outline">
                    {form.inquiryFormConfig.projectFields.length} fields
                  </Badge>
                  <Badge variant="outline">
                    {form.inquiryPageConfig.cards.length} cards
                  </Badge>
                </div>

                <Button asChild className="w-full sm:w-auto">
                  <Link
                    href={getBusinessInquiryFormEditorPath(settings.slug, form.slug)}
                    prefetch={true}
                  >
                    Open form
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No active forms</CardTitle>
            <CardDescription>
              Create an inquiry form to publish a page for incoming requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="soft-panel flex items-start gap-3 px-4 py-4 shadow-none">
              <CheckCircle2 className="mt-0.5 size-5 text-primary" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  Your first form will appear here as a card.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {archivedForms.length ? (
        <div className="space-y-4">
          <div>
            <p className="meta-label">Archived</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              {archivedForms.length} archived
            </h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {archivedForms.map((form) => (
              <Card className="border-border/70 bg-background/75" key={form.id}>
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-sm font-semibold tracking-[0.16em] text-muted-foreground">
                        {getFormInitials(form.name)}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{form.name}</CardTitle>
                        <CardDescription className="mt-1 truncate">
                          /{settings.slug}/{form.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">Archived</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {businessTypeMeta[form.businessType].label}
                    </Badge>
                    <Badge variant="outline">
                      {form.submittedInquiryCount} inquiries
                    </Badge>
                  </div>
                  <FileArchive className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getFormInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
