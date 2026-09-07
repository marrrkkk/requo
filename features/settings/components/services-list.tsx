"use client";

import Link from "next/link";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  ArchiveRestore,
  ArrowUpRight,
  Download,
  FileArchive,
  Link2,
  MoreHorizontal,
  PencilLine,
  PencilRuler,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import {
  ResponsiveOverlay,
  ResponsiveOverlayBody,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
  ResponsiveOverlayTrigger,
} from "@/components/ui/responsive-overlay";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  BusinessInquiryFormDangerActionState,
  BusinessInquiryFormsActionState,
  BusinessInquiryFormsSettingsView,
} from "@/features/settings/types";
import { getBusinessServicePath } from "@/features/businesses/routes";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { hasFeatureAccess } from "@/lib/plans";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import { LockedAction } from "@/features/paywall";
import { useBusinessCheckout } from "@/features/billing/components/business-checkout-provider";

type ServicesListProps = {
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

export function ServicesList({
  settings,
  createAction,
  unarchiveAction,
  plan,
}: ServicesListProps) {
  const businessCheckout = useBusinessCheckout();
  const [createState, createFormAction, isCreatePending] =
    useActionStateWithSonner(createAction, initialState);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [, unarchiveFormAction, isUnarchivePending] =
    useActionStateWithSonner(unarchiveAction, initialState);
  const effectiveplan = businessCheckout
    ? businessCheckout.currentPlan
    : plan;
  const nameError = createState.fieldErrors?.name?.[0];
  const activeForms = settings.forms.filter((form) => !form.archivedAt);
  const archivedForms = settings.forms.filter((form) => form.archivedAt);
  const canCreateAdditionalForms =
    hasFeatureAccess(effectiveplan, "multipleForms") ||
    activeForms.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {archivedForms.length > 0 && (
            <ResponsiveOverlay
              open={isArchiveDialogOpen}
              onOpenChange={setIsArchiveDialogOpen}
            >
              <ResponsiveOverlayTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileArchive data-icon="inline-start" />
                  Archived ({archivedForms.length})
                </Button>
              </ResponsiveOverlayTrigger>
              <ResponsiveOverlayContent className="sm:max-w-xl">
                <ResponsiveOverlayHeader>
                  <ResponsiveOverlayTitle>
                    Archived services
                  </ResponsiveOverlayTitle>
                  <ResponsiveOverlayDescription>
                    These services are disabled and no longer accept new
                    submissions.
                  </ResponsiveOverlayDescription>
                </ResponsiveOverlayHeader>
                <ResponsiveOverlayBody className="gap-4">
                  {archivedForms.map((form) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/75 px-4 py-3"
                      key={form.id}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {form.name}
                        </p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {form.slug}
                        </p>
                      </div>
                      <form action={unarchiveFormAction}>
                        <input
                          type="hidden"
                          name="targetFormId"
                          value={form.id}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUnarchivePending}
                        >
                          <ArchiveRestore
                            data-icon="inline-start"
                            className="size-3.5"
                          />
                          Unarchive
                        </Button>
                      </form>
                    </div>
                  ))}
                </ResponsiveOverlayBody>
              </ResponsiveOverlayContent>
            </ResponsiveOverlay>
          )}
        </div>

        {canCreateAdditionalForms ? (
          <ResponsiveOverlay
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <ResponsiveOverlayTrigger asChild>
              <Button size="sm">
                <Plus data-icon="inline-start" />
                Create service
              </Button>
            </ResponsiveOverlayTrigger>
            <ResponsiveOverlayContent className="sm:max-w-xl">
              <ResponsiveOverlayHeader>
                <ResponsiveOverlayTitle>Create service</ResponsiveOverlayTitle>
                <ResponsiveOverlayDescription>
                  Add a new service and its public page for this business.
                </ResponsiveOverlayDescription>
              </ResponsiveOverlayHeader>

              <form
                action={createFormAction}
                className="flex min-h-0 flex-1 flex-col"
              >
                <ResponsiveOverlayBody className="gap-6">
                  <FieldGroup className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
                    <Field data-invalid={Boolean(nameError) || undefined}>
                      <FieldLabel htmlFor="business-inquiry-form-create-name">
                        Service name
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
                          errors={
                            nameError ? [{ message: nameError }] : undefined
                          }
                        />
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </ResponsiveOverlayBody>

                <ResponsiveOverlayFooter className="grid grid-cols-1 sm:grid-cols-2">
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
                        <Spinner
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus data-icon="inline-start" />
                        Create service
                      </>
                    )}
                  </Button>
                </ResponsiveOverlayFooter>
              </form>
            </ResponsiveOverlayContent>
          </ResponsiveOverlay>
        ) : (
          <LockedAction
            feature="multipleForms"
            plan={effectiveplan}
            description="Create additional services for different offerings or audiences."
          >
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Create service
            </Button>
          </LockedAction>
        )}
      </div>

      {/* List */}
      {activeForms.length ? (
        <>
          {/* Mobile list */}
          <div className="flex flex-col gap-2 sm:hidden">
            {activeForms.map((form) => (
              <Link
                key={form.id}
                href={getBusinessServicePath(
                  settings.slug,
                  form.slug,
                )}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background px-4 py-3.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
                  <PencilRuler className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{form.name}</p>
                    {form.isDefault ? (
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                      >
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.submittedInquiryCount}{" "}
                    {form.submittedInquiryCount === 1
                      ? "inquiry"
                      : "inquiries"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      form.publicInquiryEnabled
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground"
                    }
                  >
                    <span
                      className={cn(
                        "mr-1.5 inline-block size-1.5 rounded-full",
                        form.publicInquiryEnabled
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/50",
                      )}
                    />
                    {form.publicInquiryEnabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <DashboardTableContainer className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Inquiries</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <Link
                        href={getBusinessServicePath(
                          settings.slug,
                          form.slug,
                        )}
                        className="group flex items-center gap-3 py-0.5"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground transition-colors group-hover:border-border group-hover:text-foreground">
                          <PencilRuler className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium group-hover:underline">
                              {form.name}
                            </span>
                            {form.isDefault ? (
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                              >
                                Default
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          form.publicInquiryEnabled
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-border text-muted-foreground"
                        }
                      >
                        <span
                          className={cn(
                            "mr-1.5 inline-block size-1.5 rounded-full",
                            form.publicInquiryEnabled
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/50",
                          )}
                        />
                        {form.publicInquiryEnabled ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {form.submittedInquiryCount}
                    </TableCell>
                    <TableCell>
                      <FormRowActions
                        settingsSlug={settings.slug}
                        businessName={settings.name}
                        form={form}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DashboardTableContainer>
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PencilRuler />
            </EmptyMedia>
            <EmptyTitle>No active services</EmptyTitle>
            <EmptyDescription>
              Create a service to publish a page for incoming inquiries.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus data-icon="inline-start" />
              Create service
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}

type FormRowActionsProps = {
  settingsSlug: string;
  businessName: string;
  form: ServicesListProps["settings"]["forms"][number];
};

function FormRowActions({
  settingsSlug,
  businessName,
  form,
}: FormRowActionsProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link
              href={getBusinessServicePath(
                settingsSlug,
                form.slug,
              )}
            >
              <PencilLine className="mr-2 size-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          {form.publicInquiryEnabled && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  href={getBusinessPublicInquiryUrl(
                    settingsSlug,
                    form.slug,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ArrowUpRight className="mr-2 size-4" />
                  Open public page
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
                <Link2 className="mr-2 size-4" />
                Share
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {form.publicInquiryEnabled && (
        <FormShareDialog
          settingsSlug={settingsSlug}
          businessName={businessName}
          formSlug={form.slug}
          formName={form.name}
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
        />
      )}
    </>
  );
}

function FormShareDialog({
  settingsSlug,
  businessName,
  formSlug,
  formName,
  open,
  onOpenChange,
}: {
  settingsSlug: string;
  businessName: string;
  formSlug: string;
  formName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isClient = typeof window !== "undefined";
  const url = isClient
    ? new URL(
        getBusinessPublicInquiryUrl(settingsSlug, formSlug),
        window.location.origin,
      ).toString()
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

    const qrSize = 320;
    const paddingX = 48;
    const paddingTop = 56;
    const paddingBottom = 56;
    const textHeaderHeight = 90;
    const shadowMargin = 40;

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

    ctx.clearRect(0, 0, finalWidth, finalHeight);

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

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const centerX = finalWidth / 2;
    const cardStartY = shadowMargin + paddingTop;

    ctx.fillStyle = "#111827";
    ctx.font =
      "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(businessName, centerX, cardStartY + 20);

    ctx.fillStyle = "#6B7280";
    ctx.font =
      "500 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(formName, centerX, cardStartY + 52);

    const img = new Image();
    img.onload = () => {
      const qrX = shadowMargin + paddingX;
      const qrY = cardStartY + textHeaderHeight;

      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      const logoBoxSize = 72;
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

      ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fill();

      const logoImg = new Image();
      logoImg.onload = () => {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        const logoSize = 48;
        const imgX = logoX + (logoBoxSize - logoSize) / 2;
        const imgY = logoY + (logoBoxSize - logoSize) / 2;
        ctx.drawImage(logoImg, imgX, imgY, logoSize, logoSize);

        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `${formName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      logoImg.src = "/logo.svg";
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <ResponsiveOverlay open={open} onOpenChange={onOpenChange}>
      <ResponsiveOverlayContent className="sm:max-w-md">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>Share service</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>
            Share this service link or scan the QR code.
          </ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        <ResponsiveOverlayBody className="items-center gap-6">
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
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={handleCopy}
            >
              Copy
            </Button>
          </div>
        </ResponsiveOverlayBody>
        <ResponsiveOverlayFooter>
          <Button variant="outline" type="button" onClick={handleDownload}>
            <Download data-icon="inline-start" />
            Download QR
          </Button>
        </ResponsiveOverlayFooter>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
