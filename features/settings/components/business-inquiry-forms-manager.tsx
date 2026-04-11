"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  FileArchive,
  PencilLine,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
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
import { Spinner } from "@/components/ui/spinner";
import {
  getStarterTemplateBusinessType,
  starterTemplateOptions,
} from "@/features/businesses/starter-templates";
import {
  businessTypeMeta,
  type BusinessType,
} from "@/features/inquiries/business-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  BusinessInquiryFormsActionState,
  BusinessInquiryFormsSettingsView,
} from "@/features/settings/types";
import { getBusinessInquiryFormEditorPath } from "@/features/businesses/routes";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";

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
  const [createState, createFormAction, isCreatePending] = useActionStateWithSonner(
    createAction,
    initialState,
  );
  const [businessType, setBusinessType] = useState<BusinessType>(
    getStarterTemplateBusinessType(settings.businessType),
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const nameError = createState.fieldErrors?.name?.[0];
  const businessTypeError = createState.fieldErrors?.businessType?.[0];
  const activeForms = settings.forms.filter((form) => !form.archivedAt);
  const archivedForms = settings.forms.filter((form) => form.archivedAt);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8">
        <div className="flex justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus data-icon="inline-start" />
                Create form
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Create form</DialogTitle>
                <DialogDescription>
                  Add a new inquiry form and its public page for this business.
                </DialogDescription>
              </DialogHeader>

              <form action={createFormAction} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className="gap-6">
                  <input name="businessType" type="hidden" value={businessType} />

                  <FieldGroup className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
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
                        Starter template
                      </FieldLabel>
                      <FieldContent>
                        <Combobox
                          aria-invalid={Boolean(businessTypeError) || undefined}
                          disabled={isCreatePending}
                          id="business-inquiry-form-create-type"
                          onValueChange={(value) =>
                            setBusinessType(value as BusinessType)
                          }
                          options={starterTemplateOptions}
                          placeholder="Choose a starter template"
                          renderOption={(option) => (
                            <div className="min-w-0">
                              <p className="truncate font-medium">{option.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {option.description}
                              </p>
                            </div>
                          )}
                          searchPlaceholder="Search starter template"
                          value={businessType}
                        />
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
                </DialogBody>

                <DialogFooter className="grid grid-cols-1 sm:grid-cols-2">
                  <Button
                    className="w-full"
                    onClick={() => setIsCreateDialogOpen(false)}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="w-full"
                    disabled={isCreatePending}
                    size="lg"
                    type="submit"
                  >
                    {isCreatePending ? (
                      <>
                        <Spinner data-icon="inline-start" aria-hidden="true" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus data-icon="inline-start" />
                        Create form
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {activeForms.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeForms.map((form) => (
              <Card className="h-full border-border/80 bg-card/98" key={form.id}>
                <CardHeader className="gap-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex w-0 min-w-0 flex-1 items-start gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-sm font-semibold tracking-[0.16em] text-foreground">
                        {getFormInitials(form.name)}
                      </div>
                      <div className="w-0 min-w-0 flex-1">
                        <CardTitle>
                          <TruncatedWithTooltip text={form.name} />
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <TruncatedWithTooltip text={`/${settings.slug}/${form.slug}`} />
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      className={`w-fit shrink-0 self-start ${
                        form.publicInquiryEnabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                          : "border-red-200 bg-red-50 text-red-700 hover:bg-red-50"
                      }`}
                      variant="outline"
                    >
                      {form.publicInquiryEnabled ? "Live" : "Unpublished"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div>
                    <Badge variant="outline">{businessTypeMeta[form.businessType].label}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {form.publicInquiryEnabled ? (
                      <Button asChild>
                        <Link
                          href={getBusinessPublicInquiryUrl(settings.slug, form.slug)}
                          prefetch={false}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open live form
                          <ArrowUpRight data-icon="inline-end" />
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled type="button">
                        Form unpublished
                      </Button>
                    )}

                    <Button asChild type="button" variant="outline">
                      <Link
                        href={getBusinessInquiryFormEditorPath(settings.slug, form.slug)}
                        prefetch={true}
                      >
                        <PencilLine data-icon="inline-start" />
                        Edit
                      </Link>
                    </Button>
                  </div>
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
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {archivedForms.length} archived
            </h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {archivedForms.map((form) => (
              <Card className="border-border/70 bg-background/75" key={form.id}>
                <CardHeader className="gap-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex w-0 min-w-0 flex-1 items-start gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-sm font-semibold tracking-[0.16em] text-muted-foreground">
                        {getFormInitials(form.name)}
                      </div>
                      <div className="w-0 min-w-0 flex-1">
                        <CardTitle className="text-base">
                          <TruncatedWithTooltip text={form.name} />
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <TruncatedWithTooltip text={`/${settings.slug}/${form.slug}`} />
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="w-fit shrink-0 self-start" variant="outline">
                      Archived
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {businessTypeMeta[form.businessType].label}
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
    </TooltipProvider>
  );
}

type TruncatedWithTooltipProps = {
  text: string;
};

function TruncatedWithTooltip({ text }: TruncatedWithTooltipProps) {
  const shouldShowTooltip = text.length > 34;
  const content = <span className="block truncate">{text}</span>;

  if (!shouldShowTooltip) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top">{text}</TooltipContent>
    </Tooltip>
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
