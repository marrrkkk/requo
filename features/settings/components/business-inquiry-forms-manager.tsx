"use client";

import Link from "next/link";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileArchive,
  ArchiveRestore,
  Link2,
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
  BusinessInquiryFormDangerActionState,
  BusinessInquiryFormsActionState,
  BusinessInquiryFormsSettingsView,
} from "@/features/settings/types";
import { getBusinessInquiryFormEditorPath } from "@/features/businesses/routes";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import { LockedAction } from "@/features/paywall";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";

type BusinessInquiryFormsManagerProps = {
  settings: BusinessInquiryFormsSettingsView;
  createAction: (
    state: BusinessInquiryFormsActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormsActionState>;
  unarchiveAction: (
    state: BusinessInquiryFormDangerActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormDangerActionState>;
  plan: plan;
};

const initialState: BusinessInquiryFormsActionState = {};

export function BusinessInquiryFormsManager({
  settings,
  createAction,
  unarchiveAction,
  plan,
}: BusinessInquiryFormsManagerProps) {
  const businessCheckout = useBusinessCheckout();
  const [createState, createFormAction, isCreatePending] = useActionStateWithSonner(
    createAction,
    initialState,
  );
  const [businessType, setBusinessType] = useState<BusinessType>(
    getStarterTemplateBusinessType(settings.businessType),
  );
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [/* unarchiveState */, unarchiveFormAction, isUnarchivePending] = useActionStateWithSonner(
    unarchiveAction,
    initialState,
  );
  const effectiveplan =
    businessCheckout
      ? businessCheckout.currentPlan
      : plan;
  const nameError = createState.fieldErrors?.name?.[0];
  const businessTypeError = createState.fieldErrors?.businessType?.[0];
  const activeForms = settings.forms.filter((form) => !form.archivedAt);
  const archivedForms = settings.forms.filter((form) => form.archivedAt);
  const canCreateAdditionalForms =
    hasFeatureAccess(effectiveplan, "multipleForms") ||
    activeForms.length === 0;

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8">
        <div className="flex justify-end gap-2">
          {archivedForms.length > 0 && (
            <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileArchive data-icon="inline-start" />
                  Archived
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Archived forms</DialogTitle>
                  <DialogDescription>
                    These forms are disabled and no longer accept new submissions.
                  </DialogDescription>
                </DialogHeader>
                <DialogBody className="gap-4">
                    {archivedForms.map((form) => (
                      <Card className="border-border/70 bg-background/75" key={form.id}>
                        <CardHeader className="gap-3 pb-2 pt-4">
                          <div className="flex flex-col gap-1">
                            <CardTitle className="text-base">
                              <TruncatedWithTooltip text={form.name} />
                            </CardTitle>
                            <CardDescription className="font-mono text-xs">
                              {form.slug}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between gap-3 pb-4 pt-2">
                          <Badge variant="secondary">
                            {businessTypeMeta[form.businessType]?.label ?? "General"}
                          </Badge>
                          <form action={unarchiveFormAction}>
                            <input type="hidden" name="targetFormId" value={form.id} />
                            <Button size="sm" variant="outline" disabled={isUnarchivePending}>
                              <ArchiveRestore data-icon="inline-start" className="size-3.5" />
                              Unarchive
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    ))}
                </DialogBody>
              </DialogContent>
            </Dialog>
          )}

          {canCreateAdditionalForms ? (
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
          ) : (
            <LockedAction
              feature="multipleForms"
              plan={effectiveplan}
              description="Create additional inquiry forms for different services or audiences."
            >
              <Button>
                <Plus data-icon="inline-start" />
                Create form
              </Button>
            </LockedAction>
          )}
        </div>

        {activeForms.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeForms.map((form) => (
              <Card className="h-full border-border/80 bg-card/98" key={form.id}>
                <CardHeader className="gap-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex w-0 min-w-0 flex-1 items-start gap-3">
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
                      <>
                        <Button asChild>
                          <Link
                            href={getBusinessPublicInquiryUrl(settings.slug, form.slug)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open live form
                            <ArrowUpRight data-icon="inline-end" />
                          </Link>
                        </Button>
                        <FormShareDialog
                          settingsSlug={settings.slug}
                          businessName={settings.name}
                          formSlug={form.slug}
                          formName={form.name}
                        />
                      </>
                    ) : (
                      <Button disabled type="button">
                        Form unpublished
                      </Button>
                    )}

                    <Button asChild type="button" variant="outline" className="px-3 sm:px-4">
                      <Link
                        href={getBusinessInquiryFormEditorPath(settings.slug, form.slug)}
                        prefetch={true}
                      >
                        <PencilLine className="size-4 sm:-ml-1 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                        <span className="sr-only">Edit</span>
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
              Create an inquiry form to publish a page for incoming inquiries.
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


function FormShareDialog({
  settingsSlug,
  businessName,
  formSlug,
  formName,
}: {
  settingsSlug: string;
  businessName: string;
  formSlug: string;
  formName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isClient = typeof window !== "undefined";
  const url = isClient
    ? new URL(getBusinessPublicInquiryUrl(settingsSlug, formSlug), window.location.origin).toString()
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleDownload = () => {
    const svgElement = document.getElementById(`qr-svg-${formSlug}`);
    if (!svgElement) return;

    // Dimensions for the premium custom frame
    const qrSize = 320;
    const paddingX = 48;
    const paddingTop = 56;
    const paddingBottom = 56;
    const textHeaderHeight = 90;
    const shadowMargin = 40; // Room for drop shadow and transparent border
    
    const cardWidth = qrSize + paddingX * 2;
    const cardHeight = qrSize + paddingTop + textHeaderHeight + paddingBottom;
    
    const finalWidth = cardWidth + shadowMargin * 2;
    const finalHeight = cardHeight + shadowMargin * 2;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    canvas.width = finalWidth;
    canvas.height = finalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Clear background for PNG transparency
    ctx.clearRect(0, 0, finalWidth, finalHeight);

    // 2. Draw the floating card with shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#ffffff";
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(shadowMargin, shadowMargin, cardWidth, cardHeight, 32);
    } else {
      ctx.rect(shadowMargin, shadowMargin, cardWidth, cardHeight);
    }
    ctx.fill();

    // Reset shadow for inner elements
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 3. Draw a subtle inner border
    ctx.strokeStyle = "#f3f4f6"; // Tailwind gray-100
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Draw text header
    const centerX = finalWidth / 2;
    const cardStartY = shadowMargin + paddingTop;

    ctx.fillStyle = "#111827"; // gray-900
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(businessName, centerX, cardStartY + 20);

    ctx.fillStyle = "#6B7280"; // gray-500
    ctx.font = "500 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(formName, centerX, cardStartY + 52);

    const img = new Image();
    img.onload = () => {
      const qrX = shadowMargin + paddingX;
      const qrY = cardStartY + textHeaderHeight;
      
      // 5. Draw the QR code
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // 6. Draw the center logo box
      const logoBoxSize = 72; // Roughly 22% of 320
      const logoX = qrX + (qrSize - logoBoxSize) / 2;
      const logoY = qrY + (qrSize - logoBoxSize) / 2;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(logoX, logoY, logoBoxSize, logoBoxSize, 16);
      } else {
        ctx.rect(logoX, logoY, logoBoxSize, logoBoxSize);
      }
      ctx.fill();
      
      // Add a tiny shadow to the inner Requo logo box to separate it from the QR blocks
      ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fill();

      // 7. Draw the Requo icon in the middle
      const logoImg = new Image();
      logoImg.onload = () => {
        // Reset shadow for image
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        const logoSize = 48;
        const imgX = logoX + (logoBoxSize - logoSize) / 2;
        const imgY = logoY + (logoBoxSize - logoSize) / 2;
        ctx.drawImage(logoImg, imgX, imgY, logoSize, logoSize);

        // Finalize download (no footer text)
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `${formName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      logoImg.src = "/logo.svg";
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="px-3 sm:px-4">
          <Link2 className="size-4 sm:-ml-1 sm:mr-2" />
          <span className="hidden sm:inline">Share</span>
          <span className="sr-only">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share form</DialogTitle>
          <DialogDescription>
            Share this inquiry form link or scan the QR code.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="items-center gap-6">
          <div className="relative mx-auto flex items-center justify-center rounded-xl border border-border/70 bg-white p-4">
            <QRCodeSVG
              id={`qr-svg-${formSlug}`}
              value={url}
              size={200}
              level="H"
              imageSettings={{
                src: "/logo.svg",
                height: 44,
                width: 44,
                excavate: true,
              }}
            />
          </div>
          <div className="flex w-full items-center gap-2">
            <code className="block flex-1 truncate rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {url}
            </code>
            <Button size="sm" variant="outline" type="button" onClick={handleCopy}>
              Copy
            </Button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={handleDownload}>
            <Download data-icon="inline-start" />
            Download QR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

