"use client";

import Image from "next/image";
import Link from "next/link";
import Cropper, { type Area } from "react-easy-crop";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bell,
  CheckCircle2,
  ImageIcon,
  type LucideIcon,
  Mail,
  Reply,
  Send,
} from "lucide-react";

import {
  FormActions,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getFieldError } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  BusinessAiTonePreference,
  BusinessDeleteActionState,
  BusinessSettingsActionState,
  BusinessSettingsView,
} from "@/features/settings/types";
import {
  formatBusinessAiToneLabel,
  getBusinessPublicInquiryUrl,
  businessLogoAccept,
  businessLogoAllowedMimeTypes,
  businessLogoMaxSize,
  businessSlugMaxLength,
  businessSlugPattern,
} from "@/features/settings/utils";
import { BusinessDeleteZone } from "@/features/settings/components/business-delete-zone";

type BusinessSettingsFormProps = {
  action: (
    state: BusinessSettingsActionState,
    formData: FormData,
  ) => Promise<BusinessSettingsActionState>;
  deleteAction: (
    state: BusinessDeleteActionState,
    formData: FormData,
  ) => Promise<BusinessDeleteActionState>;
  fallbackContactEmail: string;
  logoPreviewUrl: string | null;
  settings: BusinessSettingsView;
};

const initialState: BusinessSettingsActionState = {};

const aiToneOptions: BusinessAiTonePreference[] = [
  "balanced",
  "warm",
  "direct",
  "formal",
];

const cropAspectOptions = [
  { id: "original", label: "Original" },
  { id: "square", label: "Square" },
  { id: "wide", label: "Wide" },
  { id: "tall", label: "Tall" },
] as const;

type CropAspectId = (typeof cropAspectOptions)[number]["id"];

type LoadedLogoAsset = {
  file: File;
  url: string;
  width: number;
  height: number;
};

