"use client";

import Image from "next/image";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Cropper from "react-easy-crop";
import {
  Check,
  Crop,
  Eye,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import { FloatingFormActions } from "@/components/shared/floating-form-actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getStarterTemplateDefinition,
  getStarterTemplateBusinessType,
  starterTemplateOptions,
} from "@/features/businesses/starter-templates";
import type { BusinessType } from "@/features/inquiries/business-types";
import {
  InquiryShowcaseImageSurface,
} from "@/features/inquiries/components/inquiry-showcase-image-surface";
import { getFieldError } from "@/lib/action-state";
import {
  inquiryPageCardIconMeta,
  inquiryPageShowcaseImageFrameMeta,
  inquiryPageShowcaseImageSizeMeta,
  maxInquiryPageCardDescriptionLength,
  maxInquiryPageCardTitleLength,
  inquiryPageTemplateMeta,
  maxInquiryPageCards,
  type InquiryPageCard,
  type InquiryPageCardIcon,
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
import { publicSlugMaxLength, publicSlugPattern } from "@/lib/slugs";
import { cn } from "@/lib/utils";

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
const inquiryPageCardsDndContextId = "business-inquiry-page-cards-dnd";
const inquiryPageCardsSortableContextId = "business-inquiry-page-cards-sortable";
const inquiryPageSortableTransition = {
  duration: 160,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
} as const;

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
  const [formName, setFormName] = useState(settings.formName);
  const [formSlug, setFormSlug] = useState(settings.formSlug);
  const [businessType, setBusinessType] = useState<BusinessType>(
    settings.businessType,
  );
  const [template, setTemplate] = useState<InquiryPageTemplate>(
    settings.inquiryPageConfig.template,
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
  const [cropDraft, setCropDraft] = useState({ x: 0, y: 0 });
  const [cropZoomDraft, setCropZoomDraft] = useState(1);
  const [cropViewportSize, setCropViewportSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const cropViewportRef = useRef<HTMLDivElement>(null);
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
  const showcaseImageUrlError = getFieldError(fieldErrors, "showcaseImageUrl");
  const showcaseImageFrameError = getFieldError(fieldErrors, "showcaseImageFrame");
  const showcaseImageSizeError = getFieldError(fieldErrors, "showcaseImageSize");
  const showcaseImageCropXError = getFieldError(fieldErrors, "showcaseImageCropX");
  const showcaseImageCropYError = getFieldError(fieldErrors, "showcaseImageCropY");
  const showcaseImageCropZoomError = getFieldError(fieldErrors, "showcaseImageCropZoom");
  const cardsError = getFieldError(fieldErrors, "cards");
  const starterTemplate = getStarterTemplateDefinition(businessType);
  const initialCardsSerialized = useMemo(
    () => JSON.stringify(settings.inquiryPageConfig.cards),
    [settings.inquiryPageConfig.cards],
  );
  const hasControlledChanges =
    formName !== settings.formName ||
    formSlug !== settings.formSlug ||
    businessType !== settings.businessType ||
    template !== settings.inquiryPageConfig.template ||
    eyebrow !== (settings.inquiryPageConfig.eyebrow ?? "") ||
    brandTagline !== (settings.inquiryPageConfig.brandTagline ?? "") ||
    headline !== settings.inquiryPageConfig.headline ||
    description !== (settings.inquiryPageConfig.description ?? "") ||
    formTitle !== settings.inquiryPageConfig.formTitle ||
    formDescription !== (settings.inquiryPageConfig.formDescription ?? "") ||
    showcaseImageUrl !== (settings.inquiryPageConfig.showcaseImage?.url ?? "") ||
    showcaseImageFrame !==
      (settings.inquiryPageConfig.showcaseImage?.frame ?? "landscape") ||
    showcaseImageSize !==
      (settings.inquiryPageConfig.showcaseImage?.size ?? "standard") ||
    JSON.stringify(showcaseImageCrop) !==
      JSON.stringify(
        settings.inquiryPageConfig.showcaseImage?.crop ?? {
          x: 0,
          y: 0,
          zoom: 1,
        },
      ) ||
    JSON.stringify(cards) !== initialCardsSerialized;
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

  useLayoutEffect(() => {
    if (!isCropDialogOpen) {
      return;
    }

    const node = cropViewportRef.current;

    if (!node) {
      return;
    }

    const updateSize = () => {
      setCropViewportSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);

    return () => observer.disconnect();
  }, [isCropDialogOpen]);

  useEffect(() => {
    if (!isCropDialogOpen || !cropViewportSize) {
      return;
    }

    const nextCropDraft = {
      x: showcaseImageCrop.x * cropViewportSize.width,
      y: showcaseImageCrop.y * cropViewportSize.height,
    };
    const frame = window.requestAnimationFrame(() => {
      setCropDraft(nextCropDraft);
      setCropZoomDraft(showcaseImageCrop.zoom);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [cropViewportSize, isCropDialogOpen, showcaseImageCrop]);

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

  const draftInquiryPageConfig = useMemo(
    () => ({
      template,
      cards,
      eyebrow: normalizeOptionalTextDraft(eyebrow),
      brandTagline: normalizeOptionalTextDraft(brandTagline),
      headline: headline.trim(),
      description: normalizeOptionalTextDraft(description),
      formTitle: formTitle.trim(),
      formDescription: normalizeOptionalTextDraft(formDescription),
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
      eyebrow,
      formDescription,
      formTitle,
      headline,
      showcaseImageCrop,
      showcaseImageFrame,
      showcaseImageSize,
      showcaseImageUrl,
      template,
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
  const cardSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
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

    setCropError(null);
    setCropViewportSize(null);
    setIsCropDialogOpen(true);
  }

  function closeCropDialog() {
    setIsCropDialogOpen(false);
    setCropViewportSize(null);
  }

  function applyCropDraft() {
    const nextViewportWidth =
      cropViewportSize?.width ?? cropViewportRef.current?.clientWidth ?? 0;
    const nextViewportHeight =
      cropViewportSize?.height ?? cropViewportRef.current?.clientHeight ?? 0;

    if (nextViewportWidth <= 0 || nextViewportHeight <= 0) {
      setCropError("Wait a moment for the crop area to finish loading.");
      return;
    }

    setShowcaseImageCrop({
      x: cropDraft.x / nextViewportWidth,
      y: cropDraft.y / nextViewportHeight,
      zoom: cropZoomDraft,
    });
    setCropError(null);
    closeCropDialog();
  }

  function handleCancelChanges() {
    formRef.current?.reset();
    setFormName(settings.formName);
    setFormSlug(settings.formSlug);
    setBusinessType(settings.businessType);
    setTemplate(settings.inquiryPageConfig.template);
    setCards(settings.inquiryPageConfig.cards);
    setEyebrow(settings.inquiryPageConfig.eyebrow ?? "");
    setBrandTagline(settings.inquiryPageConfig.brandTagline ?? "");
    setHeadline(settings.inquiryPageConfig.headline);
    setDescription(settings.inquiryPageConfig.description ?? "");
    setFormTitle(settings.inquiryPageConfig.formTitle);
    setFormDescription(settings.inquiryPageConfig.formDescription ?? "");
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
    setCropError(null);
    setIsCropDialogOpen(false);
    setCropViewportSize(null);
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
      <input name="template" type="hidden" value={template} />
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

      <div className="flex flex-col gap-8 sm:gap-10">
        <section className="space-y-5">
          <SectionIntro
            description="Edit the public inquiry page."
            title="Page"
          />

          <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
            <div className="space-y-2">
              <p className="meta-label">Page setup</p>
              <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                Page details
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Name it, set the link, and write the intro.
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              <DetailsPanel
                description="Name this form."
                eyebrow="Name"
                title="Form name"
              >
                <Field data-invalid={Boolean(nameError) || undefined}>
                  <FieldLabel htmlFor="inquiry-page-form-name">Form name</FieldLabel>
                  <FieldContent>
                    <Input
                      aria-invalid={Boolean(nameError) || undefined}
                      disabled={isPending}
                      id="inquiry-page-form-name"
                      maxLength={80}
                      minLength={2}
                      name="name"
                      onChange={(event) => setFormName(event.currentTarget.value)}
                      required
                      value={formName}
                    />
                    <FieldError
                      errors={nameError ? [{ message: nameError }] : undefined}
                    />
                  </FieldContent>
                </Field>
              </DetailsPanel>

              <DetailsPanel
                description="Choose the public link."
                eyebrow="Link"
                title="Public link"
              >
                <Field data-invalid={Boolean(slugError) || undefined}>
                  <FieldLabel htmlFor="inquiry-page-form-slug">Form slug</FieldLabel>
                  <FieldContent>
                    <Input
                      aria-invalid={Boolean(slugError) || undefined}
                      disabled={isPending}
                      id="inquiry-page-form-slug"
                      maxLength={publicSlugMaxLength}
                      minLength={2}
                      name="slug"
                      onChange={(event) => setFormSlug(event.currentTarget.value)}
                      pattern={publicSlugPattern}
                      required
                      spellCheck={false}
                      value={formSlug}
                    />
                    <FieldDescription>
                      Public URL: `/inquire/{settings.slug}/{formSlug || "form-slug"}`.
                    </FieldDescription>
                    <FieldError
                      errors={slugError ? [{ message: slugError }] : undefined}
                    />
                  </FieldContent>
                </Field>
              </DetailsPanel>

              <DetailsPanel
                description="Pick the best starting point."
                eyebrow="Template"
                title="Starter template"
              >
                <Field data-invalid={Boolean(businessTypeError) || undefined}>
                  <FieldLabel htmlFor="inquiry-page-business-type">
                    Starter template
                  </FieldLabel>
                  <FieldContent>
                    <Combobox
                      aria-invalid={Boolean(businessTypeError) || undefined}
                      disabled={isPending}
                      id="inquiry-page-business-type"
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
                      value={getStarterTemplateBusinessType(businessType)}
                    />
                    <FieldDescription>
                      {starterTemplate.helperText}
                    </FieldDescription>
                    <FieldError
                      errors={
                        businessTypeError
                          ? [{ message: businessTypeError }]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
              </DetailsPanel>

              <DetailsPanel
                description="Shown above the form."
                eyebrow="Form"
                title="Heading and note"
              >
                <FieldGroup>
                  <Field data-invalid={Boolean(formTitleError) || undefined}>
                    <FieldLabel htmlFor="inquiry-page-form-title">Heading</FieldLabel>
                    <FieldContent>
                      <Input
                        aria-invalid={Boolean(formTitleError) || undefined}
                        disabled={isPending}
                        id="inquiry-page-form-title"
                        maxLength={80}
                        name="formTitle"
                        onChange={(event) => setFormTitle(event.currentTarget.value)}
                        required
                        value={formTitle}
                      />
                      <FieldError
                        errors={
                          formTitleError ? [{ message: formTitleError }] : undefined
                        }
                      />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(formDescriptionError) || undefined}>
                    <FieldLabel htmlFor="inquiry-page-form-description">
                      Optional note
                    </FieldLabel>
                    <FieldContent>
                      <Textarea
                        aria-invalid={Boolean(formDescriptionError) || undefined}
                        disabled={isPending}
                        id="inquiry-page-form-description"
                        maxLength={200}
                        name="formDescription"
                        onChange={(event) =>
                          setFormDescription(event.currentTarget.value)
                        }
                        placeholder="Optional note above the form"
                        rows={3}
                        value={formDescription}
                      />
                      <FieldDescription>
                        Leave blank if the heading is enough on its own.
                      </FieldDescription>
                      <FieldError
                        errors={
                          formDescriptionError
                            ? [{ message: formDescriptionError }]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </DetailsPanel>

              <DetailsPanel
                description="Shown at the top of the page."
                eyebrow="Intro"
                title="Page copy"
              >
                <FieldGroup>
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
                    <Field data-invalid={Boolean(eyebrowError) || undefined}>
                      <FieldLabel htmlFor="inquiry-page-eyebrow">Eyebrow</FieldLabel>
                      <FieldContent>
                        <Input
                          disabled={isPending}
                          id="inquiry-page-eyebrow"
                          maxLength={48}
                          name="eyebrow"
                          onChange={(event) => setEyebrow(event.currentTarget.value)}
                          placeholder="Inquiry page"
                          value={eyebrow}
                        />
                        <FieldError
                          errors={eyebrowError ? [{ message: eyebrowError }] : undefined}
                        />
                      </FieldContent>
                    </Field>

                    <Field data-invalid={Boolean(brandTaglineError) || undefined}>
                      <FieldLabel htmlFor="inquiry-page-brand-tagline">
                        Page tagline override
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          disabled={isPending}
                          id="inquiry-page-brand-tagline"
                          maxLength={120}
                          name="brandTagline"
                          onChange={(event) =>
                            setBrandTagline(event.currentTarget.value)
                          }
                          placeholder="Optional page tagline"
                          value={brandTagline}
                        />
                        <FieldDescription>
                          {brandTagline.trim()
                            ? "Only this inquiry page uses this tagline."
                            : settings.shortDescription
                              ? "Leaving this blank uses the business description from General Settings."
                              : "Leave blank to use the business description from General Settings."}
                        </FieldDescription>
                        <FieldError
                          errors={
                            brandTaglineError
                              ? [{ message: brandTaglineError }]
                              : undefined
                          }
                        />
                      </FieldContent>
                    </Field>
                  </div>

                  <Field data-invalid={Boolean(headlineError) || undefined}>
                    <FieldLabel htmlFor="inquiry-page-headline">Headline</FieldLabel>
                    <FieldContent>
                      <Textarea
                        disabled={isPending}
                        id="inquiry-page-headline"
                        maxLength={120}
                        name="headline"
                        onChange={(event) => setHeadline(event.currentTarget.value)}
                        placeholder={`Tell ${settings.name} what you need.`}
                        required
                        rows={3}
                        value={headline}
                      />
                      <FieldError
                        errors={headlineError ? [{ message: headlineError }] : undefined}
                      />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(descriptionError) || undefined}>
                    <FieldLabel htmlFor="inquiry-page-description">
                      Description
                    </FieldLabel>
                    <FieldContent>
                      <Textarea
                        disabled={isPending}
                        id="inquiry-page-description"
                        maxLength={280}
                        name="description"
                        onChange={(event) =>
                          setDescription(event.currentTarget.value)
                        }
                        placeholder="Tell customers what helps you review the request."
                        rows={4}
                        value={description}
                      />
                      <FieldError
                        errors={
                          descriptionError ? [{ message: descriptionError }] : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </DetailsPanel>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <SectionIntro
            description="Choose how the page is arranged."
            title="Layout"
          />

          <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
            <div className="space-y-2">
              <p className="meta-label">Template</p>
              <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                Choose a layout
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Pick how the intro, form, and supporting details are arranged.
              </p>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              {(
                Object.keys(inquiryPageTemplateMeta) as InquiryPageTemplate[]
              ).map((templateId) => {
                const templateMeta = inquiryPageTemplateMeta[templateId];
                const isSelected = template === templateId;

                return (
                  <button
                    key={templateId}
                    className={cn(
                      "soft-panel flex min-h-44 flex-col gap-4 px-4 py-4 text-left transition-colors",
                      isSelected
                        ? "border-primary/20 bg-accent/52"
                        : "hover:bg-accent/30",
                    )}
                    disabled={isPending}
                    onClick={() => setTemplate(templateId)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold tracking-tight text-foreground">
                        {templateMeta.label}
                      </p>
                      {isSelected ? (
                        <span className="dashboard-meta-pill min-h-0 px-3 py-1">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <div className="grid flex-1 gap-2">
                      <TemplateMiniPreview template={templateId} />
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {templateMeta.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <FieldError
                errors={templateError ? [{ message: templateError }] : undefined}
              />
            </div>

            <div className="mt-6 border-t border-border/70 pt-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-1">
                  <p className="meta-label">Brand assets</p>
                  <p className="text-[0.95rem] font-semibold tracking-tight text-foreground">
                    Business brand
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Logo comes from the business profile. Add a page tagline only if you want different text here.
                  </p>
                </div>

                {generalSettingsHref ? (
                  <Button asChild className="w-full sm:w-auto" variant="outline">
                    <Link href={generalSettingsHref}>Open business profile</Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full sm:w-auto" variant="outline">
                    <Link href={settingsHref}>Open settings</Link>
                  </Button>
                )}
              </div>

              <div className="mt-4 soft-panel flex items-center gap-4 px-5 py-5 shadow-none">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-background/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  {logoPreviewUrl ? (
                    <Image
                      src={logoPreviewUrl}
                      alt={`${settings.name} logo`}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
                      {getInitials(settings.name)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="meta-label">Current business brand</p>
                  <p className="mt-1 truncate font-heading text-xl font-semibold tracking-tight text-foreground">
                    {settings.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Update the logo and brand line from the business profile.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {template !== "no_supporting_cards" ? (
          <section className="space-y-4">
            <SectionIntro
              description="Add the short prompts shown beside the inquiry form."
              title="Supporting cards"
            />

            <BuilderSection
              action={
                <Button
                  className="w-full sm:w-auto"
                  disabled={isPending || hasReachedCardLimit}
                  onClick={addCard}
                  type="button"
                  variant="outline"
                >
                  <Plus data-icon="inline-start" />
                  Add card
                </Button>
              }
              title="Cards"
            >
              {cards.length ? (
                <DndContext
                  collisionDetection={closestCenter}
                  id={inquiryPageCardsDndContextId}
                  onDragEnd={handleCardDragEnd}
                  sensors={cardSensors}
                >
                  <SortableContext
                    id={inquiryPageCardsSortableContextId}
                    items={cards.map((card) => card.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-4">
                      {cards.map((card, index) => (
                        <SortableInquiryPageCard
                          card={card}
                          index={index}
                          isPending={isPending}
                          key={card.id}
                          prefersReducedMotion={prefersReducedMotion}
                          onRemove={removeCard}
                          onUpdate={updateCard}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="soft-panel px-5 py-6">
                  <p className="text-sm font-medium text-foreground">
                    No supporting cards saved
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Add cards if you want to highlight what customers should send,
                    what files help most, or how the owner reviews new requests.
                  </p>
                </div>
              )}

              <FieldError
                errors={cardsError ? [{ message: cardsError }] : undefined}
              />
            </BuilderSection>
          </section>
        ) : null}

        <section className="space-y-4">
          <SectionIntro
            description="Add an optional image to the page."
            title="Showcase image"
          />

          <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="grid gap-5">
                <Field data-invalid={Boolean(showcaseImageUrlError) || undefined}>
                  <FieldLabel htmlFor="inquiry-page-showcase-image-url">
                    Image URL
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      aria-invalid={Boolean(showcaseImageUrlError) || undefined}
                      disabled={isPending}
                      id="inquiry-page-showcase-image-url"
                      maxLength={2000}
                      name="showcaseImageUrlInput"
                      onChange={(event) =>
                        setShowcaseImageUrl(event.currentTarget.value)
                      }
                      placeholder="https://example.com/image.jpg"
                      type="url"
                      value={showcaseImageUrl}
                    />
                    <FieldDescription>
                      Leave blank if you do not want an image.
                    </FieldDescription>
                    <FieldError
                      errors={
                        showcaseImageUrlError
                          ? [{ message: showcaseImageUrlError }]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>

                <div className="grid gap-5 lg:grid-cols-2">
                  <Field data-invalid={Boolean(showcaseImageFrameError) || undefined}>
                    <FieldLabel>Frame</FieldLabel>
                    <FieldContent>
                      <OptionTileGrid>
                        {(Object.keys(
                          inquiryPageShowcaseImageFrameMeta,
                        ) as InquiryPageShowcaseImageFrame[]).map((frame) => {
                          const option = inquiryPageShowcaseImageFrameMeta[frame];
                          const isSelected = showcaseImageFrame === frame;

                          return (
                            <OptionTile
                              description={option.description}
                              disabled={isPending}
                              isSelected={isSelected}
                              key={frame}
                              label={option.label}
                              selectedLabel="Selected"
                              onClick={() => setShowcaseImageFrame(frame)}
                            />
                          );
                        })}
                      </OptionTileGrid>
                      <FieldError
                        errors={
                          showcaseImageFrameError
                            ? [{ message: showcaseImageFrameError }]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(showcaseImageSizeError) || undefined}>
                    <FieldLabel>Size</FieldLabel>
                    <FieldContent>
                      <OptionTileGrid>
                        {(Object.keys(
                          inquiryPageShowcaseImageSizeMeta,
                        ) as InquiryPageShowcaseImageSize[]).map((size) => {
                          const option = inquiryPageShowcaseImageSizeMeta[size];
                          const isSelected = showcaseImageSize === size;

                          return (
                            <OptionTile
                              description={option.description}
                              disabled={isPending}
                              isSelected={isSelected}
                              key={size}
                              label={option.label}
                              selectedLabel="Selected"
                              onClick={() => setShowcaseImageSize(size)}
                            />
                          );
                        })}
                      </OptionTileGrid>
                      <FieldError
                        errors={
                          showcaseImageSizeError
                            ? [{ message: showcaseImageSizeError }]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                </div>
              </div>

              <ShowcaseImageEditorPreview
                crop={showcaseImageCrop}
                frame={showcaseImageFrame}
                onCrop={() => void handleOpenCropDialog()}
                size={showcaseImageSize}
                url={showcaseImageUrl}
              />
            </div>

            {cropError ||
            showcaseImageCropXError ||
            showcaseImageCropYError ||
            showcaseImageCropZoomError ? (
              <div className="mt-5">
                <FieldError
                  errors={[
                    ...(cropError ? [{ message: cropError }] : []),
                    ...(showcaseImageCropXError
                      ? [{ message: showcaseImageCropXError }]
                      : []),
                    ...(showcaseImageCropYError
                      ? [{ message: showcaseImageCropYError }]
                      : []),
                    ...(showcaseImageCropZoomError
                      ? [{ message: showcaseImageCropZoomError }]
                      : []),
                  ]}
                />
              </div>
            ) : null}
          </div>
        </section>
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

      <Dialog
        open={isCropDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCropDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
            <DialogDescription>
              Adjust the image inside the selected frame.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="flex flex-col gap-4">
              <div
                className="soft-panel relative min-h-[26rem] overflow-hidden bg-muted/25"
                ref={cropViewportRef}
              >
                {showcaseImageUrl.trim() ? (
                  <Cropper
                    aspect={getCropAspectRatio(showcaseImageFrame)}
                    crop={cropDraft}
                    cropShape="rect"
                    image={showcaseImageUrl.trim()}
                    objectFit="cover"
                    onCropChange={setCropDraft}
                    onZoomChange={setCropZoomDraft}
                    showGrid={false}
                    zoom={cropZoomDraft}
                  />
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">Drag and zoom to fit.</p>
              {cropError ? (
                <FieldError errors={[{ message: cropError }]} />
              ) : null}
            </div>

            <div className="flex flex-col gap-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="showcase-image-crop-zoom">Zoom</FieldLabel>
                  <FieldContent>
                    <input
                      className="h-10 w-full accent-primary"
                      id="showcase-image-crop-zoom"
                      max="4"
                      min="1"
                      onChange={(event) =>
                        setCropZoomDraft(Number(event.currentTarget.value))
                      }
                      step="0.01"
                      type="range"
                      value={cropZoomDraft}
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>

              <div className="soft-panel px-4 py-4 text-sm shadow-none">
                <p className="font-medium text-foreground">Crop</p>
                <p className="mt-1 text-muted-foreground">
                  Uses the frame selected above.
                </p>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={closeCropDialog} type="button" variant="outline">
                Cancel
              </Button>
              <Button onClick={applyCropDraft} type="button">
                Crop
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function SectionIntro({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function DetailsPanel({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="soft-panel px-4 py-4 shadow-none sm:px-5">
      <div className="space-y-1">
        <p className="meta-label">{eyebrow}</p>
        <p className="text-[0.95rem] font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}

function OptionTileGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function OptionTile({
  description,
  disabled,
  isSelected,
  label,
  selectedLabel,
  onClick,
}: {
  description: string;
  disabled: boolean;
  isSelected: boolean;
  label: string;
  selectedLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "soft-panel flex min-h-24 flex-col items-start justify-between gap-3 px-4 py-3 text-left shadow-none transition-[border-color,background-color,box-shadow]",
        isSelected
          ? "border-primary/30 bg-accent/50 ring-1 ring-primary/15"
          : "hover:bg-accent/25",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <span className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-foreground">
          {label}
        </span>
        {isSelected ? (
          <>
            <span className="sr-only">{selectedLabel}</span>
            <span
              aria-hidden="true"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-background/90 text-primary"
            >
              <Check className="size-3" />
            </span>
          </>
        ) : null}
      </div>
      <span className="text-xs leading-5 text-muted-foreground">
        {description}
      </span>
    </button>
  );
}

function ShowcaseImageEditorPreview({
  crop,
  frame,
  onCrop,
  size,
  url,
}: {
  crop: InquiryPageShowcaseImageCrop;
  frame: InquiryPageShowcaseImageFrame;
  onCrop: () => void;
  size: InquiryPageShowcaseImageSize;
  url: string;
}) {
  const trimmedUrl = url.trim();

  return (
    <div className="soft-panel h-full px-4 py-4 shadow-none sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="meta-label">Preview</p>
          <p className="text-[0.95rem] font-semibold tracking-tight text-foreground">
            Showcase image
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            {trimmedUrl ? "Shown below the supporting content." : "No image added yet."}
          </p>
        </div>

        {trimmedUrl ? (
          <Button
            className="w-full sm:w-auto"
            onClick={onCrop}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Crop data-icon="inline-start" />
            Crop
          </Button>
        ) : null}
      </div>

      <div className="mt-5">
        {trimmedUrl ? (
          <InquiryShowcaseImageSurface
            alt=""
            className={cn(
              "transition-[width,max-width] duration-200",
              getShowcaseImagePreviewSizeClass(size),
            )}
            crop={crop}
            frame={frame}
            url={trimmedUrl}
          />
        ) : (
          <div className="flex min-h-52 items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-background/70 px-6 text-center">
            <p className="text-sm leading-6 text-muted-foreground">
              Add an image URL to show a preview here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BuilderSection({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/15 p-3.5 sm:rounded-[1.75rem] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>

      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function SortableInquiryPageCard({
  card,
  index,
  isPending,
  prefersReducedMotion,
  onRemove,
  onUpdate,
}: {
  card: InquiryPageCard;
  index: number;
  isPending: boolean;
  prefersReducedMotion: boolean;
  onRemove: (cardId: string) => void;
  onUpdate: (cardId: string, key: keyof InquiryPageCard, nextValue: string) => void;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    disabled: isPending,
    transition: prefersReducedMotion ? null : inquiryPageSortableTransition,
  });
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: isDragging ? "transform" : undefined,
  } satisfies CSSProperties;
  const Icon = inquiryPageCardIconMeta[card.icon].icon;
  const dragHandleLabel = card.title.trim()
    ? `Reorder ${card.title}`
    : `Reorder card ${index + 1}`;

  return (
    <div
      className={cn(
        "soft-panel overflow-hidden p-4 shadow-none sm:p-5",
        isDragging && "relative z-10 ring-2 ring-primary/20 shadow-lg",
      )}
      ref={setNodeRef}
      style={sortableStyle}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent/85 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Card {index + 1}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Supporting detail shown beside the inquiry form.
              </p>
            </div>
          </div>

          <div className="dashboard-actions self-start">
            <Button
              aria-label={dragHandleLabel}
              className="cursor-grab touch-none active:cursor-grabbing"
              disabled={isPending}
              ref={setActivatorNodeRef}
              size="icon-sm"
              type="button"
              variant="outline"
              {...attributes}
              {...listeners}
            >
              <GripVertical />
            </Button>
            <Button
              disabled={isPending}
              onClick={() => onRemove(card.id)}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
            <Field>
              <FieldLabel>Icon</FieldLabel>
              <FieldContent>
                <div onPointerDownCapture={(event) => event.stopPropagation()}>
                  <Combobox
                    disabled={isPending}
                    id={`inquiry-card-icon-${card.id}`}
                    onValueChange={(value) => onUpdate(card.id, "icon", value)}
                    options={(
                      Object.keys(inquiryPageCardIconMeta) as InquiryPageCardIcon[]
                    ).map((iconKey) => ({
                      icon: inquiryPageCardIconMeta[iconKey].icon,
                      label: inquiryPageCardIconMeta[iconKey].label,
                      searchText: inquiryPageCardIconMeta[iconKey].label,
                      value: iconKey,
                    }))}
                    placeholder="Choose an icon"
                    renderOption={(option) => {
                      const OptionIcon = option.icon;

                      return (
                        <span className="inline-flex items-center gap-2">
                          <OptionIcon className="size-4" />
                          {option.label}
                        </span>
                      );
                    }}
                    renderValue={(option) => {
                      const OptionIcon = option.icon;

                      return (
                        <span className="inline-flex min-w-0 items-center gap-2 text-left">
                          <OptionIcon className="size-4 shrink-0" />
                          <span className="truncate">{option.label}</span>
                        </span>
                      );
                    }}
                    searchPlaceholder="Search icon"
                    value={card.icon}
                  />
                </div>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor={`inquiry-card-title-${card.id}`}>Title</FieldLabel>
              <FieldContent>
                <Input
                  disabled={isPending}
                  id={`inquiry-card-title-${card.id}`}
                  maxLength={maxInquiryPageCardTitleLength}
                  onChange={(event) =>
                    onUpdate(card.id, "title", event.currentTarget.value)
                  }
                  onPointerDownCapture={(event) => event.stopPropagation()}
                  placeholder="Clear details"
                  required
                  value={card.title}
                />
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor={`inquiry-card-description-${card.id}`}>
              Description
            </FieldLabel>
            <FieldContent>
              <Textarea
                disabled={isPending}
                id={`inquiry-card-description-${card.id}`}
                maxLength={maxInquiryPageCardDescriptionLength}
                onChange={(event) =>
                  onUpdate(card.id, "description", event.currentTarget.value)
                }
                onPointerDownCapture={(event) => event.stopPropagation()}
                placeholder="Explain why this detail matters and what customers should include."
                rows={3}
                required
                value={card.description}
              />
            </FieldContent>
          </Field>
        </div>
      </div>
    </div>
  );
}

function normalizeOptionalTextDraft(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function getCropAspectRatio(frame: InquiryPageShowcaseImageFrame) {
  switch (frame) {
    case "wide":
      return 16 / 9;
    case "square":
      return 1;
    case "portrait":
      return 4 / 5;
    case "landscape":
    default:
      return 4 / 3;
  }
}

function getShowcaseImagePreviewSizeClass(size: InquiryPageShowcaseImageSize) {
  switch (size) {
    case "compact":
      return "max-w-xs";
    case "large":
      return "w-full";
    case "standard":
    default:
      return "max-w-sm";
  }
}

function TemplateMiniPreview({
  template,
}: {
  template: InquiryPageTemplate;
}) {
  if (template === "no_supporting_cards") {
    return (
      <div className="grid flex-1 gap-2">
        <div className="soft-panel h-8 bg-secondary/70 shadow-none" />
        <div className="soft-panel h-20 bg-background/95 shadow-none" />
      </div>
    );
  }

  if (template === "showcase") {
    return (
      <div className="grid flex-1 gap-2 md:grid-cols-[0.8fr_1.2fr]">
        <div className="soft-panel h-full min-h-20 bg-background/95 shadow-none" />
        <div className="grid gap-2">
          <div className="soft-panel h-10 bg-secondary/70 shadow-none" />
          <div className="grid gap-2 md:grid-cols-2">
            <div className="soft-panel h-9 bg-background/95 shadow-none" />
            <div className="soft-panel h-9 bg-background/95 shadow-none" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid flex-1 gap-2 md:grid-cols-[1.15fr_0.85fr]">
      <div className="grid gap-2">
        <div className="soft-panel h-7 bg-secondary/70 shadow-none" />
        <div className="soft-panel h-10 bg-background/95 shadow-none" />
        <div className="soft-panel h-10 bg-background/95 shadow-none" />
      </div>
      <div className="soft-panel h-full min-h-20 bg-background/95 shadow-none" />
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("");
}
