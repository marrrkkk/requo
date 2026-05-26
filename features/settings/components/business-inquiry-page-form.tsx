"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Eye } from "lucide-react";

import { FloatingFormActions } from "@/components/shared/floating-form-actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { Button } from "@/components/ui/button";
import type { BusinessType } from "@/features/inquiries/business-types";
import { getFieldError } from "@/lib/action-state";
import {
  createInquiryPageBusinessContact,
  maxInquiryPageCards,
  type InquiryPageCard,
  type InquiryPageMobileLayout,
  type InquiryPageShowcaseImageCrop,
  type InquiryPageShowcaseImageFrame,
  type InquiryPageShowcaseImageSize,
  type InquiryPageTemplate,
} from "@/features/inquiries/page-config";
import type {
  BusinessInquiryPageActionState,
  BusinessInquiryPagePreviewDraft,
  BusinessInquiryPageSettingsView,
} from "@/features/settings/types";
import { isInquiryPageCustomizationLocked } from "@/features/inquiries/plan-rules";
import { cn } from "@/lib/utils";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import {
  BasicsSection,
  ContentSection,
  LayoutSection,
  CardsSection,
  ShowcaseSection,
  ContactSection,
  CropDialog,
} from "./inquiry-page-form";

type BusinessInquiryPageFormProps = {
  action: (
    state: BusinessInquiryPageActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryPageActionState>;
  settings: BusinessInquiryPageSettingsView;
  logoPreviewUrl: string | null;
  generalSettingsHref: string | null;
  settingsHref: string;
  onDraftChange: (draft: BusinessInquiryPagePreviewDraft) => void;
  onPreview: () => void;
};

const initialState: BusinessInquiryPageActionState = {};

export function BusinessInquiryPageForm({
  action,
  settings,
  logoPreviewUrl,
  generalSettingsHref,
  settingsHref,
  onDraftChange,
  onPreview,
}: BusinessInquiryPageFormProps) {
  const router = useProgressRouter();
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const pageCustomizationLocked = isInquiryPageCustomizationLocked(
    settings.plan,
  );
  const [formName, setFormName] = useState(settings.formName);
  const [formSlug, setFormSlug] = useState(settings.formSlug);
  const [businessType, setBusinessType] = useState<BusinessType>(
    settings.businessType,
  );
  const [template, setTemplate] = useState<InquiryPageTemplate>(
    pageCustomizationLocked
      ? "no_supporting_cards"
      : settings.inquiryPageConfig.template,
  );
  const [mobileLayout, setMobileLayout] = useState<InquiryPageMobileLayout>(
    settings.inquiryPageConfig.mobileLayout ?? "full",
  );
  const [showSupportingCards, setShowSupportingCards] = useState(
    pageCustomizationLocked ? false : settings.inquiryPageConfig.showSupportingCards,
  );
  const [showShowcaseImage, setShowShowcaseImage] = useState(
    pageCustomizationLocked ? false : settings.inquiryPageConfig.showShowcaseImage,
  );
  const [showBusinessContact, setShowBusinessContact] = useState(
    settings.inquiryPageConfig.showBusinessContact,
  );
  const [cards, setCards] = useState<InquiryPageCard[]>(
    settings.inquiryPageConfig.cards,
  );
  const [eyebrow, setEyebrow] = useState(
    settings.inquiryPageConfig.eyebrow ?? "",
  );
  const [brandTagline, setBrandTagline] = useState(
    settings.inquiryPageConfig.brandTagline ?? "",
  );
  const [headline, setHeadline] = useState(settings.inquiryPageConfig.headline);
  const [description, setDescription] = useState(
    settings.inquiryPageConfig.description ?? "",
  );
  const [formTitle, setFormTitle] = useState(settings.inquiryPageConfig.formTitle);
  const [formDescription, setFormDescription] = useState(
    settings.inquiryPageConfig.formDescription ?? "",
  );
  const [thankYouMessage, setThankYouMessage] = useState(
    settings.inquiryPageConfig.thankYouMessage ?? "",
  );
  const [businessContactPhone, setBusinessContactPhone] = useState(
    settings.inquiryPageConfig.businessContact?.phone ?? "",
  );
  const [businessContactEmail, setBusinessContactEmail] = useState(
    settings.inquiryPageConfig.businessContact?.email ?? "",
  );
  const [businessFacebookUrl, setBusinessFacebookUrl] = useState(
    settings.inquiryPageConfig.businessContact?.socialLinks?.facebook ?? "",
  );
  const [businessInstagramUrl, setBusinessInstagramUrl] = useState(
    settings.inquiryPageConfig.businessContact?.socialLinks?.instagram ?? "",
  );
  const [businessTwitterXUrl, setBusinessTwitterXUrl] = useState(
    settings.inquiryPageConfig.businessContact?.socialLinks?.twitterX ?? "",
  );
  const [activeSection, setActiveSection] = useState("basics");
  const [businessLinkedinUrl, setBusinessLinkedinUrl] = useState(
    settings.inquiryPageConfig.businessContact?.socialLinks?.linkedin ?? "",
  );
  const [showcaseImageUrl, setShowcaseImageUrl] = useState(
    settings.inquiryPageConfig.showcaseImage?.url ?? "",
  );
  const [showcaseImageFrame, setShowcaseImageFrame] =
    useState<InquiryPageShowcaseImageFrame>(
      settings.inquiryPageConfig.showcaseImage?.frame ?? "landscape",
    );
  const [showcaseImageSize, setShowcaseImageSize] =
    useState<InquiryPageShowcaseImageSize>(
      settings.inquiryPageConfig.showcaseImage?.size ?? "standard",
    );
  const [showcaseImageCrop, setShowcaseImageCrop] =
    useState<InquiryPageShowcaseImageCrop>(
      settings.inquiryPageConfig.showcaseImage?.crop ?? {
        x: 0,
        y: 0,
        zoom: 1,
      },
    );
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const fieldErrors = state.fieldErrors;
  const nameError = getFieldError(fieldErrors, "name");
  const slugError = getFieldError(fieldErrors, "slug");
  const businessTypeError = getFieldError(fieldErrors, "businessType");
  const templateError = getFieldError(fieldErrors, "template");
  const eyebrowError = getFieldError(fieldErrors, "eyebrow");
  const headlineError = getFieldError(fieldErrors, "headline");
  const descriptionError = getFieldError(fieldErrors, "description");
  const brandTaglineError = getFieldError(fieldErrors, "brandTagline");
  const formTitleError = getFieldError(fieldErrors, "formTitle");
  const formDescriptionError = getFieldError(fieldErrors, "formDescription");
  const thankYouMessageError = getFieldError(fieldErrors, "thankYouMessage");
  const businessContactPhoneError = getFieldError(
    fieldErrors,
    "businessContactPhone",
  );
  const businessContactEmailError = getFieldError(
    fieldErrors,
    "businessContactEmail",
  );
  const businessFacebookUrlError = getFieldError(
    fieldErrors,
    "businessFacebookUrl",
  );
  const businessInstagramUrlError = getFieldError(
    fieldErrors,
    "businessInstagramUrl",
  );
  const businessTwitterXUrlError = getFieldError(
    fieldErrors,
    "businessTwitterXUrl",
  );
  const businessLinkedinUrlError = getFieldError(
    fieldErrors,
    "businessLinkedinUrl",
  );
  const showcaseImageUrlError = getFieldError(fieldErrors, "showcaseImageUrl");
  const showcaseImageFrameError = getFieldError(fieldErrors, "showcaseImageFrame");
  const showcaseImageSizeError = getFieldError(fieldErrors, "showcaseImageSize");
  const showcaseImageCropXError = getFieldError(fieldErrors, "showcaseImageCropX");
  const showcaseImageCropYError = getFieldError(fieldErrors, "showcaseImageCropY");
  const showcaseImageCropZoomError = getFieldError(fieldErrors, "showcaseImageCropZoom");
  const cardsError = getFieldError(fieldErrors, "cards");
  const effectiveTemplate = pageCustomizationLocked
    ? "no_supporting_cards"
    : template;
  const effectiveShowSupportingCards = pageCustomizationLocked
    ? false
    : showSupportingCards;
  const effectiveShowShowcaseImage = pageCustomizationLocked
    ? false
    : showShowcaseImage;
  const initialCardsSerialized = useMemo(
    () => JSON.stringify(settings.inquiryPageConfig.cards),
    [settings.inquiryPageConfig.cards],
  );
  const hasControlledChanges =
    formName !== settings.formName ||
    formSlug !== settings.formSlug ||
    businessType !== settings.businessType ||
    (!pageCustomizationLocked &&
      template !== settings.inquiryPageConfig.template) ||
    mobileLayout !== (settings.inquiryPageConfig.mobileLayout ?? "full") ||
    (!pageCustomizationLocked &&
      showSupportingCards !== settings.inquiryPageConfig.showSupportingCards) ||
    (!pageCustomizationLocked &&
      showShowcaseImage !== settings.inquiryPageConfig.showShowcaseImage) ||
    showBusinessContact !== settings.inquiryPageConfig.showBusinessContact ||
    eyebrow !== (settings.inquiryPageConfig.eyebrow ?? "") ||
    brandTagline !== (settings.inquiryPageConfig.brandTagline ?? "") ||
    headline !== settings.inquiryPageConfig.headline ||
    description !== (settings.inquiryPageConfig.description ?? "") ||
    formTitle !== settings.inquiryPageConfig.formTitle ||
    formDescription !== (settings.inquiryPageConfig.formDescription ?? "") ||
    thankYouMessage !== (settings.inquiryPageConfig.thankYouMessage ?? "") ||
    businessContactPhone !==
      (settings.inquiryPageConfig.businessContact?.phone ?? "") ||
    businessContactEmail !==
      (settings.inquiryPageConfig.businessContact?.email ?? "") ||
    businessFacebookUrl !==
      (settings.inquiryPageConfig.businessContact?.socialLinks?.facebook ?? "") ||
    businessInstagramUrl !==
      (settings.inquiryPageConfig.businessContact?.socialLinks?.instagram ?? "") ||
    businessTwitterXUrl !==
      (settings.inquiryPageConfig.businessContact?.socialLinks?.twitterX ?? "") ||
    businessLinkedinUrl !==
      (settings.inquiryPageConfig.businessContact?.socialLinks?.linkedin ?? "") ||
    (!pageCustomizationLocked &&
      showcaseImageUrl !==
        (settings.inquiryPageConfig.showcaseImage?.url ?? "")) ||
    (!pageCustomizationLocked &&
      showcaseImageFrame !==
        (settings.inquiryPageConfig.showcaseImage?.frame ?? "landscape")) ||
    (!pageCustomizationLocked &&
      showcaseImageSize !==
        (settings.inquiryPageConfig.showcaseImage?.size ?? "standard")) ||
    (!pageCustomizationLocked &&
      JSON.stringify(showcaseImageCrop) !==
        JSON.stringify(
          settings.inquiryPageConfig.showcaseImage?.crop ?? {
            x: 0,
            y: 0,
            zoom: 1,
          },
        )) ||
    (!pageCustomizationLocked && JSON.stringify(cards) !== initialCardsSerialized);
  const hasUnsavedChanges = hasControlledChanges;
  const [shouldRenderFloatingActions, setShouldRenderFloatingActions] = useState(false);
  const [floatingActionsState, setFloatingActionsState] = useState<"open" | "closed">(
    "closed",
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();
  }, [router, state.success]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (hasUnsavedChanges) {
      queueMicrotask(() => {
        setShouldRenderFloatingActions(true);
        setFloatingActionsState("open");
      });
      return;
    }

    queueMicrotask(() => {
      setFloatingActionsState("closed");
    });
    const timeout = window.setTimeout(
      () => setShouldRenderFloatingActions(false),
      prefersReducedMotion ? 0 : 180,
    );
    return () => window.clearTimeout(timeout);
  }, [hasUnsavedChanges, prefersReducedMotion]);

  const draftBusinessContact = useMemo(
    () =>
      createInquiryPageBusinessContact({
        phone: businessContactPhone,
        email: businessContactEmail,
        socialLinks: {
          facebook: businessFacebookUrl,
          instagram: businessInstagramUrl,
          twitterX: businessTwitterXUrl,
          linkedin: businessLinkedinUrl,
        },
      }),
    [
      businessContactEmail,
      businessContactPhone,
      businessFacebookUrl,
      businessInstagramUrl,
      businessLinkedinUrl,
      businessTwitterXUrl,
    ],
  );

  const draftInquiryPageConfig = useMemo(
    () => ({
      template: effectiveTemplate,
      mobileLayout,
      showSupportingCards: effectiveShowSupportingCards,
      showShowcaseImage: effectiveShowShowcaseImage,
      showBusinessContact,
      cards,
      eyebrow: normalizeOptionalTextDraft(eyebrow),
      brandTagline: normalizeOptionalTextDraft(brandTagline),
      headline: headline.trim(),
      description: normalizeOptionalTextDraft(description),
      formTitle: formTitle.trim(),
      formDescription: normalizeOptionalTextDraft(formDescription),
      thankYouMessage: normalizeOptionalTextDraft(thankYouMessage),
      businessContact: draftBusinessContact,
      showcaseImage: showcaseImageUrl.trim()
        ? {
            url: showcaseImageUrl.trim(),
            frame: showcaseImageFrame,
            size: showcaseImageSize,
            crop: showcaseImageCrop,
          }
        : undefined,
    }),
    [
      brandTagline,
      cards,
      description,
      draftBusinessContact,
      effectiveShowShowcaseImage,
      effectiveShowSupportingCards,
      effectiveTemplate,
      eyebrow,
      formDescription,
      formTitle,
      headline,
      mobileLayout,
      showBusinessContact,
      showcaseImageCrop,
      showcaseImageFrame,
      showcaseImageSize,
      showcaseImageUrl,
      thankYouMessage,
    ],
  );

  useEffect(() => {
    onDraftChange({
      businessType,
      formName,
      formSlug,
      publicInquiryEnabled: settings.publicInquiryEnabled,
      inquiryPageConfig: draftInquiryPageConfig,
    });
  }, [
    businessType,
    draftInquiryPageConfig,
    formName,
    formSlug,
    onDraftChange,
    settings.publicInquiryEnabled,
  ]);

  const hasReachedCardLimit = cards.length >= maxInquiryPageCards;

  function updateCard(
    cardId: string,
    key: keyof InquiryPageCard,
    nextValue: string,
  ) {
    setCards((currentCards) =>
      currentCards.map((card) =>
        card.id === cardId ? { ...card, [key]: nextValue } : card,
      ),
    );
  }

  function removeCard(cardId: string) {
    setCards((currentCards) => currentCards.filter((card) => card.id !== cardId));
  }

  function addCard() {
    if (hasReachedCardLimit) {
      return;
    }

    setCards((currentCards) => [
      ...currentCards,
      {
        id: `card_${crypto.randomUUID().replace(/-/g, "")}`,
        title: "",
        description: "",
        icon: "details",
      },
    ]);
  }

  function handleCardDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setCards((currentCards) => {
      const activeIndex = currentCards.findIndex((card) => card.id === active.id);
      const overIndex = currentCards.findIndex((card) => card.id === over.id);

      if (activeIndex < 0 || overIndex < 0) {
        return currentCards;
      }

      return arrayMove(currentCards, activeIndex, overIndex);
    });
  }

  function handleOpenCropDialog() {
    const trimmedUrl = showcaseImageUrl.trim();

    if (!trimmedUrl) {
      return;
    }

    setIsCropDialogOpen(true);
  }

  function handleCropApply(crop: InquiryPageShowcaseImageCrop) {
    setShowcaseImageCrop(crop);
  }

  function handleCancelChanges() {
    formRef.current?.reset();
    setFormName(settings.formName);
    setFormSlug(settings.formSlug);
    setBusinessType(settings.businessType);
    setTemplate(
      pageCustomizationLocked
        ? "no_supporting_cards"
        : settings.inquiryPageConfig.template,
    );
    setMobileLayout(settings.inquiryPageConfig.mobileLayout ?? "full");
    setShowSupportingCards(
      pageCustomizationLocked
        ? false
        : settings.inquiryPageConfig.showSupportingCards,
    );
    setShowShowcaseImage(
      pageCustomizationLocked
        ? false
        : settings.inquiryPageConfig.showShowcaseImage,
    );
    setShowBusinessContact(settings.inquiryPageConfig.showBusinessContact);
    setCards(settings.inquiryPageConfig.cards);
    setEyebrow(settings.inquiryPageConfig.eyebrow ?? "");
    setBrandTagline(settings.inquiryPageConfig.brandTagline ?? "");
    setHeadline(settings.inquiryPageConfig.headline);
    setDescription(settings.inquiryPageConfig.description ?? "");
    setFormTitle(settings.inquiryPageConfig.formTitle);
    setFormDescription(settings.inquiryPageConfig.formDescription ?? "");
    setThankYouMessage(settings.inquiryPageConfig.thankYouMessage ?? "");
    setBusinessContactPhone(
      settings.inquiryPageConfig.businessContact?.phone ?? "",
    );
    setBusinessContactEmail(
      settings.inquiryPageConfig.businessContact?.email ?? "",
    );
    setBusinessFacebookUrl(
      settings.inquiryPageConfig.businessContact?.socialLinks?.facebook ?? "",
    );
    setBusinessInstagramUrl(
      settings.inquiryPageConfig.businessContact?.socialLinks?.instagram ?? "",
    );
    setBusinessTwitterXUrl(
      settings.inquiryPageConfig.businessContact?.socialLinks?.twitterX ?? "",
    );
    setBusinessLinkedinUrl(
      settings.inquiryPageConfig.businessContact?.socialLinks?.linkedin ?? "",
    );
    setShowcaseImageUrl(settings.inquiryPageConfig.showcaseImage?.url ?? "");
    setShowcaseImageFrame(
      settings.inquiryPageConfig.showcaseImage?.frame ?? "landscape",
    );
    setShowcaseImageSize(
      settings.inquiryPageConfig.showcaseImage?.size ?? "standard",
    );
    setShowcaseImageCrop(
      settings.inquiryPageConfig.showcaseImage?.crop ?? {
        x: 0,
        y: 0,
        zoom: 1,
      },
    );
    setIsCropDialogOpen(false);
  }

  return (
    <form
      action={formAction}
      className="form-stack pb-28"
      ref={formRef}
    >
      <input name="formId" type="hidden" value={settings.formId} />
      <input name="businessType" type="hidden" value={businessType} />
      <input
        name="publicInquiryEnabled"
        type="hidden"
        value={String(settings.publicInquiryEnabled)}
      />
      <input name="template" type="hidden" value={effectiveTemplate} />
      <input name="mobileLayout" type="hidden" value={mobileLayout} />
      <input
        name="showSupportingCards"
        type="hidden"
        value={String(effectiveShowSupportingCards)}
      />
      <input
        name="showShowcaseImage"
        type="hidden"
        value={String(effectiveShowShowcaseImage)}
      />
      <input
        name="showBusinessContact"
        type="hidden"
        value={String(showBusinessContact)}
      />
      <input name="showcaseImageUrl" type="hidden" value={showcaseImageUrl} />
      <input
        name="showcaseImageFrame"
        type="hidden"
        value={showcaseImageFrame}
      />
      <input
        name="showcaseImageSize"
        type="hidden"
        value={showcaseImageSize}
      />
      <input
        name="showcaseImageCropX"
        type="hidden"
        value={String(showcaseImageCrop.x)}
      />
      <input
        name="showcaseImageCropY"
        type="hidden"
        value={String(showcaseImageCrop.y)}
      />
      <input
        name="showcaseImageCropZoom"
        type="hidden"
        value={String(showcaseImageCrop.zoom)}
      />
      <input name="cards" type="hidden" value={JSON.stringify(cards)} />

      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="flex flex-col gap-1.5 sm:px-2">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Page
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Edit what customers see on the public inquiry page.
          </p>
        </div>

        <PageSectionToc
          showCardsSection={pageCustomizationLocked || effectiveTemplate !== "no_supporting_cards"}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {activeSection === "basics" && (
          <BasicsSection
            formName={formName}
            formSlug={formSlug}
            businessType={businessType}
            isPending={isPending}
            nameError={nameError}
            slugError={slugError}
            businessTypeError={businessTypeError}
            settingsSlug={settings.slug}
            onFormNameChange={setFormName}
            onFormSlugChange={setFormSlug}
            onBusinessTypeChange={setBusinessType}
          />
        )}

        {activeSection === "content" && (
          <ContentSection
            headline={headline}
            formTitle={formTitle}
            thankYouMessage={thankYouMessage}
            eyebrow={eyebrow}
            brandTagline={brandTagline}
            description={description}
            formDescription={formDescription}
            isPending={isPending}
            pageCustomizationLocked={pageCustomizationLocked}
            plan={settings.plan}
            businessName={settings.name}
            shortDescription={settings.shortDescription}
            headlineError={headlineError}
            formTitleError={formTitleError}
            thankYouMessageError={thankYouMessageError}
            eyebrowError={eyebrowError}
            brandTaglineError={brandTaglineError}
            descriptionError={descriptionError}
            formDescriptionError={formDescriptionError}
            onHeadlineChange={setHeadline}
            onFormTitleChange={setFormTitle}
            onThankYouMessageChange={setThankYouMessage}
            onEyebrowChange={setEyebrow}
            onBrandTaglineChange={setBrandTagline}
            onDescriptionChange={setDescription}
            onFormDescriptionChange={setFormDescription}
          />
        )}

        {activeSection === "layout" && (
          <LayoutSection
            effectiveTemplate={effectiveTemplate}
            mobileLayout={mobileLayout}
            isPending={isPending}
            pageCustomizationLocked={pageCustomizationLocked}
            plan={settings.plan}
            templateError={templateError}
            logoPreviewUrl={logoPreviewUrl}
            generalSettingsHref={generalSettingsHref}
            settingsHref={settingsHref}
            businessName={settings.name}
            onTemplateChange={setTemplate}
            onMobileLayoutChange={setMobileLayout}
          />
        )}

        {activeSection === "cards" && (pageCustomizationLocked || effectiveTemplate !== "no_supporting_cards") ? (
          <CardsSection
            cards={cards}
            effectiveShowSupportingCards={effectiveShowSupportingCards}
            isPending={isPending}
            pageCustomizationLocked={pageCustomizationLocked}
            plan={settings.plan}
            hasReachedCardLimit={hasReachedCardLimit}
            prefersReducedMotion={prefersReducedMotion}
            cardsError={cardsError}
            onAddCard={addCard}
            onRemoveCard={removeCard}
            onUpdateCard={updateCard}
            onCardDragEnd={handleCardDragEnd}
            onShowSupportingCardsChange={setShowSupportingCards}
          />
        ) : null}

        {activeSection === "showcase" && (
          <ShowcaseSection
            showcaseImageUrl={showcaseImageUrl}
            showcaseImageFrame={showcaseImageFrame}
            showcaseImageSize={showcaseImageSize}
            showcaseImageCrop={showcaseImageCrop}
            effectiveShowShowcaseImage={effectiveShowShowcaseImage}
            isPending={isPending}
            pageCustomizationLocked={pageCustomizationLocked}
            plan={settings.plan}
            showcaseImageUrlError={showcaseImageUrlError}
            showcaseImageFrameError={showcaseImageFrameError}
            showcaseImageSizeError={showcaseImageSizeError}
            cropError={null}
            showcaseImageCropXError={showcaseImageCropXError}
            showcaseImageCropYError={showcaseImageCropYError}
            showcaseImageCropZoomError={showcaseImageCropZoomError}
            onShowcaseImageUrlChange={setShowcaseImageUrl}
            onShowcaseImageFrameChange={setShowcaseImageFrame}
            onShowcaseImageSizeChange={setShowcaseImageSize}
            onShowShowcaseImageChange={setShowShowcaseImage}
            onOpenCropDialog={handleOpenCropDialog}
          />
        )}

        {activeSection === "contact" && (
          <ContactSection
            showBusinessContact={showBusinessContact}
            businessContactPhone={businessContactPhone}
            businessContactEmail={businessContactEmail}
            businessFacebookUrl={businessFacebookUrl}
            businessInstagramUrl={businessInstagramUrl}
            businessTwitterXUrl={businessTwitterXUrl}
            businessLinkedinUrl={businessLinkedinUrl}
            isPending={isPending}
            businessContactPhoneError={businessContactPhoneError}
            businessContactEmailError={businessContactEmailError}
            businessFacebookUrlError={businessFacebookUrlError}
            businessInstagramUrlError={businessInstagramUrlError}
            businessTwitterXUrlError={businessTwitterXUrlError}
            businessLinkedinUrlError={businessLinkedinUrlError}
            onShowBusinessContactChange={setShowBusinessContact}
            onBusinessContactPhoneChange={setBusinessContactPhone}
            onBusinessContactEmailChange={setBusinessContactEmail}
            onBusinessFacebookUrlChange={setBusinessFacebookUrl}
            onBusinessInstagramUrlChange={setBusinessInstagramUrl}
            onBusinessTwitterXUrlChange={setBusinessTwitterXUrl}
            onBusinessLinkedinUrlChange={setBusinessLinkedinUrl}
          />
        )}
      </div>

      <FloatingFormActions
        extraAction={
          <Button disabled={isPending} onClick={onPreview} type="button" variant="outline">
            <Eye data-icon="inline-start" />
            Preview
          </Button>
        }
        isPending={isPending}
        onCancel={handleCancelChanges}
        stackActionsOnMobile
        state={floatingActionsState}
        visible={shouldRenderFloatingActions}
      />

      <CropDialog
        isOpen={isCropDialogOpen}
        showcaseImageUrl={showcaseImageUrl}
        showcaseImageFrame={showcaseImageFrame}
        showcaseImageCrop={showcaseImageCrop}
        onClose={() => setIsCropDialogOpen(false)}
        onApply={handleCropApply}
      />
    </form>
  );
}

const pageSectionTocItems: Array<{
  id: string;
  label: string;
  requiresCardsSection?: boolean;
}> = [
  { id: "basics", label: "Basics" },
  { id: "content", label: "Content" },
  { id: "layout", label: "Layout" },
  { id: "cards", label: "Cards", requiresCardsSection: true },
  { id: "showcase", label: "Showcase" },
  { id: "contact", label: "Contact" },
];

function PageSectionToc({
  showCardsSection,
  activeSection,
  onSectionChange,
}: {
  showCardsSection: boolean;
  activeSection: string;
  onSectionChange: (id: string) => void;
}) {
  const items = pageSectionTocItems.filter(
    (item) => !item.requiresCardsSection || showCardsSection,
  );

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6"
    >
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-border pb-px">
        {items.map((item) => (
          <button
            className={cn(
              "inline-flex shrink-0 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeSection === item.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function normalizeOptionalTextDraft(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
}
