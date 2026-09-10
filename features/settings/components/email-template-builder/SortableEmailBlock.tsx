"use client";

import { type CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EmailTemplateBlock } from "@/features/settings/email-templates";
import { cn } from "@/lib/utils";

import { BlockContent } from "./BlockContent";
import { BlockControls } from "./BlockControls";
import { BlockEditor } from "./BlockEditor";
import {
  EMAIL_BUILDER_BLOCK_META,
  isDeletableBlockType,
} from "./builder-types";

export const EMAIL_CANVAS_SORTABLE_TRANSITION = {
  duration: 160,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
} as const;

const EDITABLE_TYPES: ReadonlySet<EmailTemplateBlock["type"]> = new Set([
  "greeting",
  "intro",
  "text",
  "closing",
  "cta",
]);

type SortableEmailBlockProps = {
  block: EmailTemplateBlock;
  index: number;
  selected: boolean;
  editing: boolean;
  isPending?: boolean;
  prefersReducedMotion?: boolean;
  onSelect: (id: string | null) => void;
  onEdit: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<EmailTemplateBlock>) => void;
  onUpdateStyle: (
    id: string,
    key: keyof NonNullable<EmailTemplateBlock["style"]>,
    value: string | undefined,
  ) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
};

/**
 * A visual document block inside the email canvas. Default state is a clean
 * email appearance; hover reveals the drag handle + visibility toggle;
 * selection reveals compact style controls; click on text-like content
 * switches to plain-text editing (no rich text).
 */
export function SortableEmailBlock({
  block,
  index,
  selected,
  editing,
  isPending,
  prefersReducedMotion,
  onSelect,
  onEdit,
  onUpdate,
  onUpdateStyle,
  onToggleVisibility,
  onRemove,
}: SortableEmailBlockProps) {
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
      : EMAIL_CANVAS_SORTABLE_TRANSITION,
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: isDragging ? "transform" : undefined,
  } satisfies CSSProperties;

  const meta = EMAIL_BUILDER_BLOCK_META[block.type];
  const hidden = block.visible === false;
  const deletable = isDeletableBlockType(block.type);
  const editable = EDITABLE_TYPES.has(block.type);
  const dragHandleLabel = meta.label
    ? `Reorder ${meta.label} block ${index + 1}`
    : `Reorder block ${index + 1}`;

  function handleContentClick() {
    if (isPending) return;
    onSelect(block.id);
    if (editable && !editing) {
      onEdit(block.id);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className={cn(
        "group relative rounded-lg px-2 py-1 transition-[box-shadow,background-color,opacity]",
        "hover:bg-muted/40 hover:shadow-[inset_0_0_0_1px_var(--border)]",
        selected && "bg-muted/40 shadow-[inset_0_0_0_2px_var(--primary)]",
        isDragging && "relative z-10 bg-background shadow-lg ring-2 ring-primary/20",
        hidden && "opacity-70",
      )}
      data-block-id={block.id}
      data-block-type={block.type}
      onClick={(event) => {
        event.stopPropagation();
        if (!selected) onSelect(block.id);
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute -left-1 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity",
          "group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
          selected && "pointer-events-auto opacity-100",
        )}
      >
        <Button
          aria-label={dragHandleLabel}
          className="cursor-grab touch-none bg-background shadow-sm active:cursor-grabbing"
          disabled={isPending}
          ref={setActivatorNodeRef}
          size="icon-xs"
          type="button"
          variant="outline"
          {...attributes}
          {...listeners}
          onClick={(event) => event.stopPropagation()}
          onPointerDownCapture={(event) => event.stopPropagation()}
        >
          <GripVertical aria-hidden="true" />
        </Button>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute -right-1 top-1 flex items-center gap-1 opacity-0 transition-opacity",
          "group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
          selected && "pointer-events-auto opacity-100",
        )}
      >
        <Button
          aria-label={hidden ? `Show ${meta.label} block` : `Hide ${meta.label} block`}
          aria-pressed={hidden}
          className="bg-background shadow-sm"
          disabled={isPending || block.type === "cta"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleVisibility(block.id);
          }}
          onPointerDownCapture={(event) => event.stopPropagation()}
          size="icon-xs"
          title={block.type === "cta" ? "The CTA block must stay visible" : undefined}
          type="button"
          variant="outline"
        >
          {hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
        {deletable ? (
          <Button
            aria-label={`Delete ${meta.label} block`}
            className="bg-background shadow-sm"
            disabled={isPending}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(block.id);
            }}
            onPointerDownCapture={(event) => event.stopPropagation()}
            size="icon-xs"
            type="button"
            variant="outline"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <div className={cn(hidden && "opacity-60")}>
        {hidden ? (
          <p className="meta-label mb-1 rounded-full bg-muted px-2 py-0.5">
            Hidden from email
          </p>
        ) : null}
        {editing && editable && !isPending ? (
          <div onClick={(event) => event.stopPropagation()}>
            <BlockEditor
              block={block}
              disabled={isPending}
              onDone={() => onEdit(null)}
              onUpdate={onUpdate}
            />
          </div>
        ) : (
          <div
            onClick={handleContentClick}
            onKeyDown={(event) => {
              if (editable && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                handleContentClick();
              }
            }}
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-label={editable ? `Edit ${meta.label} block` : `${meta.label} block`}
            className={editable ? "cursor-text rounded-md" : undefined}
          >
            <BlockContent block={block} />
          </div>
        )}
        {selected ? (
          <div onClick={(event) => event.stopPropagation()}>
            <BlockControls
              block={block}
              disabled={isPending}
              onUpdateStyle={onUpdateStyle}
            />
            {block.type === "cta" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                One CTA per template. It moves and restyles, but stays visible.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
