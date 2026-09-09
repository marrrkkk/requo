"use client";

import { type CSSProperties, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Calculator,
  Eye,
  EyeOff,
  GripVertical,
  Hand,
  ListOrdered,
  MessageSquare,
  Minus,
  MousePointerClick,
  MoveVertical,
  PenLine,
  Receipt,
  StickyNote,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { quoteEmailMergeTags } from "@/features/settings/email-templates";
import type {
  BlockSpacing,
  EmailTemplateBlock,
} from "@/features/settings/email-templates";
import { cn } from "@/lib/utils";

import {
  EMAIL_BUILDER_BLOCK_META,
  isDeletableBlockType,
} from "./builder-types";

const BLOCK_ICONS: Record<EmailTemplateBlock["type"], LucideIcon> = {
  greeting: Hand,
  intro: AlignLeft,
  text: Type,
  cta: MousePointerClick,
  summary: Receipt,
  "line-items": ListOrdered,
  totals: Calculator,
  notes: StickyNote,
  signature: PenLine,
  closing: MessageSquare,
  divider: Minus,
  spacer: MoveVertical,
};

export const EMAIL_BUILDER_SORTABLE_TRANSITION = {
  duration: 160,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
} as const;

type SortableBlockCardProps = {
  block: EmailTemplateBlock;
  index: number;
  isPending?: boolean;
  prefersReducedMotion?: boolean;
  onUpdate: (id: string, patch: Partial<EmailTemplateBlock>) => void;
  onUpdateStyle: (
    id: string,
    key: keyof NonNullable<EmailTemplateBlock["style"]>,
    value: string | undefined,
  ) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
};

function insertTagAtCursor(
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  tag: string,
  onChange: (next: string) => void,
) {
  if (!textarea) {
    onChange(`${currentValue}${currentValue.endsWith(" ") || !currentValue ? "" : " "}${tag}`);
    return;
  }
  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? currentValue.length;
  const next = `${currentValue.slice(0, start)}${tag}${currentValue.slice(end)}`;
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const cursor = start + tag.length;
    textarea.setSelectionRange(cursor, cursor);
  });
}

function StyleSelect({
  id,
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string | undefined;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <div onPointerDownCapture={(event) => event.stopPropagation()}>
          <SelectRoot
            disabled={disabled}
            onValueChange={onChange}
            value={value ?? ""}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        </div>
      </FieldContent>
    </Field>
  );
}