export function BusinessSettingsForm({
  action,
  deleteAction,
  fallbackContactEmail,
  logoPreviewUrl,
  settings,
}: BusinessSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [notifyOnNewInquiry, setNotifyOnNewInquiry] = useState(
    settings.notifyOnNewInquiry,
  );
  const [notifyOnQuoteSent, setNotifyOnQuoteSent] = useState(
    settings.notifyOnQuoteSent,
  );
  const [notifyOnQuoteResponse, setNotifyOnQuoteResponse] = useState(
    settings.notifyOnQuoteResponse,
  );
  const [notifyInAppOnNewInquiry, setNotifyInAppOnNewInquiry] = useState(
    settings.notifyInAppOnNewInquiry,
  );
  const [notifyInAppOnQuoteResponse, setNotifyInAppOnQuoteResponse] = useState(
    settings.notifyInAppOnQuoteResponse,
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [aiTonePreference, setAiTonePreference] = useState<BusinessAiTonePreference>(
    settings.aiTonePreference,
  );
  const aiToneError = getFieldError(state.fieldErrors, "aiTonePreference");

  return (
    <>
      <form action={formAction} className="form-stack">
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
          name="notifyOnNewInquiry"
          type="hidden"
          value={String(notifyOnNewInquiry)}
        />
        <input
          name="notifyOnQuoteSent"
          type="hidden"
          value={String(notifyOnQuoteSent)}
        />
        <input
          name="notifyOnQuoteResponse"
          type="hidden"
          value={String(notifyOnQuoteResponse)}
        />
        <input
          name="notifyInAppOnNewInquiry"
          type="hidden"
          value={String(notifyInAppOnNewInquiry)}
        />
        <input
          name="notifyInAppOnQuoteResponse"
          type="hidden"
          value={String(notifyInAppOnQuoteResponse)}
        />
        <input name="removeLogo" type="hidden" value={String(removeLogo)} />
        <input name="aiTonePreference" type="hidden" value={aiTonePreference} />

        <Card className="gap-0 border-border/75 bg-card/97">
          <CardHeader className="gap-3 pb-5">
            <CardTitle>Business profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-0">
            <FormSection title="Business identity">
              <FieldGroup>
                <Field data-invalid={Boolean(state.fieldErrors?.name) || undefined}>
                  <FieldLabel htmlFor="settings-name">Business name</FieldLabel>
                  <FieldContent>
                    <Input
                      defaultValue={settings.name}
                      disabled={isPending}
                      id="settings-name"
                      maxLength={120}
                      minLength={2}
                      name="name"
                      placeholder="Northline Print Studio"
                      required
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
                        maxLength={businessSlugMaxLength}
                        minLength={2}
                        name="slug"
                        pattern={businessSlugPattern}
                        placeholder="northline-print"
                        required
                        spellCheck={false}
                      />
                      <FieldDescription>
                        Public URL:{" "}
                        <Link
                          className="underline underline-offset-4"
                          href={getBusinessPublicInquiryUrl(settings.slug)}
                          prefetch={false}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {getBusinessPublicInquiryUrl(settings.slug)}
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
                        maxLength={320}
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
                      maxLength={280}
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
            </FormSection>

            <Separator />

            <FormSection title="Brand asset">
              <BusinessLogoField
                disabled={isPending}
                fieldError={state.fieldErrors?.logo?.[0]}
                initialPreviewUrl={logoPreviewUrl}
                removeLogo={removeLogo}
                settingsName={settings.name}
                showRemoveToggle={Boolean(settings.logoStoragePath)}
                onRemoveLogoChange={setRemoveLogo}
              />
            </FormSection>
          </CardContent>
        </Card>

        <Card className="gap-0 border-border/75 bg-card/97">
          <CardHeader className="gap-3 pb-5">
            <CardTitle>Writing defaults</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-0">
            <FormSection title="Writing defaults">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Field data-invalid={Boolean(aiToneError) || undefined}>
                  <FieldLabel htmlFor="settings-ai-tone">AI tone preference</FieldLabel>
                  <FieldContent>
                    <Select
                      onValueChange={(value) =>
                        setAiTonePreference(value as BusinessAiTonePreference)
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
                              {formatBusinessAiToneLabel(option)}
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
                    maxLength={1200}
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
            </FormSection>
          </CardContent>
        </Card>

        <Card className="gap-0 border-border/75 bg-card/97">
          <CardHeader className="gap-3 pb-5">
            <CardTitle>Notification preferences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-0">
            <FormSection title="Live dashboard alerts">
              <div className="grid gap-4 lg:grid-cols-2">
                <ToggleCard
                  checked={notifyInAppOnNewInquiry}
                  description="Show a live dashboard notification when a new public inquiry comes in."
                  disabled={isPending}
                  icon={Bell}
                  label="In-app on new inquiry"
                  onCheckedChange={setNotifyInAppOnNewInquiry}
                />
                <ToggleCard
                  checked={notifyInAppOnQuoteResponse}
                  description="Show a live dashboard notification when a customer accepts or declines a quote."
                  disabled={isPending}
                  icon={Reply}
                  label="In-app on quote response"
                  onCheckedChange={setNotifyInAppOnQuoteResponse}
                />
              </div>
            </FormSection>

            <Separator />

            <FormSection title="Owner emails">
              <div className="grid gap-4 lg:grid-cols-2">
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
                  description="Email the owner after a quote is sent to a customer."
                  disabled={isPending}
                  icon={Send}
                  label="Email on quote sent"
                  onCheckedChange={setNotifyOnQuoteSent}
                />
                <ToggleCard
                  checked={notifyOnQuoteResponse}
                  description="Email the owner when a customer accepts or declines a quote."
                  disabled={isPending}
                  icon={Reply}
                  label="Email on quote response"
                  onCheckedChange={setNotifyOnQuoteResponse}
                />
              </div>
            </FormSection>
          </CardContent>
        </Card>

        <div className="toolbar-panel">
          <FormActions align="between" className="pt-0">
            <Button disabled={isPending} size="lg" type="submit">
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Saving settings...
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </FormActions>
        </div>
      </form>

      <BusinessDeleteZone action={deleteAction} businessName={settings.name} />
    </>
  );
}

function BusinessLogoField({
  disabled,
  fieldError,
  initialPreviewUrl,
  removeLogo,
  settingsName,
  showRemoveToggle,
  onRemoveLogoChange,
}: {
  disabled: boolean;
  fieldError?: string;
  initialPreviewUrl: string | null;
  removeLogo: boolean;
  settingsName: string;
  showRemoveToggle: boolean;
  onRemoveLogoChange: (nextValue: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftAsset, setDraftAsset] = useState<LoadedLogoAsset | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropAspect, setCropAspect] = useState<CropAspectId>("original");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (draftAsset) {
        URL.revokeObjectURL(draftAsset.url);
      }
    };
  }, [draftAsset]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const currentPreviewUrl = !removeLogo ? previewUrl ?? initialPreviewUrl : null;

  async function handleLogoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.currentTarget.files?.[0];

    setLocalError(null);

    if (!nextFile) {
      return;
    }

    try {
      const nextAsset = await loadLogoAsset(nextFile);

      setDraftAsset((currentAsset) => {
        if (currentAsset) {
          URL.revokeObjectURL(currentAsset.url);
        }

        return nextAsset;
      });
      setCropAspect("original");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropOpen(true);
    } catch (error) {
      event.currentTarget.value = "";
      setLocalError(
        error instanceof Error
          ? error.message
          : "We couldn't open that image for cropping.",
      );
    }
  }

  function closeCropper() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setCropOpen(false);
    setDraftAsset((currentAsset) => {
      if (currentAsset) {
        URL.revokeObjectURL(currentAsset.url);
      }

      return null;
    });
    setCropAspect("original");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  async function applyCrop() {
    if (!draftAsset || !croppedAreaPixels || !inputRef.current) {
      return;
    }

    setLocalError(null);

    try {
      const croppedFile = await createCroppedLogoFile(
        draftAsset.file,
        draftAsset.url,
        croppedAreaPixels,
      );

      const transfer = new DataTransfer();
      transfer.items.add(croppedFile);
      inputRef.current.files = transfer.files;

      setPreviewUrl((currentPreviewUrlValue) => {
        if (currentPreviewUrlValue) {
          URL.revokeObjectURL(currentPreviewUrlValue);
        }

        return URL.createObjectURL(croppedFile);
      });
      onRemoveLogoChange(false);
      setCropOpen(false);
      setDraftAsset((currentAsset) => {
        if (currentAsset) {
          URL.revokeObjectURL(currentAsset.url);
        }

        return null;
      });
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "We couldn't crop that logo right now.",
      );
    }
  }

  function clearPendingLogo() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setPreviewUrl((currentPreviewUrlValue) => {
      if (currentPreviewUrlValue) {
        URL.revokeObjectURL(currentPreviewUrlValue);
      }

      return null;
    });
    setLocalError(null);
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Field data-invalid={Boolean(fieldError || localError) || undefined}>
          <FieldLabel htmlFor="settings-logo">Logo</FieldLabel>
          <FieldContent>
            <FieldDescription>
              Optional JPG, PNG, or WEBP up to 2 MB. New uploads open a crop step before saving.
            </FieldDescription>
            <Input
              ref={inputRef}
              accept={businessLogoAccept}
              disabled={disabled}
              id="settings-logo"
              name="logo"
              onChange={handleLogoSelection}
              type="file"
            />
            {previewUrl ? (
              <div className="soft-panel mt-3 flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">Cropped logo ready</p>
                  <p className="text-muted-foreground">
                    This cropped version will be uploaded when you save settings.
                  </p>
                </div>
                <Button
                  disabled={disabled}
                  onClick={clearPendingLogo}
                  type="button"
                  variant="outline"
                >
                  Clear
                </Button>
              </div>
            ) : null}
            {showRemoveToggle && !previewUrl ? (
              <label className="soft-panel mt-3 flex items-start gap-3 px-4 py-3">
                <input
                  checked={removeLogo}
                  className="mt-1 size-4 accent-current"
                  disabled={disabled}
                  onChange={(event) => onRemoveLogoChange(event.currentTarget.checked)}
                  type="checkbox"
                />
                <span className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-foreground">
                    Remove current logo
                  </span>
                  <span className="text-muted-foreground">
                    Leave unchecked if you want to keep the current brand asset.
                  </span>
                </span>
              </label>
            ) : null}
            <FieldError
              errors={
                localError
                  ? [{ message: localError }]
                  : fieldError
                    ? [{ message: fieldError }]
                    : undefined
              }
            />
          </FieldContent>
        </Field>

        <div className="soft-panel p-4">
          <p className="meta-label">{previewUrl ? "New logo preview" : "Current logo"}</p>
          <div className="soft-panel mt-4 flex min-h-32 items-center justify-center bg-muted/20 p-4 shadow-none">
            {currentPreviewUrl ? (
              <Image
                alt={`${settingsName} logo`}
                className="max-h-24 w-auto object-contain"
                height={96}
                src={currentPreviewUrl}
                unoptimized
                width={96}
              />
            ) : (
              <Empty className="border-0 bg-transparent px-4 py-6 shadow-none">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ImageIcon />
                  </EmptyMedia>
                  <EmptyTitle>No logo uploaded</EmptyTitle>
                  <EmptyDescription>
                    Choose a file above to brand public pages and customer-facing quote views.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={cropOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCropper();
          }
        }}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-5xl">
          <DialogHeader className="gap-3 border-b border-border/70 pb-4">
            <DialogTitle>Crop brand asset</DialogTitle>
            <DialogDescription>
              Adjust the framing before the logo is uploaded to your business.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex flex-col gap-4">
              <div className="soft-panel relative min-h-[26rem] overflow-hidden bg-muted/25">
                {draftAsset ? (
                  <Cropper
                    aspect={getCropAspectRatio(cropAspect, draftAsset)}
                    crop={crop}
                    cropShape="rect"
                    image={draftAsset.url}
                    objectFit="contain"
                    onCropChange={setCrop}
                    onCropComplete={(_, areaPixels) =>
                      setCroppedAreaPixels(areaPixels)
                    }
                    onZoomChange={setZoom}
                    showGrid={false}
                    zoom={zoom}
                  />
                ) : null}
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                Drag the image to reposition it inside the crop frame, then zoom to trim empty space.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                <p className="meta-label">Aspect</p>
                <div className="grid grid-cols-2 gap-2">
                  {cropAspectOptions.map((option) => (
                    <Button
                      key={option.id}
                      onClick={() => setCropAspect(option.id)}
                      type="button"
                      variant={cropAspect === option.id ? "secondary" : "outline"}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="logo-crop-zoom">Zoom</FieldLabel>
                  <FieldContent>
                    <input
                      className="h-10 w-full accent-primary"
                      id="logo-crop-zoom"
                      max="4"
                      min="1"
                      onChange={(event) => setZoom(Number(event.currentTarget.value))}
                      step="0.01"
                      type="range"
                      value={zoom}
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>

              {draftAsset ? (
                <div className="soft-panel flex items-start gap-3 px-4 py-4 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{draftAsset.file.name}</p>
                    <p className="text-muted-foreground">
                      The cropped result replaces the upload field and keeps the existing save flow.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="border-t border-border/70">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={closeCropper} type="button" variant="outline">
                Cancel
              </Button>
              <Button onClick={applyCrop} type="button">
                Use cropped logo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  icon: LucideIcon;
  label: string;
  onCheckedChange: (nextValue: boolean) => void;
}) {
  return (
    <label
      className={[
        "soft-panel flex items-start gap-3 px-4 py-4 transition-colors hover:bg-accent/30",
        checked ? "border-primary/20 bg-accent/52" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
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

function getCropAspectRatio(
  cropAspect: CropAspectId,
  asset: LoadedLogoAsset | null,
) {
  switch (cropAspect) {
    case "square":
      return 1;
    case "wide":
      return 16 / 9;
    case "tall":
      return 4 / 5;
    case "original":
      return asset ? asset.width / asset.height : 1;
  }
}

async function loadLogoAsset(file: File): Promise<LoadedLogoAsset> {
  const url = URL.createObjectURL(file);

  try {
    const dimensions = await readImageDimensions(url);

    return {
      file,
      url,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function readImageDimensions(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      reject(
        new Error("Choose a JPG, PNG, or WEBP image that can be opened in the browser."),
      );
    };
    image.src = url;
  });
}

async function createCroppedLogoFile(
  sourceFile: File,
  sourceUrl: string,
  cropAreaPixels: Area,
) {
  const image = await loadCanvasImage(sourceUrl);
  const outputMimeType = businessLogoAllowedMimeTypes.includes(
    sourceFile.type as (typeof businessLogoAllowedMimeTypes)[number],
  )
    ? sourceFile.type
    : "image/png";
  const outputExtension = getLogoExtensionForMimeType(outputMimeType);

  for (const maxDimension of [1200, 1024, 896, 768, 640, 512]) {
    const scale = Math.min(
      1,
      maxDimension / Math.max(cropAreaPixels.width, cropAreaPixels.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cropAreaPixels.width * scale));
    canvas.height = Math.max(1, Math.round(cropAreaPixels.height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Your browser could not prepare that crop.");
    }

    context.drawImage(
      image,
      cropAreaPixels.x,
      cropAreaPixels.y,
      cropAreaPixels.width,
      cropAreaPixels.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        outputMimeType,
        outputMimeType === "image/jpeg" || outputMimeType === "image/webp"
          ? 0.92
          : undefined,
      );
    });

    if (!blob) {
      continue;
    }

    const croppedFile = new File(
      [blob],
      buildCroppedLogoFileName(sourceFile.name, outputExtension),
      {
        lastModified: Date.now(),
        type: outputMimeType,
      },
    );

    if (croppedFile.size <= businessLogoMaxSize) {
      return croppedFile;
    }
  }

  throw new Error("The cropped logo is still larger than 2 MB. Try a tighter crop or a smaller source image.");
}

function loadCanvasImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("We couldn't render that image for cropping."));
    image.src = url;
  });
}

function buildCroppedLogoFileName(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");

  return `${baseName || "business-logo"}-cropped${extension}`;
}

function getLogoExtensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    default:
      return ".png";
  }
}
