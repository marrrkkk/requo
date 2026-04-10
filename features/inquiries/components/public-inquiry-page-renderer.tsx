"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { PublicHeroSurface } from "@/components/shared/public-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicInquiryForm } from "@/features/inquiries/components/public-inquiry-form";
import { inquiryPageCardIconMeta } from "@/features/inquiries/page-config";
import type {
  PublicInquiryFormState,
  PublicInquiryBusiness,
} from "@/features/inquiries/types";
import { cn } from "@/lib/utils";

type PublicInquiryPageRendererProps = {
  business: PublicInquiryBusiness;
  action: (
    state: PublicInquiryFormState,
    formData: FormData,
  ) => Promise<PublicInquiryFormState>;
  headerAction?: ReactNode;
  beforeHero?: ReactNode;
  previewMode?: boolean;
};

export function PublicInquiryPageRenderer({
  business,
  action,
  headerAction,
  beforeHero,
  previewMode = false,
}: PublicInquiryPageRendererProps) {
  const config = business.inquiryPageConfig;

  return (
    <div className="public-page">
      <div className="public-page-stack">
        {beforeHero}

        <header className="public-page-header">
          <BusinessInquiryBrand business={business} />
          {headerAction ? (
            <div className="flex w-full flex-col gap-3 [&>*]:w-full sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:[&>*]:w-auto">
              {headerAction}
            </div>
          ) : null}
        </header>

        {config.template === "stacked" ? (
          <StackedInquiryTemplate
            business={business}
            action={action}
            previewMode={previewMode}
          />
        ) : null}
        {config.template === "showcase" ? (
          <ShowcaseInquiryTemplate
            business={business}
            action={action}
            previewMode={previewMode}
          />
        ) : null}
        {config.template === "split" ? (
          <SplitInquiryTemplate
            business={business}
            action={action}
            previewMode={previewMode}
          />
        ) : null}
      </div>
    </div>
  );
}

function SplitInquiryTemplate({
  business,
  action,
  previewMode,
}: Pick<PublicInquiryPageRendererProps, "business" | "action" | "previewMode">) {
  const config = business.inquiryPageConfig;

  return (
    <PublicHeroSurface className="lg:py-12">
      <div className="flex flex-col gap-6 xl:hidden">
        <InquiryIntro business={business} />
        <InquiryFormCard
          action={action}
          title={config.formTitle}
          description={config.formDescription}
          previewMode={previewMode}
          business={business}
        />
        <InquirySupportCards cards={config.cards} />
      </div>

      <div className="hidden gap-10 xl:grid xl:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.8fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <InquiryIntro business={business} />
          <InquirySupportCards cards={config.cards} />
        </div>

        <InquiryFormCard
          action={action}
          title={config.formTitle}
          description={config.formDescription}
          previewMode={previewMode}
          business={business}
          className="xl:sticky xl:top-6"
        />
      </div>
    </PublicHeroSurface>
  );
}

function StackedInquiryTemplate({
  business,
  action,
  previewMode,
}: Pick<PublicInquiryPageRendererProps, "business" | "action" | "previewMode">) {
  const config = business.inquiryPageConfig;

  return (
    <PublicHeroSurface className="lg:py-12">
      <div className="flex flex-col gap-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
          <InquiryIntro business={business} align="center" />
        </div>

        <InquirySupportCards cards={config.cards} variant="stacked" />

        <div className="mx-auto w-full max-w-4xl">
          <InquiryFormCard
            action={action}
            title={config.formTitle}
            description={config.formDescription}
            previewMode={previewMode}
            business={business}
          />
        </div>
      </div>
    </PublicHeroSurface>
  );
}

function ShowcaseInquiryTemplate({
  business,
  action,
  previewMode,
}: Pick<PublicInquiryPageRendererProps, "business" | "action" | "previewMode">) {
  const config = business.inquiryPageConfig;

  return (
    <PublicHeroSurface className="lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(20rem,0.88fr)_minmax(0,1.12fr)]">
        <InquiryFormCard
          action={action}
          title={config.formTitle}
          description={config.formDescription}
          previewMode={previewMode}
          business={business}
          className="lg:sticky lg:top-6"
        />

        <div className="flex min-w-0 flex-col gap-6">
          <div className="hero-panel">
            <div className="grid gap-6 p-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:p-8">
              <BusinessInquirySpotlight business={business} />
              <InquiryIntro business={business} />
            </div>
          </div>

          <InquirySupportCards cards={config.cards} variant="showcase" />
        </div>
      </div>
    </PublicHeroSurface>
  );
}

