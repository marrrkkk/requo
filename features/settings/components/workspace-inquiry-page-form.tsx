"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";

import {
  FormActions,
  FormSection,
} from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
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
import { getFieldError } from "@/lib/action-state";
import {
  inquiryPageCardIconMeta,
  inquiryPageTemplateMeta,
  type InquiryPageCard,
  type InquiryPageCardIcon,
  type InquiryPageTemplate,
} from "@/features/inquiries/page-config";
import type {
  WorkspaceInquiryPageActionState,
  WorkspaceInquiryPageSettingsView,
} from "@/features/settings/types";
import { cn } from "@/lib/utils";

type WorkspaceInquiryPageFormProps = {
  action: (
    state: WorkspaceInquiryPageActionState,
    formData: FormData,
  ) => Promise<WorkspaceInquiryPageActionState>;
  settings: WorkspaceInquiryPageSettingsView;
  logoPreviewUrl: string | null;
  generalSettingsHref: string;
};

const initialState: WorkspaceInquiryPageActionState = {};

export function WorkspaceInquiryPageForm({
  action,
  settings,
  logoPreviewUrl,
  generalSettingsHref,
}: WorkspaceInquiryPageFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [publicInquiryEnabled, setPublicInquiryEnabled] = useState(
    settings.publicInquiryEnabled,
  );
  const [template, setTemplate] = useState<InquiryPageTemplate>(
    settings.inquiryPageConfig.template,
  );
  const [cards, setCards] = useState<InquiryPageCard[]>(
    settings.inquiryPageConfig.cards,
  );

  const fieldErrors = state.fieldErrors;
  const templateError = getFieldError(fieldErrors, "template");
  const eyebrowError = getFieldError(fieldErrors, "eyebrow");
  const headlineError = getFieldError(fieldErrors, "headline");
  const descriptionError = getFieldError(fieldErrors, "description");
  const brandTaglineError = getFieldError(fieldErrors, "brandTagline");
  const formTitleError = getFieldError(fieldErrors, "formTitle");
  const formDescriptionError = getFieldError(fieldErrors, "formDescription");
  const cardsError = getFieldError(fieldErrors, "cards");

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

  function moveCard(cardId: string, direction: "up" | "down") {
    setCards((currentCards) => {
      const index = currentCards.findIndex((card) => card.id === cardId);

      if (index < 0) {
        return currentCards;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= currentCards.length) {
        return currentCards;
      }

      const nextCards = [...currentCards];
      const [movedCard] = nextCards.splice(index, 1);
      nextCards.splice(targetIndex, 0, movedCard);

      return nextCards;
    });
  }

  function removeCard(cardId: string) {
    setCards((currentCards) => currentCards.filter((card) => card.id !== cardId));
  }

  function addCard() {
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

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not save the inquiry page.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <CheckCircle2 data-icon="inline-start" />
          <AlertTitle>Inquiry page saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <input name="formId" type="hidden" value={settings.formId} />
      <input
        name="publicInquiryEnabled"
        type="hidden"
        value={String(publicInquiryEnabled)}
      />
      <input name="template" type="hidden" value={template} />
      <input name="cards" type="hidden" value={JSON.stringify(cards)} />

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Inquiry page layout and branding</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-0">
          <FormSection title="Publishing">
            <label
              className={cn(
                "soft-panel flex items-start gap-3 px-4 py-4 transition-colors hover:bg-accent/30",
                publicInquiryEnabled && "border-primary/20 bg-accent/52",
              )}
            >
              <Switch
                checked={publicInquiryEnabled}
                className="mt-1"
                disabled={isPending}
                onCheckedChange={setPublicInquiryEnabled}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-sm font-medium text-foreground">
                  Enable public inquiry page
                </p>
              </div>
            </label>
          </FormSection>

          <Separator />

          <FormSection title="Template">
            <div className="grid gap-3 xl:grid-cols-3">
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
            <FieldError
              errors={templateError ? [{ message: templateError }] : undefined}
            />
          </FormSection>

          <Separator />

          <FormSection
            title="Workspace brand"
            action={
              <Button asChild variant="outline">
                <Link href={generalSettingsHref}>
                  Manage brand assets
                </Link>
              </Button>
            }
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="soft-panel flex items-center gap-4 px-5 py-5">
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
                  <p className="meta-label">Current workspace brand</p>
                  <p className="mt-1 truncate font-heading text-xl font-semibold tracking-tight text-foreground">
                    {settings.name}
                  </p>
                </div>
              </div>

              <div className="info-tile bg-muted/20">
                <p className="meta-label">Saved preview mode</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Preview shows the last saved version.
                </p>
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Page copy</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <FormSection title="Content">
            <FieldGroup>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
                <Field data-invalid={Boolean(eyebrowError) || undefined}>
                  <FieldLabel htmlFor="inquiry-page-eyebrow">Eyebrow</FieldLabel>
                  <FieldContent>
                    <Input
                      defaultValue={settings.inquiryPageConfig.eyebrow ?? ""}
                      disabled={isPending}
                      id="inquiry-page-eyebrow"
                      maxLength={48}
                      name="eyebrow"
                      placeholder="Inquiry page"
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
                      defaultValue={settings.inquiryPageConfig.brandTagline ?? ""}
                      disabled={isPending}
                      id="inquiry-page-brand-tagline"
                      maxLength={120}
                      name="brandTagline"
                      placeholder="Optional short brand line for this page"
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
                    defaultValue={settings.inquiryPageConfig.headline}
                    disabled={isPending}
                    id="inquiry-page-headline"
                    maxLength={120}
                    name="headline"
                    placeholder={`Tell ${settings.name} what you need.`}
                    required
                    rows={3}
                  />
                  <FieldError
                    errors={headlineError ? [{ message: headlineError }] : undefined}
                  />
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(descriptionError) || undefined}>
                <FieldLabel htmlFor="inquiry-page-description">
                  Supporting description
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    defaultValue={settings.inquiryPageConfig.description ?? ""}
                    disabled={isPending}
                    id="inquiry-page-description"
                    maxLength={280}
                    name="description"
                    placeholder="Explain what customers should include so the request is easy to review."
                    rows={4}
                  />
                  <FieldError
                    errors={
                      descriptionError ? [{ message: descriptionError }] : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <div className="grid gap-5 lg:grid-cols-2">
                <Field data-invalid={Boolean(formTitleError) || undefined}>
                  <FieldLabel htmlFor="inquiry-page-form-title">
                    Form card title
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      defaultValue={settings.inquiryPageConfig.formTitle}
                      disabled={isPending}
                      id="inquiry-page-form-title"
                      maxLength={80}
                      name="formTitle"
                      placeholder="Send inquiry"
                      required
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
                    Form card description
                  </FieldLabel>
                  <FieldContent>
                    <Textarea
                      defaultValue={
                        settings.inquiryPageConfig.formDescription ?? ""
                      }
                      disabled={isPending}
                      id="inquiry-page-form-description"
                      maxLength={200}
                      name="formDescription"
                      placeholder="Optional short note above the inquiry form"
                      rows={3}
                    />
                    <FieldError
                      errors={
                        formDescriptionError
                          ? [{ message: formDescriptionError }]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </FormSection>
        </CardContent>
      </Card>

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Supporting cards</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <FormSection
            title="Cards"
            action={
              <Button
                disabled={isPending || cards.length >= 8}
                onClick={addCard}
                type="button"
                variant="outline"
              >
                <Plus data-icon="inline-start" />
                Add card
              </Button>
            }
          >
            {cards.length ? (
              <div className="flex flex-col gap-4">
                {cards.map((card, index) => (
                  <div className="soft-panel p-4" key={card.id}>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-tight text-foreground">
                            Card {index + 1}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            Adjust the icon, title, and short supporting copy.
                          </p>
                        </div>

                        <div className="dashboard-actions">
                          <Button
                            disabled={isPending || index === 0}
                            onClick={() => moveCard(card.id, "up")}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                          >
                            <ChevronUp />
                          </Button>
                          <Button
                            disabled={isPending || index === cards.length - 1}
                            onClick={() => moveCard(card.id, "down")}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                          >
                            <ChevronDown />
                          </Button>
                          <Button
                            disabled={isPending}
                            onClick={() => removeCard(card.id)}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
                        <Field>
                          <FieldLabel>Icon</FieldLabel>
                          <FieldContent>
                            <Select
                              disabled={isPending}
                              onValueChange={(value) =>
                                updateCard(card.id, "icon", value)
                              }
                              value={card.icon}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose an icon" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {(
                                    Object.keys(
                                      inquiryPageCardIconMeta,
                                    ) as InquiryPageCardIcon[]
                                  ).map((iconKey) => {
                                    const iconMeta = inquiryPageCardIconMeta[iconKey];
                                    const Icon = iconMeta.icon;

                                    return (
                                      <SelectItem key={iconKey} value={iconKey}>
                                        <span className="inline-flex items-center gap-2">
                                          <Icon className="size-4" />
                                          {iconMeta.label}
                                        </span>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FieldContent>
                        </Field>

                        <div className="grid gap-5">
                          <Field>
                            <FieldLabel htmlFor={`inquiry-card-title-${card.id}`}>
                              Title
                            </FieldLabel>
                            <FieldContent>
                              <Input
                                disabled={isPending}
                                id={`inquiry-card-title-${card.id}`}
                                maxLength={80}
                                onChange={(event) =>
                                  updateCard(card.id, "title", event.currentTarget.value)
                                }
                                placeholder="Clear details"
                                required
                                value={card.title}
                              />
                            </FieldContent>
                          </Field>

                          <Field>
                            <FieldLabel
                              htmlFor={`inquiry-card-description-${card.id}`}
                            >
                              Description
                            </FieldLabel>
                            <FieldContent>
                              <Textarea
                                disabled={isPending}
                                id={`inquiry-card-description-${card.id}`}
                                maxLength={240}
                                onChange={(event) =>
                                  updateCard(
                                    card.id,
                                    "description",
                                    event.currentTarget.value,
                                  )
                                }
                                placeholder="Explain why this detail matters."
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
                ))}
              </div>
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
          </FormSection>
        </CardContent>
      </Card>

      <div className="toolbar-panel">
        <FormActions align="between" className="pt-0">
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Save before previewing changes.
          </p>
          <Button disabled={isPending} size="lg" type="submit">
            {isPending ? "Saving inquiry page..." : "Save inquiry page"}
          </Button>
        </FormActions>
      </div>
    </form>
  );
}

function TemplateMiniPreview({
  template,
}: {
  template: InquiryPageTemplate;
}) {
  if (template === "stacked") {
    return (
      <>
        <div className="soft-panel h-7 bg-secondary/70 shadow-none" />
        <div className="grid gap-2 md:grid-cols-3">
          <div className="soft-panel h-10 bg-background/95 shadow-none" />
          <div className="soft-panel h-10 bg-background/95 shadow-none" />
          <div className="soft-panel h-10 bg-background/95 shadow-none" />
        </div>
        <div className="soft-panel h-18 bg-background/95 shadow-none" />
      </>
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
