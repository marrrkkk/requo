import Image from "next/image";
import type { ReactNode } from "react";
import { Facebook, Instagram, Linkedin, X } from "@thesvg/react";
import { ArrowUpRight, Mail, Phone, Share2 } from "lucide-react";

import { PublicHeroSurface } from "@/components/shared/public-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicInquiryForm } from "@/features/inquiries/components/public-inquiry-form";
import { InquiryShowcaseImageSurface } from "@/features/inquiries/components/inquiry-showcase-image-surface";
import {
  inquiryPageBusinessContactSocialMeta,
} from "@/features/inquiries/page-config";
import { inquiryPageCardIconMeta } from "@/features/inquiries/components/inquiry-page-card-icon-meta";
import type {
  PublicInquiryFormState,
  PublicInquiryBusiness,
} from "@/features/inquiries/types";
import { cn } from "@/lib/utils";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { MadeWithRequo } from "@/components/shared/made-with-requo";

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

        {config.template === "no_supporting_cards" ? (
          <NoSupportingCardsInquiryTemplate
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
      <InquiryBusinessContact business={business} centered />

      {!hasFeatureAccess(business.plan, "branding") ? (
        <MadeWithRequo />
      ) : null}
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
        {config.showSupportingCards ? (
          <InquirySupportCards cards={config.cards} />
        ) : null}
        <InquiryShowcaseImage business={business} />
        <InquiryFormCard
          action={action}
          title={config.formTitle}
          description={config.formDescription}
          previewMode={previewMode}
          business={business}
        />
      </div>

      <div className="hidden gap-12 xl:grid xl:grid-cols-[minmax(0,0.96fr)_minmax(22rem,0.84fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-7">
          <InquiryIntro business={business} />
          {config.showSupportingCards ? (
            <InquirySupportCards cards={config.cards} />
          ) : null}
          <InquiryShowcaseImage business={business} />
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

function NoSupportingCardsInquiryTemplate({
  business,
  action,
  previewMode,
}: Pick<PublicInquiryPageRendererProps, "business" | "action" | "previewMode">) {
  const config = business.inquiryPageConfig;

  return (
    <PublicHeroSurface className="lg:py-12">
      <div className="flex flex-col gap-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
          <InquiryIntro business={business} align="center" />
        </div>

        <InquiryShowcaseImage business={business} />

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
      <div className="grid gap-10 lg:grid-cols-[minmax(22rem,0.92fr)_minmax(0,1.08fr)]">
        <InquiryFormCard
          action={action}
          title={config.formTitle}
          description={config.formDescription}
          previewMode={previewMode}
          business={business}
          className="lg:sticky lg:top-6"
        />

        <div className="flex min-w-0 flex-col gap-7">
          <div className="hero-panel">
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:p-7">
              <BusinessInquirySpotlight business={business} />
              <InquiryIntro business={business} />
            </div>
          </div>

          {config.showSupportingCards ? (
            <InquirySupportCards cards={config.cards} />
          ) : null}
          <InquiryShowcaseImage business={business} />
        </div>
      </div>
    </PublicHeroSurface>
  );
}

function BusinessInquiryBrand({ business }: { business: PublicInquiryBusiness }) {
  const brandTagline = getResolvedBrandTagline(business);

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
  const brandTagline = getResolvedBrandTagline(business);

  return (
    <div className="soft-panel flex h-full flex-col justify-between gap-5 bg-secondary/70 p-6 shadow-none">
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
  const imageSize = size === "lg" ? 80 : 56;

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
          className="h-full w-full object-cover"
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

function getResolvedBrandTagline(business: PublicInquiryBusiness) {
  return (
    business.inquiryPageConfig.brandTagline?.trim() ||
    business.shortDescription?.trim() ||
    undefined
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
}: {
  cards: PublicInquiryBusiness["inquiryPageConfig"]["cards"];
}) {
  if (!cards.length) {
    return null;
  }

  const gridClassName = cn(
    "grid w-full items-stretch gap-4 sm:gap-5",
  );

  return (
    <div className={gridClassName}>
      {cards.map((card) => {
        const Icon = inquiryPageCardIconMeta[card.icon].icon;

        return (
          <Card
            key={card.id}
            size="sm"
            className="w-full bg-background/94"
          >
            <CardHeader className="px-5 py-4">
              <div className="flex items-center gap-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/85 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  <Icon className="size-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <CardTitle className="text-[1.02rem] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                    {card.title}
                  </CardTitle>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                    {card.description}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

function InquiryShowcaseImage({
  business,
}: {
  business: PublicInquiryBusiness;
}) {
  if (!business.inquiryPageConfig.showShowcaseImage) {
    return null;
  }

  const showcaseImage = business.inquiryPageConfig.showcaseImage;

  if (!showcaseImage?.url) {
    return null;
  }

  return (
    <div className="flex w-full justify-center">
      <InquiryShowcaseImageSurface
        alt={`Showcase image for ${business.name}`}
        className={getShowcaseImageSizeClass(showcaseImage.size)}
        crop={showcaseImage.crop}
        frame={showcaseImage.frame}
        url={showcaseImage.url}
      />
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

function getShowcaseImageSizeClass(
  size: NonNullable<PublicInquiryBusiness["inquiryPageConfig"]["showcaseImage"]>["size"],
) {
  switch (size) {
    case "compact":
      return "w-full max-w-md";
    case "large":
      return "w-full max-w-5xl";
    case "standard":
    default:
      return "w-full max-w-3xl";
  }
}

function InquiryBusinessContact({
  business,
  centered = false,
}: {
  business: PublicInquiryBusiness;
  centered?: boolean;
}) {
  if (!business.inquiryPageConfig.showBusinessContact) {
    return null;
  }

  const contact = business.inquiryPageConfig.businessContact;

  if (!contact) {
    return null;
  }

  const socialLinks = getBusinessContactSocialLinks(contact.socialLinks);

  if (!contact.phone && !contact.email && !socialLinks.length) {
    return null;
  }

  return (
    <section
      className={cn(
        "border-t border-border/65 pt-10 pb-4",
        centered && "text-center",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3",
          centered && "mx-auto max-w-2xl items-center",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap gap-x-5 gap-y-2.5",
            centered && "justify-center",
          )}
        >
          {contact.phone ? (
            <BusinessContactLink
              href={getPhoneHref(contact.phone)}
              icon={<Phone className="size-3.5" />}
              text={contact.phone}
            />
          ) : null}
          {contact.email ? (
            <BusinessContactLink
              href={`mailto:${contact.email}`}
              icon={<Mail className="size-3.5" />}
              text={contact.email}
            />
          ) : null}
          {socialLinks.map((socialLink) => (
            <BusinessContactLink
              key={socialLink.label}
              href={socialLink.href}
              icon={socialLink.icon}
              text={socialLink.label}
              external
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function BusinessContactLink({
  icon,
  text,
  href,
  external = false,
}: {
  icon: ReactNode;
  text: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <div
      className={cn(
        "group inline-flex min-w-0 items-center gap-2 text-sm leading-6 text-muted-foreground transition-colors",
        href && "hover:text-foreground",
      )}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="break-words text-foreground">{text}</span>
      {href && external ? (
        <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      ) : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <a
      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      href={href}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {content}
    </a>
  );
}

function getBusinessContactSocialLinks(
  socialLinks: NonNullable<
    PublicInquiryBusiness["inquiryPageConfig"]["businessContact"]
  >["socialLinks"],
) {
  if (!socialLinks) {
    return [];
  }

  return Object.entries(socialLinks).flatMap(([key, value]) => {
    if (!value) {
      return [];
    }

    const socialMeta =
      inquiryPageBusinessContactSocialMeta[
        key as keyof typeof inquiryPageBusinessContactSocialMeta
      ];

    if (!socialMeta) {
      return [];
    }

    let BrandIcon = Share2;
    if (key === "facebook") BrandIcon = Facebook;
    else if (key === "instagram") BrandIcon = Instagram;
    else if (key === "twitterX") BrandIcon = X;
    else if (key === "linkedin") BrandIcon = Linkedin;

    return [
      {
        href: value,
        label: socialMeta.label,
        icon: <BrandIcon className="size-3.5" fill="currentColor" width={14} height={14} />,
      },
    ];
  });
}

function getPhoneHref(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : undefined;
}