export function SortableBlockCard({
  block,
  index,
  isPending,
  prefersReducedMotion,
  onUpdate,
  onUpdateStyle,
  onToggleVisibility,
  onRemove,
}: SortableBlockCardProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    disabled: isPending,
    transition: prefersReducedMotion
      ? null
      : EMAIL_BUILDER_SORTABLE_TRANSITION,
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: isDragging ? "transform" : undefined,
  } satisfies CSSProperties;

  const meta = EMAIL_BUILDER_BLOCK_META[block.type];
  const Icon = BLOCK_ICONS[block.type] ?? Type;
  const hidden = block.visible === false;
  const deletable = isDeletableBlockType(block.type);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const ctaTextareaRef = useRef<HTMLInputElement | null>(null);

  const dragHandleLabel = meta.label
    ? `Reorder ${meta.label} block ${index + 1}`
    : `Reorder block ${index + 1}`;

  const contentValue = block.content ?? "";
  const maxLength = meta.contentMaxLength || 400;

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className={cn(
        "soft-panel overflow-hidden shadow-none",
        isDragging && "relative z-10 shadow-lg ring-2 ring-primary/20",
        hidden && "opacity-70",
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/85 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {meta.label}
                {hidden ? (
                  <span className="meta-label ml-2 rounded-full bg-muted px-2 py-0.5">
                    Hidden
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {meta.description}
              </p>
            </div>
          </div>

          <div className="dashboard-actions flex shrink-0 items-center gap-1.5">
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
              <GripVertical aria-hidden="true" />
            </Button>
            <Button
              aria-label={hidden ? `Show ${meta.label} block` : `Hide ${meta.label} block`}
              aria-pressed={hidden}
              disabled={isPending || block.type === "cta"}
              onClick={() => onToggleVisibility(block.id)}
              size="icon-sm"
              title={block.type === "cta" ? "The CTA block must stay visible" : undefined}
              type="button"
              variant="outline"
            >
              {hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
            {deletable ? (
              <Button
                aria-label={`Delete ${meta.label} block`}
                disabled={isPending}
                onClick={() => onRemove(block.id)}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className={cn(hidden && "pointer-events-none opacity-60")}>
          {block.type === "greeting" ||
          block.type === "intro" ||
          block.type === "text" ||
          block.type === "closing" ? (
            <div className="grid gap-4">
              <Field>
                <FieldLabel htmlFor={`email-block-content-${block.id}`}>
                  {block.type === "text" ? "Paragraph text" : `${meta.label} text`}
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    ref={textareaRef}
                    disabled={isPending}
                    id={`email-block-content-${block.id}`}
                    maxLength={maxLength}
                    onChange={(event) =>
                      onUpdate(block.id, { content: event.currentTarget.value })
                    }
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    placeholder={
                      block.type === "text"
                        ? "Thanks for reaching out, {{customerName}}."
                        : undefined
                    }
                    rows={block.type === "greeting" ? 2 : 3}
                    value={contentValue}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Insert:</span>
                    {quoteEmailMergeTags.map((tag) => (
                      <Button
                        key={tag.tag}
                        disabled={isPending}
                        onClick={() =>
                          insertTagAtCursor(
                            textareaRef.current,
                            contentValue,
                            tag.tag,
                            (next) => onUpdate(block.id, { content: next }),
                          )
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                      >
                        {tag.label}
                      </Button>
                    ))}
                  </div>
                </FieldContent>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <StyleSelect
                  id={`email-block-align-${block.id}`}
                  label="Alignment"
                  value={block.style?.align}
                  placeholder="Left"
                  disabled={isPending}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                  ]}
                  onChange={(next) => onUpdateStyle(block.id, "align", next)}
                />
                <StyleSelect
                  id={`email-block-size-${block.id}`}
                  label="Size"
                  value={block.style?.fontSize}
                  placeholder="Medium"
                  disabled={isPending}
                  options={[
                    { value: "sm", label: "Small" },
                    { value: "md", label: "Medium" },
                    { value: "lg", label: "Large" },
                  ]}
                  onChange={(next) => onUpdateStyle(block.id, "fontSize", next)}
                />
                <StyleSelect
                  id={`email-block-color-${block.id}`}
                  label="Text color"
                  value={
                    block.style?.textColor === "default" ||
                    block.style?.textColor === "muted"
                      ? block.style.textColor
                      : undefined
                  }
                  placeholder="Default"
                  disabled={isPending}
                  options={[
                    { value: "default", label: "Default" },
                    { value: "muted", label: "Muted" },
                  ]}
                  onChange={(next) => onUpdateStyle(block.id, "textColor", next)}
                />
                <StyleSelect
                  id={`email-block-spacing-${block.id}`}
                  label="Spacing"
                  value={block.style?.spacing}
                  placeholder="Comfortable"
                  disabled={isPending}
                  options={[
                    { value: "compact", label: "Compact" },
                    { value: "comfortable", label: "Comfortable" },
                    { value: "spacious", label: "Spacious" },
                  ]}
                  onChange={(next) =>
                    onUpdateStyle(block.id, "spacing", next as BlockSpacing)
                  }
                />
              </div>
            </div>
          ) : null}

          {block.type === "cta" ? (
            <div className="grid gap-4">
              <Field>
                <FieldLabel htmlFor={`email-block-cta-${block.id}`}>
                  Button label
                </FieldLabel>
                <FieldContent>
                  <Input
                    ref={ctaTextareaRef}
                    disabled={isPending}
                    id={`email-block-cta-${block.id}`}
                    maxLength={60}
                    onChange={(event) =>
                      onUpdate(block.id, { content: event.currentTarget.value })
                    }
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    placeholder="Review quote online"
                    value={contentValue}
                  />
                </FieldContent>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <StyleSelect
                  id={`email-block-cta-align-${block.id}`}
                  label="Alignment"
                  value={block.style?.align}
                  placeholder="Left"
                  disabled={isPending}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                  ]}
                  onChange={(next) => onUpdateStyle(block.id, "align", next)}
                />
                <StyleSelect
                  id={`email-block-cta-spacing-${block.id}`}
                  label="Spacing"
                  value={block.style?.spacing}
                  placeholder="Comfortable"
                  disabled={isPending}
                  options={[
                    { value: "compact", label: "Compact" },
                    { value: "comfortable", label: "Comfortable" },
                    { value: "spacious", label: "Spacious" },
                  ]}
                  onChange={(next) =>
                    onUpdateStyle(block.id, "spacing", next as BlockSpacing)
                  }
                />
                <Field>
                  <FieldLabel htmlFor={`email-block-cta-bg-${block.id}`}>
                    Button color
                  </FieldLabel>
                  <FieldContent>
                    <div className="flex items-center gap-2">
                      <input
                        aria-label="Pick button color"
                        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-background"
                        disabled={isPending}
                        id={`email-block-cta-bg-${block.id}`}
                        onChange={(event) =>
                          onUpdateStyle(block.id, "buttonColor", event.currentTarget.value)
                        }
                        onPointerDownCapture={(event) => event.stopPropagation()}
                        type="color"
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(block.style?.buttonColor ?? "")
                            ? block.style?.buttonColor
                            : "#008060"
                        }
                      />
                      <Input
                        aria-label="Button color hex"
                        disabled={isPending}
                        maxLength={7}
                        onChange={(event) => {
                          const next = event.currentTarget.value.trim();
                          if (!next || /^#[0-9a-fA-F]{0,6}$/.test(next)) {
                            onUpdateStyle(
                              block.id,
                              "buttonColor",
                              next.length === 7 ? next : undefined,
                            );
                          }
                        }}
                        onPointerDownCapture={(event) => event.stopPropagation()}
                        placeholder="#008060"
                        value={block.style?.buttonColor ?? ""}
                      />
                    </div>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`email-block-cta-text-${block.id}`}>
                    Button text color
                  </FieldLabel>
                  <FieldContent>
                    <div className="flex items-center gap-2">
                      <input
                        aria-label="Pick button text color"
                        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-background"
                        disabled={isPending}
                        id={`email-block-cta-text-${block.id}`}
                        onChange={(event) =>
                          onUpdateStyle(block.id, "buttonTextColor", event.currentTarget.value)
                        }
                        onPointerDownCapture={(event) => event.stopPropagation()}
                        type="color"
                        value={
                          /^#[0-9a-fA-F]{6}$/.test(block.style?.buttonTextColor ?? "")
                            ? block.style?.buttonTextColor
                            : "#f4fffb"
                        }
                      />
                      <Input
                        aria-label="Button text color hex"
                        disabled={isPending}
                        maxLength={7}
                        onChange={(event) => {
                          const next = event.currentTarget.value.trim();
                          if (!next || /^#[0-9a-fA-F]{0,6}$/.test(next)) {
                            onUpdateStyle(
                              block.id,
                              "buttonTextColor",
                              next.length === 7 ? next : undefined,
                            );
                          }
                        }}
                        onPointerDownCapture={(event) => event.stopPropagation()}
                        placeholder="#f4fffb"
                        value={block.style?.buttonTextColor ?? ""}
                      />
                    </div>
                  </FieldContent>
                </Field>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlignCenter className="size-3.5" aria-hidden="true" />
                <AlignLeft className="size-3.5" aria-hidden="true" />
                <AlignRight className="size-3.5" aria-hidden="true" />
                One CTA per template. It moves and restyles, but stays visible.
              </p>
            </div>
          ) : null}

          {block.type === "summary" ||
          block.type === "line-items" ||
          block.type === "totals" ||
          block.type === "notes" ||
          block.type === "signature" ? (
            <div className="grid gap-4">
              <p className="text-xs leading-5 text-muted-foreground">
                Content comes from the quote
                {block.type === "signature" ? " (business signature)" : ""}
                {block.type === "notes" ? " (quote notes)" : ""}. Toggle
                visibility or adjust spacing.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <StyleSelect
                  id={`email-block-data-spacing-${block.id}`}
                  label="Spacing"
                  value={block.style?.spacing}
                  placeholder="Comfortable"
                  disabled={isPending}
                  options={[
                    { value: "compact", label: "Compact" },
                    { value: "comfortable", label: "Comfortable" },
                    { value: "spacious", label: "Spacious" },
                  ]}
                  onChange={(next) =>
                    onUpdateStyle(block.id, "spacing", next as BlockSpacing)
                  }
                />
              </div>
            </div>
          ) : null}

          {block.type === "divider" || block.type === "spacer" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <StyleSelect
                id={`email-block-deco-spacing-${block.id}`}
                label="Spacing"
                value={block.style?.spacing}
                placeholder="Comfortable"
                disabled={isPending}
                options={[
                  { value: "compact", label: "Compact" },
                  { value: "comfortable", label: "Comfortable" },
                  { value: "spacious", label: "Spacious" },
                ]}
                onChange={(next) =>
                  onUpdateStyle(block.id, "spacing", next as BlockSpacing)
                }
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
