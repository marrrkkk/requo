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
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Eye,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import { FloatingFormActions } from "@/components/shared/floating-form-actions";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFieldError } from "@/lib/action-state";
import {
  inquiryPageCardIconMeta,
  maxInquiryPageCardDescriptionLength,
  maxInquiryPageCardTitleLength,
  inquiryPageTemplateMeta,
  maxInquiryPageCards,
  type InquiryPageCard,
  type InquiryPageCardIcon,
  type InquiryPageTemplate,
} from "@/features/inquiries/page-config";
import type {
  BusinessInquiryPageActionState,
  BusinessInquiryPagePreviewDraft,
  BusinessInquiryPageSettingsView,
} from "@/features/settings/types";
import { cn } from "@/lib/utils";

type BusinessInquiryPageFormProps = {
  action: (
    state: BusinessInquiryPageActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryPageActionState>;
  settings: BusinessInquiryPageSettingsView;
  logoPreviewUrl: string | null;
  generalSettingsHref: string;
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
  onDraftChange,
  onPreview,
}: BusinessInquiryPageFormProps) {
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
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
  const formRef = useRef<HTMLFormElement>(null);

  const fieldErrors = state.fieldErrors;
  const templateError = getFieldError(fieldErrors, "template");
  const eyebrowError = getFieldError(fieldErrors, "eyebrow");
  const headlineError = getFieldError(fieldErrors, "headline");
  const descriptionError = getFieldError(fieldErrors, "description");
  const brandTaglineError = getFieldError(fieldErrors, "brandTagline");
  const cardsError = getFieldError(fieldErrors, "cards");
  const initialCardsSerialized = useMemo(
    () => JSON.stringify(settings.inquiryPageConfig.cards),
    [settings.inquiryPageConfig.cards],
  );
  const hasControlledChanges =
    template !== settings.inquiryPageConfig.template ||
    eyebrow !== (settings.inquiryPageConfig.eyebrow ?? "") ||
    brandTagline !== (settings.inquiryPageConfig.brandTagline ?? "") ||
    headline !== settings.inquiryPageConfig.headline ||
    description !== (settings.inquiryPageConfig.description ?? "") ||
    JSON.stringify(cards) !== initialCardsSerialized;
  const hasUnsavedChanges = hasControlledChanges;
  const [shouldRenderFloatingActions, setShouldRenderFloatingActions] = useState(false);
  const [floatingActionsState, setFloatingActionsState] = useState<"open" | "closed">(
    "closed",
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  const draftInquiryPageConfig = useMemo(
    () => ({
      template,
      cards,
      eyebrow: normalizeOptionalTextDraft(eyebrow),
      brandTagline: normalizeOptionalTextDraft(brandTagline),
      headline: headline.trim(),
      description: normalizeOptionalTextDraft(description),
      formTitle: settings.inquiryPageConfig.formTitle,
      formDescription: settings.inquiryPageConfig.formDescription,
    }),
    [
      brandTagline,
      cards,
      description,
      eyebrow,
      headline,
      settings.inquiryPageConfig.formDescription,
      settings.inquiryPageConfig.formTitle,
      template,
    ],
  );

  useEffect(() => {
    onDraftChange({
      publicInquiryEnabled: settings.publicInquiryEnabled,
      inquiryPageConfig: draftInquiryPageConfig,
    });
  }, [draftInquiryPageConfig, onDraftChange, settings.publicInquiryEnabled]);
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

  function handleCancelChanges() {
    formRef.current?.reset();
    setTemplate(settings.inquiryPageConfig.template);
    setCards(settings.inquiryPageConfig.cards);
    setEyebrow(settings.inquiryPageConfig.eyebrow ?? "");
    setBrandTagline(settings.inquiryPageConfig.brandTagline ?? "");
    setHeadline(settings.inquiryPageConfig.headline);
    setDescription(settings.inquiryPageConfig.description ?? "");
  }

  return (
    <form
      action={formAction}
      className="form-stack pb-28"
      ref={formRef}
    >
      <input name="formId" type="hidden" value={settings.formId} />
      <input
        name="publicInquiryEnabled"
        type="hidden"
        value={String(settings.publicInquiryEnabled)}
      />
      <input name="template" type="hidden" value={template} />
      <input name="cards" type="hidden" value={JSON.stringify(cards)} />
      <input
        name="formTitle"
        type="hidden"
        value={settings.inquiryPageConfig.formTitle}
      />
      <input
        name="formDescription"
        type="hidden"
        value={settings.inquiryPageConfig.formDescription ?? ""}
      />

      <div className="flex flex-col gap-8 sm:gap-10">
        <section className="space-y-5">
          <SectionIntro
            description="Choose the public inquiry layout and keep the page tied to your current brand details."
            title="Page layout"
          />

          <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
            <div className="space-y-2">
              <p className="meta-label">Template</p>
              <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                Inquiry page structure
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Pick the layout for the intro, form, and supporting details.
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
                    Update the logo and brand line used on the public inquiry page.
                  </p>
                </div>

                <Button asChild className="w-full sm:w-auto" variant="outline">
                  <Link href={generalSettingsHref}>Manage brand assets</Link>
                </Button>
              </div>

              <div className="mt-4 soft-panel flex items-center gap-4 px-5 py-5 shadow-none">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-background/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  {logoPreviewUrl ? (
                    <Image
                      src={logoPreviewUrl}
                      alt={`${settings.name} logo`}
                      width={44}
                      height={44}
                      className="max-h-[70%] w-auto object-contain"
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
                    Update the logo and brand line from general settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <SectionIntro
            description="Set the intro shown on the public inquiry page."
            title="Page copy"
          />

          <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
            <div className="space-y-1">
              <p className="meta-label">Intro</p>
              <p className="text-[0.95rem] font-semibold tracking-tight text-foreground">
                Header copy
              </p>
            </div>

            <div className="mt-5">
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
                      Brand tagline
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
                        placeholder="Optional brand line"
                        value={brandTagline}
                      />
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

        <div className="grid gap-5 xl:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="soft-panel flex w-full items-center gap-3.5 bg-background/90 px-4 py-3.5 shadow-none">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                {card.title.trim() || "Card title"}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                {card.description.trim() || "Short supporting copy appears here in the public page preview."}
              </p>
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
    </div>
  );
}

function normalizeOptionalTextDraft(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
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
