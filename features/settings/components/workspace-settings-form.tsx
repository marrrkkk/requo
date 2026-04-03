"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  CheckCircle2,
  Globe,
  ImageIcon,
  Mail,
  Shield,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getFieldError } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  WorkspaceAiTonePreference,
  WorkspaceSettingsActionState,
  WorkspaceSettingsView,
} from "@/features/settings/types";
import {
  formatWorkspaceAiToneLabel,
  getWorkspacePublicInquiryUrl,
  workspaceCurrencyOptions,
  workspaceLogoAccept,
} from "@/features/settings/utils";

type WorkspaceSettingsFormProps = {
  action: (
    state: WorkspaceSettingsActionState,
    formData: FormData,
  ) => Promise<WorkspaceSettingsActionState>;
  fallbackContactEmail: string;
  logoPreviewUrl: string | null;
  settings: WorkspaceSettingsView;
};

const initialState: WorkspaceSettingsActionState = {};

const aiToneOptions: WorkspaceAiTonePreference[] = [
  "balanced",
  "warm",
  "direct",
  "formal",
];

export function WorkspaceSettingsForm({
  action,
  fallbackContactEmail,
  logoPreviewUrl,
  settings,
}: WorkspaceSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [publicInquiryEnabled, setPublicInquiryEnabled] = useState(
    settings.publicInquiryEnabled,
  );
  const [notifyOnNewInquiry, setNotifyOnNewInquiry] = useState(
    settings.notifyOnNewInquiry,
  );
  const [notifyOnQuoteSent, setNotifyOnQuoteSent] = useState(
    settings.notifyOnQuoteSent,
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [aiTonePreference, setAiTonePreference] = useState<WorkspaceAiTonePreference>(
    settings.aiTonePreference,
  );
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultCurrency);
  const hasStoredLogo = Boolean(settings.logoStoragePath && !removeLogo);
  const aiToneError = getFieldError(state.fieldErrors, "aiTonePreference");
  const defaultCurrencyError = getFieldError(state.fieldErrors, "defaultCurrency");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not save the settings.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <CheckCircle2 data-icon="inline-start" />
          <AlertTitle>Settings saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <input
        name="publicInquiryEnabled"
        type="hidden"
        value={String(publicInquiryEnabled)}
      />
      <input
        name="notifyOnNewInquiry"
        type="hidden"
        value={String(notifyOnNewInquiry)}
      />
      <input
        name="notifyOnQuoteSent"
        type="hidden"
        value={String(notifyOnQuoteSent)}
      />
      <input name="removeLogo" type="hidden" value={String(removeLogo)} />
      <input name="aiTonePreference" type="hidden" value={aiTonePreference} />
      <input name="defaultCurrency" type="hidden" value={defaultCurrency} />

      <Card>
        <CardHeader className="gap-2">
          <CardTitle>Business profile</CardTitle>
          <CardDescription>Name, link, contact, and branding.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FieldGroup>
            <Field data-invalid={Boolean(state.fieldErrors?.name) || undefined}>
              <FieldLabel htmlFor="settings-name">Business name</FieldLabel>
              <FieldContent>
                <Input
                  defaultValue={settings.name}
                  disabled={isPending}
                  id="settings-name"
                  name="name"
                  placeholder="Northline Print Studio"
                />
                <FieldError
                  errors={
                    state.fieldErrors?.name?.[0]
                      ? [{ message: state.fieldErrors.name[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Field data-invalid={Boolean(state.fieldErrors?.slug) || undefined}>
                <FieldLabel htmlFor="settings-slug">Public slug</FieldLabel>
                <FieldContent>
                  <Input
                    defaultValue={settings.slug}
                    disabled={isPending}
                    id="settings-slug"
                    name="slug"
                    placeholder="northline-print"
                  />
                  <FieldDescription>
                    Public URL:{" "}
                    <Link
                      className="underline underline-offset-4"
                      href={getWorkspacePublicInquiryUrl(settings.slug)}
                      prefetch={false}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {getWorkspacePublicInquiryUrl(settings.slug)}
                    </Link>
                  </FieldDescription>
                  <FieldError
                    errors={
                      state.fieldErrors?.slug?.[0]
                        ? [{ message: state.fieldErrors.slug[0] }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field
                data-invalid={Boolean(state.fieldErrors?.contactEmail) || undefined}
              >
                <FieldLabel htmlFor="settings-contact-email">
                  Contact email
                </FieldLabel>
                <FieldContent>
                  <Input
                    defaultValue={settings.contactEmail ?? fallbackContactEmail}
                    disabled={isPending}
                    id="settings-contact-email"
                    name="contactEmail"
                    placeholder="hello@example.com"
                    type="email"
                  />
                  <FieldError
                    errors={
                      state.fieldErrors?.contactEmail?.[0]
                        ? [{ message: state.fieldErrors.contactEmail[0] }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
            </div>

            <Field
              data-invalid={Boolean(state.fieldErrors?.shortDescription) || undefined}
            >
              <FieldLabel htmlFor="settings-short-description">
                Short description
              </FieldLabel>
              <FieldContent>
                <Textarea
                  defaultValue={settings.shortDescription ?? ""}
                  disabled={isPending}
                  id="settings-short-description"
                  name="shortDescription"
                  placeholder="A short description of the business."
                  rows={4}
                />
                <FieldError
                  errors={
                    state.fieldErrors?.shortDescription?.[0]
                      ? [{ message: state.fieldErrors.shortDescription[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          <Separator />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <Field data-invalid={Boolean(state.fieldErrors?.logo) || undefined}>
              <FieldLabel htmlFor="settings-logo">Logo</FieldLabel>
              <FieldContent>
                <FieldDescription>
                  Optional JPG, PNG, or WEBP up to 2 MB.
                </FieldDescription>
                <Input
                  accept={workspaceLogoAccept}
                  disabled={isPending}
                  id="settings-logo"
                  name="logo"
                  type="file"
                />
                <FieldError
                  errors={
                    state.fieldErrors?.logo?.[0]
                      ? [{ message: state.fieldErrors.logo[0] }]
                      : undefined
                  }
                />
                {settings.logoStoragePath ? (
                  <label className="mt-3 flex items-start gap-3 rounded-2xl border bg-muted/15 px-4 py-3">
                    <input
                      checked={removeLogo}
                      className="mt-1 size-4 accent-current"
                      disabled={isPending}
                      onChange={(event) => setRemoveLogo(event.currentTarget.checked)}
                      type="checkbox"
                    />
                    <span className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-foreground">
                        Remove current logo
                      </span>
                      <span className="text-muted-foreground">
                        Leave unchecked if you only want to replace it.
                      </span>
                    </span>
                  </label>
                ) : null}
              </FieldContent>
            </Field>

            <div className="rounded-[1.45rem] border bg-background/80 p-4">
              <p className="meta-label">Current logo</p>
              <div className="mt-4 flex min-h-32 items-center justify-center rounded-[1.25rem] border bg-muted/20 p-4">
                {hasStoredLogo && logoPreviewUrl ? (
                  <Image
                    alt={`${settings.name} logo`}
                    className="max-h-24 w-auto object-contain"
                    height={96}
                    src={logoPreviewUrl}
                    unoptimized
                    width={96}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                    <ImageIcon className="size-5" />
                    <span>No logo uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle>Inquiry page and messaging defaults</CardTitle>
          <CardDescription>Public form and writing defaults.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ToggleCard
            checked={publicInquiryEnabled}
            description="Allow customers to submit requests from the public page."
            disabled={isPending}
            icon={Globe}
            label="Enable public inquiry page"
            onCheckedChange={setPublicInquiryEnabled}
          />

          <Field
            data-invalid={Boolean(state.fieldErrors?.inquiryHeadline) || undefined}
          >
            <FieldLabel htmlFor="settings-inquiry-headline">
              Inquiry page headline
            </FieldLabel>
            <FieldContent>
              <Textarea
                defaultValue={settings.inquiryHeadline ?? ""}
                disabled={isPending}
                id="settings-inquiry-headline"
                name="inquiryHeadline"
                placeholder="Tell us about the job and we will review it."
                rows={3}
              />
              <FieldError
                errors={
                  state.fieldErrors?.inquiryHeadline?.[0]
                    ? [{ message: state.fieldErrors.inquiryHeadline[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Field data-invalid={Boolean(aiToneError) || undefined}>
              <FieldLabel htmlFor="settings-ai-tone">AI tone preference</FieldLabel>
              <FieldContent>
                <Select
                  onValueChange={(value) =>
                    setAiTonePreference(value as WorkspaceAiTonePreference)
                  }
                  value={aiTonePreference}
                >
                  <SelectTrigger className="w-full" id="settings-ai-tone">
                    <SelectValue placeholder="Choose a tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {aiToneOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {formatWorkspaceAiToneLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError
                  errors={aiToneError ? [{ message: aiToneError }] : undefined}
                />
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(defaultCurrencyError) || undefined}>
              <FieldLabel htmlFor="settings-default-currency">
                Default currency
              </FieldLabel>
              <FieldContent>
                <Select
                  onValueChange={setDefaultCurrency}
                  value={defaultCurrency}
                >
                  <SelectTrigger className="w-full" id="settings-default-currency">
                    <SelectValue placeholder="Choose a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {workspaceCurrencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError
                  errors={
                    defaultCurrencyError
                      ? [{ message: defaultCurrencyError }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </div>

          <Field
            data-invalid={
              Boolean(state.fieldErrors?.defaultEmailSignature) || undefined
            }
          >
            <FieldLabel htmlFor="settings-email-signature">
              Default email signature
            </FieldLabel>
            <FieldContent>
              <Textarea
                defaultValue={settings.defaultEmailSignature ?? ""}
                disabled={isPending}
                id="settings-email-signature"
                name="defaultEmailSignature"
                placeholder="Thanks, Northline Print Studio"
                rows={4}
              />
              <FieldError
                errors={
                  state.fieldErrors?.defaultEmailSignature?.[0]
                    ? [{ message: state.fieldErrors.defaultEmailSignature[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field
            data-invalid={Boolean(state.fieldErrors?.defaultQuoteNotes) || undefined}
          >
            <FieldLabel htmlFor="settings-default-quote-notes">
              Default quote notes
            </FieldLabel>
            <FieldContent>
              <Textarea
                defaultValue={settings.defaultQuoteNotes ?? ""}
                disabled={isPending}
                id="settings-default-quote-notes"
                name="defaultQuoteNotes"
                placeholder="Standard scope assumptions, lead times, or delivery notes."
                rows={5}
              />
              <FieldError
                errors={
                  state.fieldErrors?.defaultQuoteNotes?.[0]
                    ? [{ message: state.fieldErrors.defaultQuoteNotes[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>Lightweight email preferences.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <ToggleCard
            checked={notifyOnNewInquiry}
            description="Email the owner when a new inquiry arrives."
            disabled={isPending}
            icon={Mail}
            label="Email on new inquiry"
            onCheckedChange={setNotifyOnNewInquiry}
          />
          <ToggleCard
            checked={notifyOnQuoteSent}
            description="Track quote delivery notifications."
            disabled={isPending}
            icon={Shield}
            label="Track quote send notifications"
            onCheckedChange={setNotifyOnQuoteSent}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={isPending} size="lg" type="submit">
          {isPending ? "Saving settings..." : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

function ToggleCard({
  checked,
  description,
  disabled,
  icon: Icon,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  icon: typeof Globe;
  label: string;
  onCheckedChange: (nextValue: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border/80 bg-background px-4 py-4">
      <Switch
        checked={checked}
        className="mt-1"
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </label>
  );
}