function BusinessInquiryBrand({ business }: { business: PublicInquiryBusiness }) {
  const brandTagline = business.inquiryPageConfig.brandTagline;

  return (
    <div className="flex min-w-0 items-center gap-4">
      <BusinessBrandBadge business={business} size="md" />
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-semibold tracking-tight text-foreground">
          {business.name}
        </p>
        {brandTagline ? (
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {brandTagline}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BusinessInquirySpotlight({
  business,
}: {
  business: PublicInquiryBusiness;
}) {
  const brandTagline = business.inquiryPageConfig.brandTagline;

  return (
    <div className="soft-panel flex h-full flex-col justify-between gap-4 bg-secondary/70 p-5 shadow-none">
      <BusinessBrandBadge business={business} size="lg" />
      <div className="space-y-2">
        <p className="meta-label">Business</p>
        <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {business.name}
        </p>
        {brandTagline ? (
          <p className="text-sm leading-7 text-muted-foreground">{brandTagline}</p>
        ) : null}
      </div>
    </div>
  );
}

function BusinessBrandBadge({
  business,
  size,
}: {
  business: PublicInquiryBusiness;
  size: "md" | "lg";
}) {
  const sizeClassName = size === "lg" ? "size-20 rounded-2xl" : "size-14 rounded-2xl";
  const imageSize = size === "lg" ? 48 : 34;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-border/70 bg-background/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.54)]",
        sizeClassName,
      )}
    >
      {business.logoUrl ? (
        <Image
          src={business.logoUrl}
          alt={`${business.name} logo`}
          width={imageSize}
          height={imageSize}
          className="max-h-[70%] w-auto object-contain"
          unoptimized
        />
      ) : (
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
          {getBusinessInitials(business.name)}
        </span>
      )}
    </div>
  );
}

function InquiryIntro({
  business,
  align = "start",
}: {
  business: PublicInquiryBusiness;
  align?: "start" | "center";
}) {
  const config = business.inquiryPageConfig;

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
      )}
    >
      {config.eyebrow ? <span className="eyebrow">{config.eyebrow}</span> : null}
      <div className="flex flex-col gap-4">
        <h1 className="max-w-3xl font-heading text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
          {config.headline}
        </h1>
        {config.description ? (
          <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            {config.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InquirySupportCards({
  cards,
  variant = "split",
}: {
  cards: PublicInquiryBusiness["inquiryPageConfig"]["cards"];
  variant?: "split" | "stacked" | "showcase";
}) {
  if (!cards.length) {
    return null;
  }

  const gridClassName =
    variant === "stacked"
      ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3"
      : variant === "showcase"
        ? "grid gap-3 md:grid-cols-2"
        : "grid gap-3";

  return (
    <div className={gridClassName}>
      {cards.map((card) => {
        const Icon = inquiryPageCardIconMeta[card.icon].icon;

        return (
          <Card key={card.id} size="sm" className="bg-background/92">
            <CardHeader className="gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </div>
              <div className="flex flex-col gap-1">
                <CardTitle>{card.title}</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

function InquiryFormCard({
  business,
  action,
  title,
  description,
  className,
  previewMode,
}: {
  business: PublicInquiryBusiness;
  action: PublicInquiryPageRendererProps["action"];
  title: string;
  description?: string;
  className?: string;
  previewMode?: boolean;
}) {
  return (
    <Card className={cn("gap-0 border-border/75 bg-card/96", className)}>
      <CardHeader className="gap-2 pb-5">
        <CardTitle className="text-2xl">{title}</CardTitle>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        <PublicInquiryForm
          business={business}
          action={action}
          previewMode={previewMode}
        />
      </CardContent>
    </Card>
  );
}

function getBusinessInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
